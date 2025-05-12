// src/InactivePatients.js
import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import AddPatient from './AddPatient';

export default function InactivePatients() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'inactivePatients'), (snapshot) => {
      const inactive = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.status === 'On Hold' || p.status === 'Discharged')
        .sort((a, b) => a.name.localeCompare(b.name));
      setPatients(inactive);
    });
    return () => unsub();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
  const patient = patients.find(p => p.id === id);
  const updatedPatient = { ...patient, status: newStatus };

  if (newStatus === 'Active' || newStatus === 'Pending') {
    await setDoc(doc(db, 'patients', id), updatedPatient);
    await deleteDoc(doc(db, 'inactivePatients', id));
  } else {
    await updateDoc(doc(db, 'inactivePatients', id), { status: newStatus });
  }
};


  const handleDelete = async (id) => {
    const confirm = window.confirm('Delete this patient permanently?');
    if (confirm) {
      await deleteDoc(doc(db, 'patients', id));
      alert('Patient deleted.');
    }
  };

  const handleEdit = (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setSelectedPatient(null);
    setShowModal(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Inactive Patients</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Hospital</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.id}>
              <td>
                <button onClick={() => handleEdit(p)} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
                  {p.name}
                </button>
              </td>
              <td>
                <select value={p.status} onChange={(e) => handleStatusChange(p.id, e.target.value)}>
                  <option>On Hold</option>
                  <option>Discharged</option>
                  <option>Active</option>
                  <option>Pending</option>
                </select>
              </td>
              <td>{p.hospital}</td>
              <td>
                <button onClick={() => handleDelete(p.id)}>Delete</button>
              </td>
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
    overflowY: 'auto',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: '40px'
  }}>
    <div style={{
      background: 'white',
      padding: 20,
      width: '90%',
      maxWidth: 800,
      borderRadius: '8px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <AddPatient key={selectedPatient?.id || 'edit'} editData={selectedPatient} onClose={handleCloseModal} />
    </div>
  </div>
)}
    </div>
  );
}
