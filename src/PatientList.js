// src/PatientList.js
import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import AddPatient from './AddPatient';

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const active = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.status === 'Active' || p.status === 'Pending')
        .sort((a, b) => a.name.localeCompare(b.name));
      setPatients(active);
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
      <h2>Active & Pending Patients</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>MRN</th>
            <th>DOB</th>
            <th>Status</th>
            <th>Hospital</th>
            <th>Type</th>
            <th>Dx</th>
            <th>Pharm Team</th>
            <th>Nurse Team</th>
            <th>Interpreter</th>
            <th>Line Type</th>
            <th>Ext</th>
            <th>Cycle</th>
            <th>Days in Cycle</th>
            <th>Blincyto Start Date</th>
            <th>PIPS Start Date</th>
            <th>Hookup Time</th>
            <th>Preservative Free</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.id}>
              <td>
                <button
                  onClick={() => handleEdit(p)}
                  style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  {p.name}
                </button>
              </td>
              <td>{p.mrn}</td>
              <td>{p.dob}</td>
              <td>{p.status}</td>
              <td>{p.hospital}</td>
              <td>{p.type}</td>
              <td>{p.dx}</td>
              <td>{p.pharmTeam}</td>
              <td>{p.nurseTeam}</td>
              <td>{p.interpreter}</td>
              <td>{p.lineType}</td>
              <td>{p.ext}</td>
              <td>{p.cycle}</td>
              <td>{p.daysInCycle}</td>
              <td>{p.hospStartDate}</td>
              <td>{p.ourStartDate}</td>
              <td>{p.hookupTime}</td>
              <td>{p.isPreservativeFree ? 'Yes' : 'No'}</td>
            </tr>
          ))}
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
          overflow: 'auto',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            margin: '40px auto',
            padding: '20px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <AddPatient key={selectedPatient?.id || 'new'} editData={selectedPatient} onClose={handleCloseModal} />
          </div>
        </div>
      )}
    </div>
  );
}
