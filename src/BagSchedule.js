// src/BagSchedule.js
import React, { useEffect, useMemo, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import AddPatient from './AddPatient';

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

    const bagOverrides = Array.from({ length: 8 }, (_, i) => overrides[i] ?? null);
    const bagTimes = {
      bags: Array.from({ length: 8 }, (_, i) => times[i] ?? ''),
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
    for (let i = 0; i < 8 && remaining > 0; i++) {
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
    const schedule = getBagDurations(remainingDays, overrides);
    const showPtDoingBagsAlert = patient.pipsBagChanges?.toString().toLowerCase() === 'no';

    let current = new Date(ourDate);
    for (let i = 0; i < schedule.length; i++) {
      const startDateObj = new Date(current);
      const duration = schedule[i];

      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const isToday = startDateObj.toDateString() === today.toDateString();
      const isTomorrow = startDateObj.toDateString() === tomorrow.toDateString();

      if (i === 0 && isToday) return 0; // First bag green
      if (i === 0 && isTomorrow && !showPtDoingBagsAlert) return 1; // First bag red/orange

      if (i > 0 && isToday && schedule[i] !== schedule[i - 1]) return 0;
      if (isTomorrow && !showPtDoingBagsAlert) return 1;

      current.setDate(current.getDate() + duration);
    }

    return 2;
  };

  const sortedPatients = useMemo(() => {
    return [...patients].sort((a, b) => getPatientHighlightRank(a) - getPatientHighlightRank(b));
  }, [patients, overrideEdits]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Blincyto Bag Change Schedule</h2>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
  <tr style={{ position: 'sticky', top: '60px', backgroundColor: '#f1f1f1', zIndex: 1 }}>
    <th style={{ width: '75px', backgroundColor: '#f1f1f1' }}>Patient Name:</th>
    <th style={{ width: '75px', backgroundColor: '#f1f1f1' }}>Blincyto Start Date:</th>
    <th style={{ width: '75px', backgroundColor: '#f1f1f1' }}>PIPS Start Date:</th>
    <th style={{ width: '25px', backgroundColor: '#f1f1f1' }}>Cycle Days:</th>
    <th style={{ backgroundColor: '#f1f1f1' }}>Bag Info:</th>
    <th style={{ backgroundColor: '#f1f1f1' }}>Disconnect Date:</th>
    <th style={{ backgroundColor: '#f1f1f1' }}>Actions:</th>
    <th style={{ width: '75px', backgroundColor: '#f1f1f1' }}>Printable Bag Change Schedule:</th>
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
            if (isDisconnectToday) disconnectCellBg = '#92D050';
            else if (isDisconnectTomorrow) disconnectCellBg = '#E97132';

            return (
              <tr key={patient.id}>
                <td style={{ maxWidth: '160px', width: '160px', whiteSpace: 'normal', wordWrap: 'break-word' }}>
  <button
    style={{ border: 'none', background: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
    onClick={() => setSelectedPatient(patient)}
  >
    {(() => {
      let first = '', last = '';
      const nameParts = patient.name.includes(',') ? patient.name.split(',') : patient.name.split(' ');
      if (nameParts.length >= 2) {
        [last, first] = patient.name.includes(',') ? [nameParts[0], nameParts[1].trim()] : [nameParts.slice(-1)[0], nameParts.slice(0, -1).join(' ')];
      } else {
        last = patient.name;
      }
      return (
        <>
         <div style={{ fontWeight: 'bold', fontSize: '22px' }}>{last}</div>
         <div style={{ fontSize: '22px' }}>{first}</div>
        </>
      );
    })()}
  </button>
</td>
<td style={{ maxWidth: '75px', width: '75px' }}>{formatDate(hospitalDate)}</td>
<td style={{ maxWidth: '75px', width: '75px' }}>{formatDate(ourDate)}</td>
<td style={{ maxWidth: '25px', width: '25px' }}>{patient.daysInCycle}</td>
                <td>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {bagData.map((bag, i) => {
                      const isTomorrowBag = isTomorrow(bag.startDateObj);
                      const isToday = bag.startDateObj.toDateString() === new Date().toDateString();
                      const isTodayDiff = isTodayAndDifferentFromPrevious(bag, bagData[i - 1]);

                      let backgroundColor = 'transparent';
                      let bagAlert = null;

                      if (i === 0 && isToday) {
                        backgroundColor = '#92D050';
                        bagAlert = "First bag hookup. Please enter hookup time.";
                      } else if (i === 0 && isTomorrowBag) {
                        backgroundColor = '#E97132';
                        bagAlert = "Confirm hookup time w/ hospital or Patient.";
                      } else if (isTodayDiff) {
                        backgroundColor = '#92D050';
                        bagAlert = "Pump reprogram due today.";
                      } else if (isTomorrowBag && !showPtDoingBagsAlert) {
                        backgroundColor = '#E97132';
                        bagAlert = "Call pt/cg today for remaining time on pump.";
                      }

                      return (
                        <div
                          key={i}
                          style={{
                            border: '2px solid #ccc',
                            padding: '8px',
                            borderRadius: '5px',
                            width: '160px',
                            backgroundColor
                          }}
                        >
                          <strong>{bag.label}</strong><br />
                          {bag.duration}<br />
                          Start: {bag.startDate}<br />
                          {bagAlert && (
                            <div style={{ color: 'black', fontWeight: 'bold', marginTop: '5px' }}>
                              {bagAlert}
                            </div>
                          )}

                          <div style={{ marginTop: '8px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Bag Duration Override</div>
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

                            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Bag change due at:</div>
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
                <td style={{
  backgroundColor: disconnectCellBg,
  fontWeight: 'bold',
  maxWidth: '150px',
  width: '150px',
  overflowWrap: 'break-word'
}}>
  <div style={{ fontSize: '14px', marginBottom: '4px' }}>Cycle Completion</div>
  <div>{disconnectDate}</div>
                  {isDisconnectTomorrow && (
                    <div style={{ color: 'black', fontWeight: 'bold', marginTop: '6px' }}>
                      <span style={{ fontSize: '12px', whiteSpace: 'pre-line' }}>
                        Call Pt/CG today to determine remaining time on the pump.
                        Calculate and log disconnect time below.
                      </span>
                    </div>
                  )}
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Disconnect time:</div>
                    <input
                      type="time"
                      value={times['disconnect'] ?? ''}
                      onChange={(e) => handleTimeChange(patient.id, 'disconnect', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </td>
                <td>
                  <button onClick={() => handleSaveOverrides(patient.id)}>Save Changes</button>
                </td>
                <td>
  <button
    onClick={() => window.open(`/print-schedule/${patient.id}`, '_blank')}
    style={{ cursor: 'pointer' }}
  >
    Print Schedule
  </button>
</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedPatient && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', overflowY: 'auto', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '40px'
        }}>
          <div style={{
            background: '#fff', padding: '20px', width: '90%', maxWidth: '800px',
            borderRadius: '8px', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <button style={{ float: 'right' }} onClick={() => setSelectedPatient(null)}>Cancel</button>
            <AddPatient patient={selectedPatient} editData={selectedPatient} onClose={() => setSelectedPatient(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
