// src/BagSchedule.js
import React, { useEffect, useMemo, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import AddPatient from './AddPatient';
import './BagSchedule.css';

export default function BagSchedule() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [overrideEdits, setOverrideEdits] = useState({});
  const [bagTimeEdits, setBagTimeEdits] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'patients'), snapshot => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data);

      const overrides = {};
      const times = {};
      data.forEach(patient => {
        if (patient.bagOverrides) overrides[patient.id] = patient.bagOverrides;

        if (patient.bagTimes?.bags) {
          times[patient.id] = {
            ...Object.fromEntries(patient.bagTimes.bags.map((t, i) => [i, t])),
            disconnect: patient.bagTimes.disconnect ?? ''
          };
        }
      });

      setOverrideEdits(overrides);
      setBagTimeEdits(times);
    });

    return () => unsub();
  }, []);

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

  const handleSaveOverrides = async (patientId) => {
    const overrides = overrideEdits[patientId] || {};
    const times = bagTimeEdits[patientId] || {};

    const bagOverrides = Array.from({ length: 28 }, (_, i) => overrides[i] ?? null);
    const bagTimes = {
      bags: Array.from({ length: 28 }, (_, i) => times[i] ?? ''),
      disconnect: times['disconnect'] ?? ''
    };

    await updateDoc(doc(db, 'patients', patientId), { bagOverrides, bagTimes });
    alert('Overrides and times saved!');
  };

  const parseLocalDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric'
    });
  };

  const isTomorrow = (date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const isTodayAndDifferentFromPrevious = (currentBag, prevBag) => {
    const today = new Date();
    return (
      currentBag.startDateObj?.toDateString() === today.toDateString() &&
      prevBag &&
      currentBag.durationDays !== prevBag.durationDays
    );
  };

  const getBagDurations = (daysLeft, overrides = []) => {
    const bags = [];
    let remaining = daysLeft;
    for (let i = 0; i < 28 && remaining > 0; i++) {
      const override = parseInt(overrides[i]);
      let duration;
      if ([1, 2, 3, 4, 7].includes(override)) {
        duration = override;
      } else {
        if (remaining <= 4) duration = remaining;
        else if (remaining === 5) duration = 2;
        else if (remaining === 6) duration = 3;
        else if (remaining % 7 === 0) duration = 7;
        else {
          const mod = remaining % 7;
          duration = mod <= 4 ? mod : (mod === 5 ? 2 : 3);
        }
      }
      bags.push(duration);
      remaining -= duration;
    }
    return bags;
  };

  const getPatientHighlightRank = (patient) => {
    const totalDays = parseInt(patient.daysInCycle, 10);
    const hospitalDate = parseLocalDate(patient.hospStartDate);
    const ourDate = parseLocalDate(patient.ourStartDate);
    let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
    daysPassed = daysPassed < 0 ? 0 : daysPassed;
    const remainingDays = totalDays - daysPassed;
  
    const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
    const showPtDoingBagsAlert = patient.pipsBagChanges?.toString().toLowerCase() === 'no';
    const schedule = getBagDurations(remainingDays, overrides);
  
    let current = new Date(ourDate);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
  
    for (let i = 0; i < schedule.length; i++) {
      const startDate = new Date(current);
      const duration = schedule[i];
  
      const isToday = startDate.toDateString() === today.toDateString();
      const isTomorrow = startDate.toDateString() === tomorrow.toDateString();
      const durationChanged = i > 0 && schedule[i] !== schedule[i - 1];
  
      // RED HIGHLIGHT (tomorrow bag is shorter than previous)
      if (i > 0 && isTomorrow && schedule[i] < schedule[i - 1]) {
        return 0;
      }
  
      // GREEN HIGHLIGHTS
      if ((i === 0 && isToday) || (isToday && durationChanged)) {
        return 0;
      }
  
      // YELLOW HIGHLIGHTS (tomorrow and NOT doing bags)
      if (!showPtDoingBagsAlert) {
        if ((i === 0 && isTomorrow) || (isTomorrow && durationChanged)) {
          return 0;
        }
      }
  
      current.setDate(current.getDate() + duration);
    }
  
    // DISCONNECT HIGHLIGHT
    const disconnectDate = new Date(current);
    if (
      disconnectDate.toDateString() === today.toDateString() || // green
      disconnectDate.toDateString() === tomorrow.toDateString() // yellow
    ) {
      return 0;
    }
  
    // No visual highlights
    return 1;
  };  

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => getPatientHighlightRank(a) - getPatientHighlightRank(b));
  }, [patients, overrideEdits, getPatientHighlightRank]);  

  return (
    <div style={{ padding: 20 }}>
      <h2>Blincyto Bag Change Schedule</h2>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ position: 'sticky', top: '50px', backgroundColor: '#f1f1f1', zIndex: 2 }}>
            <th>Patient Name:</th>
            <th>Blincyto Start Date:</th>
            <th>PIPS Start Date:</th>
            <th>Cycle Days:</th>
            <th>Bag Info:</th>
            <th>Disconnect Date:</th>
            <th style={{ maxWidth: '160px', width: '100px' }}>Actions:</th>
            <th style={{ maxWidth: '160px', width: '100px' }}>Printable Bag Change Schedule:</th>
          </tr>
        </thead>
        <tbody>
          {sortedPatients.filter(p => p.hospStartDate && p.ourStartDate).map(patient => {
            const totalDays = parseInt(patient.daysInCycle, 10);
            const hospitalDate = parseLocalDate(patient.hospStartDate);
            const ourDate = parseLocalDate(patient.ourStartDate);
            let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
            daysPassed = daysPassed < 0 ? 0 : daysPassed;
            const remainingDays = totalDays - daysPassed;

            const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
            const times = bagTimeEdits[patient.id] || {};
            const schedule = getBagDurations(remainingDays, overrides);

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

            const lastBag = bagData[bagData.length - 1];
            const disconnectDate = lastBag ? lastBag.endDate : '';
            const disconnectDateObj = lastBag ? lastBag.endDateObj : null;
            const isDisconnectToday = disconnectDate === formatDate(new Date());
            const isDisconnectTomorrow = disconnectDateObj && isTomorrow(disconnectDateObj);
            const showPtDoingBagsAlert = patient.pipsBagChanges?.toString().toLowerCase() === 'no';

            let disconnectCellBg = 'transparent';
if (isDisconnectToday) disconnectCellBg = '#AFE19B'; // Updated green
else if (isDisconnectTomorrow) disconnectCellBg = '#F6F12B'; // Yellow

            return (
              <tr key={patient.id}>
                <td>
                  <button
                    className="rounded-link-button"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    {patient.name}
                  </button>
                </td>
                <td>{formatDate(hospitalDate)}</td>
                <td>{formatDate(ourDate)}</td>
                <td>{patient.daysInCycle}</td>
                <td>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {bagData.map((bag, i) => {
                      const isTomorrowBag = isTomorrow(bag.startDateObj);
                      const isToday = bag.startDateObj.toDateString() === new Date().toDateString();
                      const isTodayDiff = isTodayAndDifferentFromPrevious(bag, bagData[i - 1]);

                      let backgroundColor = 'transparent';
                      let bagAlert = null;

                      if (
                        i > 0 &&
                        bag.durationDays < bagData[i - 1].durationDays &&
                        isTomorrowBag
                      ) {
                        backgroundColor = '#FF4C4C'; // Red highlight
                        bagAlert = "Line aspiration needed before bag change. Coordinate RN visit based on time remaining on pump. ";
                      } else if (
                        i > 0 &&
                        bag.durationDays < bagData[i - 1].durationDays &&
                        isToday
                      ) {
                        backgroundColor = '#AFE19B'; // Green highlight
                        bagAlert = "Confirm RN aware that aspiration of line is required when doing pump reprogram and bag change.";
                      }                      
                       else if (i === 0 && isToday) {
                        backgroundColor = '#AFE19B';
                        bagAlert = "First bag hookup. Please enter hookup time.";
                      } else if (isTodayDiff) {
                        backgroundColor = '#AFE19B';
                        bagAlert = "Pump reprogram due today.";
                      } else if (i === 0 && isTomorrowBag && !showPtDoingBagsAlert) {
                        backgroundColor = '#F6F12B';
                        bagAlert = "Confirm hookup time w/ hospital or Patient.";
                      } else if (isTomorrowBag && !showPtDoingBagsAlert) {
                        backgroundColor = '#F6F12B';
                        bagAlert = "Call pt/cg today for remaining time on pump. Calculate and log time.";
                      }

                      if (
                        showPtDoingBagsAlert &&
                        !(i === 0 && isToday || isTodayDiff) &&
                        backgroundColor !== '#FF4C4C'
                      ) {
                        backgroundColor = 'transparent';
                        bagAlert = "Pt/CG doing bag changes.";
                      }                      

                      return (
                        <div
                          key={i}
                          style={{
                            border: '1px solid #ccc',
                            padding: '4px',
                            borderRadius: '4px',
                            width: '120px',
                            backgroundColor,
                            fontSize: '11px',
                            lineHeight: 1.2
                          }}                          
                        >
                          <strong>{bag.label}</strong><br />
                          {bag.duration}<br />
                          Start: {bag.startDate}<br />
                          {bagAlert && (
  <div
    style={{
      color: bagAlert === "Pt/CG doing bag changes." ? '#0070C0' : 'black',
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
                              onChange={(e) => handleOverrideChange(patient.id, i, e.target.value)}
                              style={{ width: '100%', marginBottom: '10px' }}
                            >
                              <option value="">Auto</option>
                              {[1, 2, 3, 4, 7].map(day => (
                                <option key={day} value={day}>{day} day</option>
                              ))}
                            </select>

                            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                              Bag change due at:
                            </div>
                            <input
                              type="time"
                              value={times[i] ?? ''}
                              onChange={(e) => handleTimeChange(patient.id, i, e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td style={{ backgroundColor: disconnectCellBg === '#E97132' ? '#F6F12B' : disconnectCellBg, width: '120px' }}>
  <div style={{ width: '100%' }}>
    <div>Cycle Completion Date:</div>
    <div>{disconnectDate}</div>
    <input
      type="time"
      value={times['disconnect'] ?? ''}
      onChange={(e) => handleTimeChange(patient.id, 'disconnect', e.target.value)}
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
    RN to be scheduled for disconnect visit.
  </div>
)}
  </div>
</td>

<td style={{ maxWidth: '160px', width: '100px' }}>
  <button
    className="rounded-button"
    style={{ width: '100%' }}
    onClick={() => handleSaveOverrides(patient.id)}
  >
    Save Changes
  </button>
</td>
                <td>
                  <button
                    className="rounded-button"
                    onClick={() => window.open(`/print-schedule/${patient.id}`, '_blank')}
                  >
                    Print Schedule
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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
  <strong>Disclaimer:</strong> This Blincyto Tracking Tool is intended for scheduling support only. It is an aid to help build projected bag change schedules based on available data. All calculated schedules are estimates and must be reviewed and confirmed by qualified clinical staff. This tool does not replace clinical judgment, institutional protocols, or physician orders. Always confirm infusion plans with the PIPS care team and Pharmacy before implementation.
</div>

{selectedPatient && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              className="rounded-button"
              style={{ float: 'right' }}
              onClick={() => setSelectedPatient(null)}
            >
              Cancel
            </button>
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
