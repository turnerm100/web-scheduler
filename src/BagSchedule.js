// src/BagSchedule.js
import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import AddPatient from './AddPatient';

export default function BagSchedule() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data);
    });
    return () => unsub();
  }, []);

  const formatDate = (date) => {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric'
    });
  };

  const calculateSchedule = (patient) => {
    const totalDays = parseInt(patient.daysInCycle, 10);
    const hospitalDate = new Date(patient.hospStartDate);
    const ourDate = new Date(patient.ourStartDate);
    if (isNaN(hospitalDate.getTime()) || isNaN(ourDate.getTime())) return [];

    const remainingDays = totalDays - Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
    const schedule = [];
    let daysLeft = remainingDays;

    if (daysLeft >= 6 && daysLeft % 7 === 6) {
      schedule.push(3, 3);
      daysLeft -= 6;
    } else if (daysLeft >= 5 && daysLeft % 7 === 5) {
      schedule.push(2, 3);
      daysLeft -= 5;
    } else if (daysLeft >= 4 && daysLeft % 7 === 4) {
      schedule.push(4);
      daysLeft -= 4;
    } else if (daysLeft >= 3 && daysLeft % 7 === 3) {
      schedule.push(3);
      daysLeft -= 3;
    } else if (daysLeft >= 2 && daysLeft % 7 === 2) {
      schedule.push(2);
      daysLeft -= 2;
    } else if (daysLeft === 1) {
      schedule.push(1);
      daysLeft -= 1;
    }

    while (daysLeft >= 7) {
      schedule.push(7);
      daysLeft -= 7;
    }

    return schedule;
  };

  const calculateBagDates = (patient, schedule) => {
    const startDate = new Date(patient.ourStartDate);
    const bags = [];
    let current = new Date(startDate);

    schedule.forEach((duration, index) => {
      const endDate = new Date(current);
      endDate.setDate(current.getDate() + duration);
      bags.push({
        label: `Bag ${index + 1}`,
        duration: `${duration} days`,
        startDate: formatDate(current),
        endDate: formatDate(endDate)
      });
      current = new Date(endDate);
    });

    return bags;
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Bag Schedule</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Blincyto Hospital/Initial H/U Date:</th>
            <th>Hospital Discharge/PIPS Hookup Date:</th>
            <th>Cycle Days</th>
            <th>Bag Info</th>
            <th>Disconnect Date:</th>
          </tr>
        </thead>
        <tbody>
          {patients.filter(p => p.hospStartDate && p.ourStartDate).map(patient => {
            const schedule = calculateSchedule(patient);
            const bagData = calculateBagDates(patient, schedule);
            const disconnectDate = bagData.length > 0 ? bagData[bagData.length - 1].endDate : '';

            return (
              <tr key={patient.id}>
                <td>
                  <button style={{ color: '#007BFF', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => setSelectedPatient({ ...patient })}>
                    {patient.name}
                  </button>
                </td>
                <td>{formatDate(new Date(patient.hospStartDate))}</td>
                <td>{formatDate(new Date(patient.ourStartDate))}</td>
                <td>{patient.daysInCycle}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {bagData.map((bag, i) => (
                      <div key={i} style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '5px', minWidth: '160px' }}>
                        <strong>{bag.label}</strong><br />
                        {bag.duration}<br />
                        Start Date: {bag.startDate}<br />
                        Bag Change Date: {bag.endDate}
                      </div>
                    ))}
                  </div>
                </td>
                <td>{disconnectDate}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedPatient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.5)',
          overflowY: 'auto',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '40px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            width: '90%',
            maxWidth: '800px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
         <button onClick={() => setSelectedPatient(null)} style={{ float: 'right' }}>Cancel</button>
            <AddPatient patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
