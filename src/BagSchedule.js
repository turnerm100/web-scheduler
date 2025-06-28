import React, { useEffect, useState, useRef, useMemo } from 'react';
import { db } from './firebase';
import { getAuth } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import AddPatient from './AddPatient';
import './BagSchedule.css';

import {
  getBagDurations,
  getBagDetails,
  getLastBagDate,
  parseLocalDate,
  formatDate,
  isTomorrow,
  isTodayAndDifferentFromPrevious
} from './utils/generateBagSchedule';
import { shouldHighlightRow } from './utils/highlighting';
import { useBagSettings } from './contexts/BagSettingsContext';
import { logAuditEvent } from './utils/logAuditEvent';

export default function BagSchedule() {
  const [searchQuery, setSearchQuery] = useState('');
  const rowRefs = useRef({});
  const [savedPatients, setSavedPatients] = useState([]);
  const [displayPatients, setDisplayPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [overrideEdits, setOverrideEdits] = useState({});
  const [bagTimeEdits, setBagTimeEdits] = useState({});
  const [rnVisitNeededEdits, setRnVisitNeededEdits] = useState({});
  const [sortOption, setSortOption] = useState('');
  const [pharmTeamFilter, setPharmTeamFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Bag admin settings
  const { enable5DayBags, enable6DayBags, loading: bagSettingsLoading } = useBagSettings();

  // Memoized unique pharmacy teams for filter dropdown
  const pharmacyTeams = useMemo(() => {
    const teams = new Set();
    savedPatients.forEach(p => {
      if (p.pharmTeam && p.pharmTeam.trim()) teams.add(p.pharmTeam.trim());
    });
    return Array.from(teams).sort();
  }, [savedPatients]);

  // Patient data subscription (db snapshot)
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, 'patients'), snapshot => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(patient => {
          const status = (patient.status || '').toLowerCase();
          const ourStart = new Date(patient.ourStartDate);
          const hospStart = new Date(patient.hospStartDate);
          const cycleDays = parseInt(patient.daysInCycle);
          const hasSchedule = (
            patient.ourStartDate &&
            patient.hospStartDate &&
            !isNaN(cycleDays) &&
            cycleDays > 0 &&
            hospStart.toString() !== 'Invalid Date' &&
            ourStart.toString() !== 'Invalid Date' &&
            (cycleDays - Math.floor((ourStart - hospStart) / (1000 * 60 * 60 * 24))) > 0
          );
          return (
            status !== 'discharged' &&
            status !== 'on hold' &&
            hasSchedule
          );
        });

      setSavedPatients(data);

      // Load override/time/rnVisit states for editing
      const overrides = {};
      const times = {};
      const rnVisits = {};
      data.forEach(patient => {
        if (patient.bagOverrides) overrides[patient.id] = patient.bagOverrides;
        if (patient.bagTimes?.bags) {
          times[patient.id] = {
            ...Object.fromEntries(patient.bagTimes.bags.map((t, i) => [i, t])),
            disconnect: patient.bagTimes.disconnect ?? ''
          };
        }
        if (patient.rnVisits) rnVisits[patient.id] = patient.rnVisits;
      });

      setOverrideEdits(overrides);
      setBagTimeEdits(times);
      setRnVisitNeededEdits(rnVisits);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Manual refresh (used in save)
  const refreshSavedPatients = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'patients'));
    const updatedData = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(patient => {
        const status = (patient.status || '').toLowerCase();
        const ourStart = new Date(patient.ourStartDate);
        const hospStart = new Date(patient.hospStartDate);
        const cycleDays = parseInt(patient.daysInCycle);
        const hasSchedule = (
          patient.ourStartDate &&
          patient.hospStartDate &&
          !isNaN(cycleDays) &&
          cycleDays > 0 &&
          hospStart.toString() !== 'Invalid Date' &&
          ourStart.toString() !== 'Invalid Date' &&
          (cycleDays - Math.floor((ourStart - hospStart) / (1000 * 60 * 60 * 24))) > 0
        );
        return (
          status !== 'discharged' &&
          status !== 'on hold' &&
          hasSchedule
        );
      });

    const overrides = {};
    const times = {};
    const rnVisits = {};
    updatedData.forEach(patient => {
      if (patient.bagOverrides) overrides[patient.id] = patient.bagOverrides;
      if (patient.bagTimes?.bags) {
        times[patient.id] = {
          ...Object.fromEntries(patient.bagTimes.bags.map((t, i) => [i, t])),
          disconnect: patient.bagTimes.disconnect ?? ''
        };
      }
      if (patient.rnVisits) rnVisits[patient.id] = patient.rnVisits;
    });

    setSavedPatients(updatedData);
    setOverrideEdits(overrides);
    setBagTimeEdits(times);
    setRnVisitNeededEdits(rnVisits);
    setLoading(false);
  };

  // Input handlers
  const handleOverrideChange = (patientId, index, value) => {
    setOverrideEdits(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [index]: value === '' ? undefined : parseInt(value)
      }
    }));
  };

  const handleTimeChange = (patientId, index, value) => {
    setBagTimeEdits(prev => ({
      ...prev,
      [patientId]: {
        ...prev[patientId],
        [index]: value
      }
    }));
  };

  const handleRnVisitNeededChange = (patientId, index, checked) => {
    setRnVisitNeededEdits(prev => {
      const arr = Array.isArray(prev[patientId]) ? [...prev[patientId]] : [];
      arr[index] = !!checked;
      return { ...prev, [patientId]: arr };
    });
  };

  // Save Logic (firestore + local refresh)
  const handleSaveOverrides = async (patientId) => {
    try {
      const overrides = overrideEdits[patientId] || {};
      const times = bagTimeEdits[patientId] || {};
      const rnVisits = rnVisitNeededEdits[patientId] || [];
      const bagOverrides = Array.from({ length: 28 }, (_, i) => overrides[i] ?? null);
      const bagTimes = {
        bags: Array.from({ length: 28 }, (_, i) => times[i] ?? ''),
        disconnect: times['disconnect'] ?? ''
      };
      const rnVisitsArr = Array.from({ length: 28 }, (_, i) => !!rnVisits[i]);
      await updateDoc(doc(db, 'patients', patientId), { bagOverrides, bagTimes, rnVisits: rnVisitsArr });
      await refreshSavedPatients();

      const user = getAuth().currentUser;
      await logAuditEvent(
        user,
        'WRITE',
        'Schedule',
        patientId,
        'Updated bag schedule, override, or RN visit info'
      );
      alert('Overrides, times, and RN visit info saved!');
    } catch (err) {
      alert('Error saving overrides/times.');
      console.error(err);
    }
  };

  const handleSaveThenPrint = async (patientId) => {
    try {
      const overrides = overrideEdits[patientId] || {};
      const times = bagTimeEdits[patientId] || {};
      const rnVisits = rnVisitNeededEdits[patientId] || [];
      const bagOverrides = Array.from({ length: 28 }, (_, i) => overrides[i] ?? null);
      const bagTimes = {
        bags: Array.from({ length: 28 }, (_, i) => times[i] ?? ''),
        disconnect: times['disconnect'] ?? ''
      };
      const rnVisitsArr = Array.from({ length: 28 }, (_, i) => !!rnVisits[i]);
      await updateDoc(doc(db, 'patients', patientId), { bagOverrides, bagTimes, rnVisits: rnVisitsArr });

      const user = getAuth().currentUser;
      await logAuditEvent(
        user,
        'WRITE',
        'Schedule',
        patientId,
        'Updated bag schedule, override, or RN visit info'
      );
      await refreshSavedPatients();
      window.location.href = `#/print-schedule/${patientId}`;
    } catch (error) {
      alert('Could not save changes before printing. Please try again.');
      console.error(error);
    }
  };

  // --- FILTER & SORT: ONLY ON SAVED DATA ---
  useEffect(() => {
    let filtered = savedPatients;

    if (pharmTeamFilter) {
      filtered = filtered.filter(
        p => (p.pharmTeam || '').toLowerCase() === pharmTeamFilter.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        p => (p.name || '').toLowerCase().includes(q)
      );
    }
    if (sortOption) {
      filtered = [...filtered].sort((a, b) => {
        if (sortOption === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        } else if (sortOption === 'blincytoStart') {
          return parseLocalDate(a.hospStartDate) - parseLocalDate(b.hospStartDate);
        } else if (sortOption === 'pipsStart') {
          return parseLocalDate(a.ourStartDate) - parseLocalDate(b.ourStartDate);
        } else if (sortOption === 'cycleDays') {
          return (parseInt(a.daysInCycle) || 0) - (parseInt(b.daysInCycle) || 0);
        } else if (sortOption === 'disconnectDate') {
          const aLast = getLastBagDate(a, overrideEdits, enable5DayBags, enable6DayBags);
          const bLast = getLastBagDate(b, overrideEdits, enable5DayBags, enable6DayBags);
          return aLast - bLast;
        } else if (sortOption === 'pinkHighlight') {
          // Highlight row logic: sorts pink rows up
          const getBagDataForPatient = (patient) => {
            const totalDays = parseInt(patient.daysInCycle, 10);
            const hospitalDate = parseLocalDate(patient.hospStartDate);
            const ourDate = parseLocalDate(patient.ourStartDate);
            let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
            daysPassed = daysPassed < 0 ? 0 : daysPassed;
            const remaining = totalDays - daysPassed;
            const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
            const schedule = getBagDurations(
              remaining,
              overrides,
              patient.isPreservativeFree || false,
              enable5DayBags,
              enable6DayBags
            );

            const bagData = [];
            let current = new Date(ourDate);
            schedule.forEach((days) => {
              const start = new Date(current);
              const end = new Date(start);
              end.setDate(start.getDate() + days);
              bagData.push({
                durationDays: days,
                startDateObj: start,
                endDateObj: end
              });
              current = new Date(end);
            });
            return bagData;
          };

          const aBags = getBagDataForPatient(a);
          const bBags = getBagDataForPatient(b);

          const aIsPink = shouldHighlightRow(aBags, a, rnVisitNeededEdits);
          const bIsPink = shouldHighlightRow(bBags, b, rnVisitNeededEdits);

          return (bIsPink ? 1 : 0) - (aIsPink ? 1 : 0);
        }
        return 0;
      });
    }

    setDisplayPatients(filtered);
    // *** CRITICALLY: overrideEdits/bagTimeEdits NOT IN DEP ARRAY ***
  }, [sortOption, pharmTeamFilter, searchQuery, savedPatients, enable5DayBags, enable6DayBags, rnVisitNeededEdits]);

  // Highlight/color logic for each bag
  function getBagCardHighlight(patient, bag, bagData, i, rnVisitNeededEdits) {
    const isPtCg = patient.bagChangeBy && patient.bagChangeBy.toLowerCase().includes('pt');
    const isTomorrowBag = isTomorrow(bag.startDateObj);
    const isToday = bag.startDateObj.toDateString() === new Date().toDateString();
    const isFirstBagToday = i === 0 && isToday;
    const isPumpReprogram = isTodayAndDifferentFromPrevious(bag, bagData[i - 1]);
    const rnVisitChecked = isPtCg && rnVisitNeededEdits[patient.id]?.[i];

    // Aspiration alert: shorter bag after longer, today or tomorrow
    if (i > 0 && bag.durationDays < bagData[i - 1]?.durationDays && isTomorrowBag)
      return '#FF4C4C'; // red
    if (i > 0 && bag.durationDays < bagData[i - 1]?.durationDays && isToday)
      return '#AFE19B'; // green (with aspiration alert)

    // RN visit checked
    if (rnVisitChecked && isToday) return '#AFE19B';
    if (rnVisitChecked && isTomorrowBag) return '#F6F12B';
    if (isToday && !isPtCg) return '#AFE19B';
    if (isFirstBagToday) return '#AFE19B';
    if (isPumpReprogram) return '#AFE19B';
    if (i === 0 && isTomorrowBag && !isPtCg) return '#F6F12B';
    if (isTomorrowBag && !isPtCg) return '#F6F12B';

    // Pt/CG doing bags, no RN needed, leave unhighlighted
    return isPtCg ? 'transparent' : 'transparent';
  }

  // Spinner for patient loading
  if (loading) {
    return (
      <div style={{
        width: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="loader"></div>
        <span style={{ marginLeft: '18px', fontSize: '18px' }}>Loading schedules...</span>
      </div>
    );
  }

  // Spinner for bag settings loading
  if (bagSettingsLoading) {
    return (
      <div style={{
        width: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="loader"></div>
        <span style={{ marginLeft: '18px', fontSize: '18px' }}>Loading bag settings…</span>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Blincyto Bag Change Schedule</h2>
      <p style={{ color: "#555" }}>
        (Bag options are based on current pharmacy protocol. 5-day and 6-day bags are only available if enabled by an admin.)
      </p>

      {/* FILTERS: Sort, Pharmacy Team, Search */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold' }}>Sort by:</label>
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minWidth: '220px'
            }}
          >
            <option value="">-- Select --</option>
            <option value="pinkHighlight">Task Alerts</option>
            <option value="name">Patient Name (A–Z)</option>
            <option value="blincytoStart">Blincyto Start Date</option>
            <option value="pipsStart">PIPS Start Date</option>
            <option value="cycleDays">Cycle Days</option>
            <option value="disconnectDate">Disconnect Date</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold' }}>Pharmacy Team:</label>
          <select
            value={pharmTeamFilter}
            onChange={e => setPharmTeamFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minWidth: '150px'
            }}
          >
            <option value="">All</option>
            {pharmacyTeams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex' }}>
          <input
            type="text"
            placeholder="Search by patient name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              width: '300px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <button
            onClick={() => {
              const query = searchQuery.toLowerCase();
              const targetId = Object.keys(rowRefs.current).find(id => {
                const name = savedPatients.find(p => p.id === id)?.name || '';
                return name.toLowerCase().includes(query);
              });

              if (targetId && rowRefs.current[targetId]) {
                rowRefs.current[targetId].scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                alert('Patient not found.');
              }
            }}
            style={{
              marginLeft: '10px',
              padding: '8px 16px',
              fontSize: '16px',
              backgroundColor: '#215C98',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* PATIENTS TABLE */}
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr
            style={{
              position: 'sticky',
              top: '50px',
              backgroundColor: '#f1f1f1',
              zIndex: 2,
              borderTop: '3px solid #333',
              borderBottom: '3px solid #333',
              borderLeft: '3px solid #333',
              borderRight: '3px solid #333'
            }}
          >
            <th style={{ borderLeft: '3px solid #333', borderRight: '3px solid #333' }}>Patient Info:</th>
<th style={{ borderLeft: '3px solid #333', borderRight: '3px solid #333', maxWidth: '180px', width: '120px' }}>
  Blincyto Cycle Info:
</th>
            <th style={{ borderLeft: '3px solid #333', borderRight: '3px solid #333' }}>Blincyto Bag Info:</th>
            <th style={{ borderLeft: '3px solid #333', borderRight: '3px solid #333' }}>Disconnect Date:</th>
            <th style={{ borderLeft: '3px solid #333', borderRight: '3px solid #333', maxWidth: '160px', width: '100px' }}>Actions:</th>
          </tr>
        </thead>
        <tbody>
{displayPatients.map(patient => {
  const totalDays = parseInt(patient.daysInCycle, 10);
  const hospitalDate = parseLocalDate(patient.hospStartDate);
  const ourDate = parseLocalDate(patient.ourStartDate);
  let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
  daysPassed = daysPassed < 0 ? 0 : daysPassed;
  const remainingDays = totalDays - daysPassed;

  const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
  const times = bagTimeEdits[patient.id] || {};
  const rnVisits = rnVisitNeededEdits[patient.id] || [];

  // --- CRITICAL: USE getBagDurations TO GENERATE SCHEDULE WITH OVERRIDES ---
  const schedule = getBagDurations(
    remainingDays,
    overrides,
    patient.isPreservativeFree || false,
    enable5DayBags,
    enable6DayBags
  );

  const bagData = [];
  let current = new Date(ourDate);

  schedule.forEach((days, i) => {
    const startDateObj = new Date(current);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + days);

    bagData.push({
      label: `Bag ${i + 1}`,
      duration: `${days} days`,
      durationDays: days,
      startDate: formatDate(startDateObj),
      endDate: formatDate(endDateObj),
      startDateObj,
      endDateObj
    });

    current = new Date(endDateObj);
  });

  // === ROW HIGHLIGHTING LOGIC (Insert this block) ===
  const lastBag = bagData[bagData.length - 1];
  const disconnectDate = lastBag ? lastBag.endDate : '';
  const disconnectDateObj = lastBag ? lastBag.endDateObj : null;
  const isDisconnectToday = disconnectDate === formatDate(new Date());
  const isDisconnectTomorrow = disconnectDateObj && isTomorrow(disconnectDateObj);

  let disconnectCellBg = 'transparent';
  if (isDisconnectToday) disconnectCellBg = '#AFE19B';
  else if (isDisconnectTomorrow) disconnectCellBg = '#F6F12B';

  // This checks if any bag or disconnect cell has a non-transparent highlight
  const rowNeedsAlert =
    bagData.some((bag, i) =>
      getBagCardHighlight(patient, bag, bagData, i, rnVisitNeededEdits) !== 'transparent'
    ) ||
    disconnectCellBg !== 'transparent';

  const rowHighlight = rowNeedsAlert ? '#FFE5EC' : 'transparent';

  // --- CRITICAL: ONLY INCLUDE 5/6 IN OVERRIDE OPTIONS IF ADMIN ENABLED ---
  let allowedBagOptions = [1, 2, 3, 4, 7];
  if (enable5DayBags) allowedBagOptions.splice(4, 0, 5); // after 4
  if (enable6DayBags) allowedBagOptions.push(6);
  allowedBagOptions = allowedBagOptions.sort((a, b) => a - b);

  // ...now continue to render your row, for example:
  return (
    <tr
      key={patient.id}
      ref={el => (rowRefs.current[patient.id] = el)}
      style={{
        backgroundColor: rowHighlight,
        borderBottom: '3px solid #333'
      }}
    >
                <td style={{ borderLeft: '3px solid #333' }}>
                  <button
                    className="rounded-link-button"
                    onClick={() => setSelectedPatient(patient)}
                    style={{ padding: '4px', lineHeight: 1.2 }}
                  >
                    {(() => {
                      const [last, first] = patient.name?.split(',').map(s => s.trim()) || [patient.name, ''];
                      const dob = patient.dob ? `DOB: ${new Date(patient.dob).toLocaleDateString('en-US')}` : 'DOB: N/A';
                      const mrn = patient.mrn ? `MRN#: ${patient.mrn}` : 'MRN#: N/A';

                      return (
                        <div style={{ fontSize: '14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{last},</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{first}</div>
                          <div style={{ marginTop: '4px', fontSize: '12px', color: '#333' }}>{dob}</div>
                          <div style={{ fontSize: '12px', color: '#333' }}>{mrn}</div>
                          {patient.pharmTeam && (
                            <div style={{ fontSize: '12px', color: '#333' }}>
                              Pharm Team: {patient.pharmTeam}
                            </div>
                          )}
                          {patient.nurseTeam && (
                            <div style={{ fontSize: '12px', color: '#333' }}>
                              RN Team: {patient.nurseTeam}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </button>
                </td>
<td>
  <div style={{ fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
    <strong>Blincyto Start Date:</strong>
    <div>{formatDate(hospitalDate)}</div>
    <strong>PIPS Start Date:</strong>
    <div>{formatDate(ourDate)}</div>
    <strong>Cycle Days:</strong>
    <div>{patient.daysInCycle}</div>
  </div>
</td>

                <td>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {bagData.map((bag, i) => {
                      const { volume, rate } = getBagDetails(bag.durationDays);
                      const highlight = getBagCardHighlight(patient, bag, bagData, i, rnVisitNeededEdits);
                      const isPtCg = patient.bagChangeBy && patient.bagChangeBy.toLowerCase().includes('pt');

                      // Aspiration alert for shorter bag after longer
                      let bagAlert = null;
                      if (i > 0 && bag.durationDays < bagData[i - 1]?.durationDays && isTomorrow(bag.startDateObj)) {
                        bagAlert = "RN visit and line aspiration required for tomorrow's bag change. Call pt/cg for time remaining on pump and log bag change time below.";
                      } else if (i > 0 && bag.durationDays < bagData[i - 1]?.durationDays && bag.startDateObj.toDateString() === new Date().toDateString()) {
                        bagAlert = "Confirm RN aware that aspiration of line is required when doing pump reprogram and bag change.";
                      } else if (isPtCg && rnVisits[i]) {
                        bagAlert = "RN visit needed for bag change (per Pt/CG plan).";
                      } else if (isPtCg) {
                        bagAlert = "Pt/CG doing bag changes.";
                      }

                      // --- CRITICAL: ONLY ALLOW 1-DAY FOR PRESERVATIVE-FREE ---
                      const dropdownOptions = patient.isPreservativeFree ? [1] : allowedBagOptions;

                      return (
                        <div
                          key={i}
                          style={{
                            border: '1px solid #ccc',
                            padding: '4px',
                            borderRadius: '4px',
                            width: '140px',
                            backgroundColor: highlight,
                            fontSize: '11px',
                            lineHeight: 1.2
                          }}
                        >
                          <strong>{bag.label}</strong><br />
                          {bag.duration}<br />
                          Start: {bag.startDate}<br />
                          Volume: {volume}<br />
                          Rate: {rate}<br />
                          {bagAlert && (
                            <div
                              style={{
                  color:
  bagAlert === "RN visit and line aspiration required for tomorrow's bag change. Call pt/cg for time remaining on pump and log bag change time below."
    ? 'black'
    : bagAlert?.includes('aspiration')
      ? 'red'
      : (bagAlert === "Pt/CG doing bag changes." ? '#0070C0' : 'black'),

                                fontWeight: 'bold',
                                marginTop: '5px'
                              }}
                            >
                              {bagAlert}
                            </div>
                          )}
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                              Bag Duration Override
                            </div>
                            <select
                              value={overrides[i] ?? ''}
                              onChange={e => handleOverrideChange(patient.id, i, e.target.value)}
                              style={{ width: '100%', marginBottom: '10px' }}
                            >
                              <option value="">Auto</option>
                              {dropdownOptions.map(day => (
                                <option key={day} value={day}>{day} day</option>
                              ))}
                            </select>
                            {patient.isPreservativeFree && (
                              <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                                Only 1-day overrides allowed (preservative-free).
                              </div>
                            )}
                            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                              Bag change due at:
                            </div>
                            <input
                              type="time"
                              value={times[i] ?? ''}
                              onChange={e => handleTimeChange(patient.id, i, e.target.value)}
                              style={{ width: '100%' }}
                            />
                            {isPtCg && (
                              <div style={{ marginTop: '5px' }}>
                                <label style={{ fontSize: '11px' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!rnVisits[i]}
                                    onChange={e => handleRnVisitNeededChange(patient.id, i, e.target.checked)}
                                    style={{ marginRight: '4px' }}
                                  />
                                  RN visit needed for this bag
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td style={{ backgroundColor: disconnectCellBg, width: '120px' }}>
                  <div style={{ width: '100%' }}>
                    <div>Cycle Completion Date:</div>
                    <div>{disconnectDate}</div>
                    <input
                      type="time"
                      value={times['disconnect'] ?? ''}
                      onChange={e => handleTimeChange(patient.id, 'disconnect', e.target.value)}
                      style={{ width: '100%' }}
                    />
                    {disconnectCellBg === '#F6F12B' && (
                      <div style={{
                        marginTop: '6px',
                        fontWeight: 'bold',
                        color: '#000000',
                        fontSize: '11px',
                        lineHeight: 1.3
                      }}>
                        Call pt/cg to determine remaining time on infusions. Calculate and log disconnect time.
                      </div>
                    )}
                    {disconnectCellBg === '#AFE19B' && (
                      <div style={{
                        marginTop: '6px',
                        fontWeight: 'bold',
                        color: '#000000',
                        fontSize: '11px',
                        lineHeight: 1.3
                      }}>
                        Please confirm RN scheduled for disconnect visit.
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ maxWidth: '240px', width: '200px', borderRight: '3px solid #333' }}>
                  <button
                    className="rounded-button"
                    style={{ marginBottom: '4px', width: '100%' }}
                    onClick={() => handleSaveOverrides(patient.id)}
                  >
                    Save Changes
                  </button>
                  <div style={{ marginBottom: '12px', fontSize: '12px', textAlign: 'center' }}>
                    Must click to save edits to bag schedules.
                  </div>
                  <button
                    className="rounded-button"
                    style={{ marginBottom: '4px', width: '100%' }}
                    onClick={() => handleSaveThenPrint(patient.id)}
                  >
                    Print Schedule
                  </button>
                  <div style={{ marginBottom: '12px', fontSize: '12px', textAlign: 'center' }}>
                    Provides a schedule of bag changes and nurse visits.
                  </div>
                  <button
                    className="rounded-button"
                    style={{ backgroundColor: '#FF4C4C', color: 'white', marginBottom: '4px', width: '100%' }}
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete the Blincyto schedule for this patient?')) {
                        try {
                          await updateDoc(doc(db, 'patients', patient.id), {
                            cycle: '',
                            daysInCycle: '',
                            pipsBagChanges: '',
                            nursingVisitPlan: '',
                            nursingVisitDay: '',
                            hospStartDate: '',
                            ourStartDate: '',
                            hookupTime: '',
                            isPreservativeFree: false,
                            bagOverrides: [],
                            bagTimes: {
                              bags: Array(28).fill(''),
                              disconnect: ''
                            },
                            rnVisits: []
                          });

                          await logAuditEvent(
                            getAuth().currentUser,
                            'DELETE',
                            'Schedule',
                            patient.id,
                            'Deleted Blincyto schedule for patient'
                          );

                          alert('Blincyto schedule deleted for this patient.');
                        } catch (error) {
                          console.error('Error clearing schedule:', error);
                          alert('Failed to delete Blincyto schedule.');
                        }
                      }
                    }}
                  >
                    Delete Schedule
                  </button>
                  <div style={{ fontSize: '12px', textAlign: 'center' }}>
                    Current Blincyto cycle information will be deleted. Patient information will be saved.
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer Disclaimer */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        fontSize: '12px',
        color: '#555',
        backgroundColor: '#f9f9f9',
        padding: '10px',
        borderTop: '1px solid #ccc',
        zIndex: 1000
      }}>
        <strong>Disclaimer:</strong> This Blincyto Tracking Tool is intended for scheduling support only. It is an aid to help build projected bag change schedules based on available data. All calculated schedules are estimates and must be reviewed and confirmed by qualified clinical staff. This tool does not replace clinical judgment, institutional protocols, or physician orders. Always confirm infusion plans with the Providence Infusion and Pharmacy Services care team before implementation.
      </div>

      {/* Edit Patient Modal */}
      {selectedPatient && (
        <div className="modal-overlay">
          <div className="modal-content">
            <AddPatient
              patient={selectedPatient}
              editData={selectedPatient}
              onClose={() => setSelectedPatient(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
