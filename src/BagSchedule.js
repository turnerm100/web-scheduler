// src/BagSchedule.js
import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs // ✅ ← this is the missing piece
} from 'firebase/firestore';
import AddPatient from './AddPatient';
import './BagSchedule.css';

export default function BagSchedule() {
  const [savedPatients, setSavedPatients] = useState([]); // ✅ Add this
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [overrideEdits, setOverrideEdits] = useState({});
  const [bagTimeEdits, setBagTimeEdits] = useState({});

useEffect(() => {
  const unsub = onSnapshot(collection(db, 'patients'), snapshot => {
    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(patient => {
        const status = (patient.status || '').toLowerCase();
        return status !== 'discharged' && status !== 'on hold';
      });

    setSavedPatients(data);

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

  // ✅ Add this helper function right after the useEffect
  const refreshSavedPatients = async () => {
    const snapshot = await getDocs(collection(db, 'patients'));
    const updatedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSavedPatients(updatedData);
  };

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
await refreshSavedPatients(); // <-- NEW: manually fetch saved state
alert('Overrides and times saved!');
  };

  const handleSaveThenPrint = async (patientId) => {
    const overrides = overrideEdits[patientId] || {};
    const times = bagTimeEdits[patientId] || {};
  
    const bagOverrides = Array.from({ length: 28 }, (_, i) => overrides[i] ?? null);
    const bagTimes = {
      bags: Array.from({ length: 28 }, (_, i) => times[i] ?? ''),
      disconnect: times['disconnect'] ?? ''
    };
  
    try {
      await updateDoc(doc(db, 'patients', patientId), { bagOverrides, bagTimes });
      await refreshSavedPatients(); // <-- ensures savedPatients is current
      window.open(`/print-schedule/${patientId}`, '_blank'); // Open print after refreshing state      
    } catch (error) {
      console.error('Failed to save before printing:', error);
      alert('Could not save changes before printing. Please try again.');
    }
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

  const getBagDurations = (daysLeft, overrides = [], isPreservativeFree = false) => {
    const bags = [];
    let remaining = daysLeft;
  
    if (isPreservativeFree) {
      for (let i = 0; i < 28 && remaining > 0; i++) {
        const rawOverride = overrides[i];
        const override = Number.isInteger(rawOverride) ? rawOverride : parseInt(rawOverride);
        let duration;
  
        // If override is exactly 1, honor it
        if (override === 1) {
          duration = 1;
        }
        // If no override provided
        else if (isNaN(override)) {
          if (remaining % 2 === 1 && bags.length === 0) {
            // Force first bag to be 1-day if odd total days
            duration = 1;
          } else {
            duration = 2;
          }
        } else {
          // fallback
          duration = 2;
        }
  
        if (duration > remaining) duration = remaining;
  
        bags.push(duration);
        remaining -= duration;
      }
  
      return bags;
    }
  
    // Standard logic for non-preservative-free cycles
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
  
      if (duration > remaining) duration = remaining;
      bags.push(duration);
      remaining -= duration;
    }
  
    return bags;
  };  

  const getBagDetails = (duration) => {
  switch (duration) {
    case 1: return { volume: '240ml', rate: '10ml/hr' };
    case 2: return { volume: '240ml', rate: '5ml/hr' };
    case 3: return { volume: '130ml', rate: '1.8ml/hr' };
    case 4: return { volume: '173ml', rate: '1.8ml/hr' };
    case 7: return { volume: '101ml', rate: '0.6ml/hr' };
    default: return { volume: '-', rate: '-' };
  }
};

const getPatientPriority = (patient) => {
  const totalDays = parseInt(patient.daysInCycle, 10);
  const hospitalDate = parseLocalDate(patient.hospStartDate);
  const ourDate = parseLocalDate(patient.ourStartDate);
  let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
  daysPassed = daysPassed < 0 ? 0 : daysPassed;
  const remainingDays = totalDays - daysPassed;

  const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
  const schedule = getBagDurations(remainingDays, overrides, patient.isPreservativeFree || false);

  let current = new Date(ourDate);
  const today = new Date().toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toDateString();

  const showPtDoingBagsAlert = patient.pipsBagChanges?.toString().toLowerCase() === 'no';

  let highestPriority = 4; // 1 = Red, 2 = Yellow, 3 = Green, 4 = None

  for (let i = 0; i < schedule.length; i++) {
    const days = schedule[i];
    const startDateObj = new Date(current);
    const isToday = startDateObj.toDateString() === today;
    const isTomorrow = startDateObj.toDateString() === tomorrowStr;
    const prev = i > 0 ? schedule[i - 1] : null;

    if (showPtDoingBagsAlert && !(i === 0 && isToday)) {
      current.setDate(current.getDate() + days);
      continue;
    }

    if (i > 0 && days < prev && isTomorrow) return 1; // Red
    if (isTomorrow && !showPtDoingBagsAlert && highestPriority > 2) highestPriority = 2; // Yellow
    if (isToday && highestPriority > 3) highestPriority = 3; // Green

    current.setDate(current.getDate() + days);
  }

  // Check disconnect priority
  const lastBagEnd = new Date(current);
  if (lastBagEnd.toDateString() === today && highestPriority > 3) highestPriority = 3;
  if (lastBagEnd.toDateString() === tomorrowStr && highestPriority > 2) highestPriority = 2;

  return highestPriority;
};
const getTopPatientAlert = (patient) => {
  const totalDays = parseInt(patient.daysInCycle, 10);
  const hospitalDate = parseLocalDate(patient.hospStartDate);
  const ourDate = parseLocalDate(patient.ourStartDate);
  let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
  daysPassed = daysPassed < 0 ? 0 : daysPassed;
  const remainingDays = totalDays - daysPassed;

  const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
  const schedule = getBagDurations(remainingDays, overrides, patient.isPreservativeFree || false);

  let current = new Date(ourDate);
  const today = new Date().toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toDateString();

  const showPtDoingBagsAlert = patient.pipsBagChanges?.toString().toLowerCase() === 'no';

  for (let i = 0; i < schedule.length; i++) {
    const days = schedule[i];
    const startDateObj = new Date(current);
    const isToday = startDateObj.toDateString() === today;
    const isTomorrowBag = startDateObj.toDateString() === tomorrowStr;
    const prevBagDays = i > 0 ? schedule[i - 1] : null;

    // RN visit and aspiration logic
    if (i > 0 && days < prevBagDays && isTomorrowBag) {
      return "RN visit and aspiration required for tomorrow's bag change.";
    }

    // First bag today
    if (isToday && i === 0) return "First bag hookup. Confirm RN is scheduled.";

    // Aspiration today
    if (i > 0 && days < prevBagDays && isToday) {
      return "Aspiration required for bag change today.";
    }

    // Bag today
    if (isToday) return "Bag change due today.";

    // Bag tomorrow
    if (isTomorrowBag) return "Bag change due tomorrow.";

    current.setDate(current.getDate() + days);
  }

  // Check disconnect date alerts
  const lastBagEnd = new Date(current);
  if (lastBagEnd.toDateString() === today) return "Cycle completion today.";
  if (lastBagEnd.toDateString() === tomorrowStr) return "Cycle completion tomorrow.";

  // Only fallback here if no other alerts apply
  if (showPtDoingBagsAlert) return "Pt/CG doing all bag changes.";

  return "No urgent alert.";
};

const getAlertPriority = (alertText) => {
  if (alertText === "RN visit and aspiration required for tomorrow's bag change.") return 1;
  if (alertText === "Aspiration required for bag change today.") return 2;
  if (alertText === "First bag hookup. Confirm RN is scheduled.") return 3;
  if (alertText === "Bag change due today.") return 4;
  if (alertText === "Cycle completion today.") return 5;
  if (alertText === "Bag change due tomorrow.") return 6;
  if (alertText === "Cycle completion tomorrow.") return 7;
  if (
    alertText === "Pt/CG doing all bag changes." ||
    alertText === "No urgent alert."
  ) return 8;

  return 99;
};

const sortedByAlert = [...savedPatients]
  .filter(p => p.hospStartDate && p.ourStartDate)
  .sort((a, b) => {
    const alertA = getTopPatientAlert(a);
    const alertB = getTopPatientAlert(b);
    return getAlertPriority(alertA) - getAlertPriority(alertB);
  });

  return (
    <div style={{ padding: 20 }}>
      <h2>Blincyto Bag Change Schedule</h2>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ position: 'sticky', top: '50px', backgroundColor: '#f1f1f1', zIndex: 2 }}>
            <th>Patient Name:</th>
            <th style={{ maxWidth: '160px', width: '75px' }}>Blincyto Start Date:</th>
            <th style={{ maxWidth: '160px', width: '75px' }}>PIPS Start Date:</th>
            <th style={{ maxWidth: '160px', width: '40px' }}>Cycle Days:</th>
            <th>Bag Info:</th>
            <th>Disconnect Date:</th>
            <th style={{ maxWidth: '160px', width: '100px' }}>Actions:</th>
          </tr>
        </thead>
        <tbody>
          {sortedByAlert.map(patient => {
            const totalDays = parseInt(patient.daysInCycle, 10);
            const hospitalDate = parseLocalDate(patient.hospStartDate);
            const ourDate = parseLocalDate(patient.ourStartDate);
            let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
            daysPassed = daysPassed < 0 ? 0 : daysPassed;
            const remainingDays = totalDays - daysPassed;

            const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
            const times = bagTimeEdits[patient.id] || {};
            const schedule = getBagDurations(remainingDays, overrides, patient.isPreservativeFree || false);

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
  const { volume, rate } = getBagDetails(bag.durationDays);

  const isFirstBagToday = i === 0 && isToday;
  const isPumpReprogram = isTodayDiff;
  const showPtDoingBagsAlert = patient.pipsBagChanges?.toString().toLowerCase() === 'no';

  let backgroundColor = 'transparent';
  let bagAlert = null;

  // Priority-based highlight logic
  if (isToday && !showPtDoingBagsAlert) {
    backgroundColor = '#AFE19B';
    bagAlert = "Bag change due today. Please confirm RN is schedule to see patient.";
  }

  if (
    i > 0 &&
    bag.durationDays < bagData[i - 1].durationDays &&
    isTomorrowBag
  ) {
    backgroundColor = '#FF4C4C';
    bagAlert = "RN visit and line aspiration required for tomorrow's bag change. Call pt/cg for time remaining on pump and log bag change time below.";
  } else if (
    i > 0 &&
    bag.durationDays < bagData[i - 1].durationDays &&
    isToday
  ) {
    backgroundColor = '#AFE19B';
    bagAlert = "Confirm RN aware that aspiration of line is required when doing pump reprogram and bag change.";
  } else if (isFirstBagToday) {
    backgroundColor = '#AFE19B';
    bagAlert = "First bag hookup. Please confirm RN scheduled for visit and have RN report hookup time.";
  } else if (isPumpReprogram) {
    backgroundColor = '#AFE19B';
    bagAlert = "Pump reprogram due today.";
  } else if (i === 0 && isTomorrowBag && !showPtDoingBagsAlert) {
    backgroundColor = '#F6F12B';
    bagAlert = "Confirm hookup time w/ hospital or Patient.";
  } else if (isTomorrowBag && !showPtDoingBagsAlert) {
    backgroundColor = '#F6F12B';
    bagAlert = "Call pt/cg today for remaining time on pump. Calculate and log time.";
  }

  // ✅ Suppress highlights if patient/caregiver is doing bags
  const suppressHighlight =
    showPtDoingBagsAlert &&
    !isFirstBagToday &&
    !isPumpReprogram &&
    backgroundColor !== '#FF4C4C';

  if (suppressHighlight) {
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
      Volume: {volume}<br />
      Rate: {rate}<br />
 {bagAlert && (
  <div
    style={{
      color:
        bagAlert === "Pt/CG doing bag changes." ? '#0070C0' :
        bagAlert === "Confirm RN aware that aspiration of line is required when doing pump reprogram and bag change." ? 'red' :
        'black',
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
          {(patient.isPreservativeFree ? [1] : [1, 2, 3, 4, 7]).map(day => (
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
    Please confirm RN scheduled for disconnect visit.
  </div>
)}
  </div>
</td>

<td style={{ maxWidth: '240px', width: '200px' }}>
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
            }
          });
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