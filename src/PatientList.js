// src/PatientList.js
import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({});
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPatients(data);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };

    fetchPatients();
  }, []);

  const handleEditClick = (patient) => {
    setSelectedPatient(patient);
    setFormData(patient);
    setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    if (!selectedPatient) return;
    try {
      const patientRef = doc(db, 'patients', selectedPatient.id);
      await updateDoc(patientRef, formData);
      alert('Patient updated successfully!');
      setShowModal(false);
      setSelectedPatient(null);
      setFormData({});
      const querySnapshot = await getDocs(collection(db, 'patients'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data);
    } catch (err) {
      console.error('Error updating patient:', err);
      alert('Update failed.');
    }
  };

  return (
    <div style={{ padding: 20 }}>
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
        </div>
      )}
    </div>
  );
}
