// src/BagSchedule.js
import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import AddPatient from './AddPatient';
import generateBagSchedule from './utils/generateBagSchedule';

export default function BagSchedule() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data.filter(p => p.name && p.hospStartDate && p.ourStartDate));
    });
    return () => unsub();
  }, []);

  const handleEdit = (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Bag Change Schedule</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>MRN</th>
            <th>DOB</th>
            <th>Blincyto Hospital/Initial H/U Date</th>
            <th>Hospital Discharge/PIPS Hookup Date</th>
            <th>Disconnect Date</th>
            <th>Bag Schedule</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => {
            const schedule = generateBagSchedule(p);
            const disconnectDate = schedule.length > 0 ? schedule[schedule.length - 1].changeDate : '';
            return (
              <tr key={p.id}>
                <td>
                  <button onClick={() => handleEdit(p)} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
                    {p.name}
                  </button>
                </td>
                <td>{p.mrn}</td>
                <td>{p.dob}</td>
                <td>{p.hospStartDate}</td>
                <td>{p.ourStartDate}</td>
                <td>{disconnectDate}</td>
                <td>
                  {schedule.map((bag, index) => (
                    <div key={index} style={{ marginBottom: 10 }}>
                      <strong>Bag {index + 1}, {bag.duration} days</strong><br />
                      Start Date: {bag.startDate}<br />
                      Bag Change Date: {bag.changeDate}
                    </div>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {showModal && (
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
            <button onClick={handleCloseModal} style={{ float: 'right' }}>Cancel</button>
            <AddPatient key={selectedPatient?.id || 'new'} editData={selectedPatient} onClose={handleCloseModal} />
          </div>
        </div>
      )}
    </div>
  );
}
