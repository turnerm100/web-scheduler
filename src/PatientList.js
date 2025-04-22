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
<<<<<<< HEAD
      <h2>Active & Pending Patients</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>MRN</th>
            <th>DOB</th>
            <th>Status</th>
            <th>Hospital</th>
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
              <td>{p.mrn}</td>
              <td>{p.dob}</td>
              <td>{p.status}</td>
              <td>{p.hospital}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: 'white', margin: '5% auto', padding: 20, width: '90%', maxWidth: 800 }}>
            <button onClick={handleCloseModal} style={{ float: 'right' }}>Cancel</button>
            <AddPatient key={selectedPatient?.id || 'new'} editData={selectedPatient} onClose={handleCloseModal} />
          </div>
=======
      <h2>Patient List</h2>
      {patients.length === 0 ? (
        <p>No patients found.</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Name</th>
              <th>MRN</th>
              <th>DOB</th>
              <th>Hospital</th>
              <th>Status</th>
              <th>Bag1 Duration</th>
              <th>Bag2 Duration</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.name}</td>
                <td>{patient.mrn}</td>
                <td>{patient.dob}</td>
                <td>{patient.hospital}</td>
                <td>{patient.status}</td>
                <td>{patient.bag1Duration || ''}</td>
                <td>{patient.bag2Duration || ''}</td>
                <td>
                  <button onClick={() => handleEditClick(patient)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 50, left: '25%', width: '50%', background: '#fff', padding: 20, border: '1px solid #ccc', zIndex: 1000 }}>
          <h3>Edit Patient</h3>
          <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Name" /><br /><br />
          <input name="mrn" value={formData.mrn || ''} onChange={handleChange} placeholder="MRN" /><br /><br />
          <input name="dob" type="date" value={formData.dob || ''} onChange={handleChange} placeholder="DOB" /><br /><br />
          <input name="hospital" value={formData.hospital || ''} onChange={handleChange} placeholder="Hospital" /><br /><br />
          <select name="status" value={formData.status || ''} onChange={handleChange}>
            <option>Active</option>
            <option>On Hold</option>
            <option>Discharged</option>
            <option>Pending</option>
          </select><br /><br />

          <h4>Bag #1</h4>
          <label>Bag Duration Override:</label><br />
          <select name="bag1Override" value={formData.bag1Override || ''} onChange={handleChange}>
            <option value="">--</option>
            <option>1</option><option>2</option><option>3</option><option>4</option><option>7</option>
          </select><br /><br />

          <label>Bag Duration (calculated or manual):</label><br />
          <input name="bag1Duration" value={formData.bag1Duration || ''} onChange={handleChange} /><br /><br />

          <label>Visit Time Confirmation Call:</label><br />
          <input name="bag1CallTime" value={formData.bag1CallTime || ''} onChange={handleChange} /><br /><br />

          <label>Bag Change Date:</label><br />
          <input name="bag1ChangeDate" type="text" value={formData.bag1ChangeDate || ''} onChange={handleChange} /><br /><br />

          <label>Visit Time:</label><br />
          <input name="bag1VisitTime" type="time" value={formData.bag1VisitTime || ''} onChange={handleChange} /><br /><br />

          <h4>Bag #2</h4>
          <label>Bag Duration Override:</label><br />
          <select name="bag2Override" value={formData.bag2Override || ''} onChange={handleChange}>
            <option value="">--</option>
            <option>1</option><option>2</option><option>3</option><option>4</option><option>7</option>
          </select><br /><br />

          <label>Bag Duration (calculated or manual):</label><br />
          <input name="bag2Duration" value={formData.bag2Duration || ''} onChange={handleChange} /><br /><br />

          <label>Visit Time Confirmation Call:</label><br />
          <input name="bag2CallTime" value={formData.bag2CallTime || ''} onChange={handleChange} /><br /><br />

          <label>Bag Change Date:</label><br />
          <input name="bag2ChangeDate" type="text" value={formData.bag2ChangeDate || ''} onChange={handleChange} /><br /><br />

          <label>Visit Time:</label><br />
          <input name="bag2VisitTime" type="time" value={formData.bag2VisitTime || ''} onChange={handleChange} /><br /><br />

          <button onClick={handleUpdate}>Update</button>
          <button onClick={() => setShowModal(false)} style={{ marginLeft: 10 }}>Cancel</button>
>>>>>>> 531fd3808af5c014758e07b812363b0fd04d5e17
        </div>
      )}
    </div>
  );
}
