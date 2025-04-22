// src/PatientForm.js
import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export default function PatientForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    mrn: '',
    dob: '',
    type: '',
    status: '',
    dx: '',
    hospital: '',
    pharmTeam: '',
    nurseTeam: '',
    interpreter: '',
    readWriteLang: '',
    notes: '',
    lineType: '',
    ext: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'patients'), {
        ...formData,
        createdAt: Timestamp.now()
      });
      alert('Patient added!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding patient:', error);
      alert('Failed to add patient.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add New Patient</h3>
      <label>Patient Name:</label><br />
      <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} /><br /><br />

      <label>CPR+ MRN#:</label><br />
      <input name="mrn" placeholder="MRN" value={formData.mrn} onChange={handleChange} /><br /><br />

      <label>DOB:</label><br />
      <input name="dob" type="date" value={formData.dob} onChange={handleChange} /><br /><br />

      <label>Adult/Pediatric:</label><br />
      <select name="type" value={formData.type} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>Adult</option>
        <option>Pediatric</option>
      </select><br /><br />

      <label>Status:</label><br />
      <select name="status" value={formData.status} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>Active</option>
        <option>On Hold</option>
        <option>Discharged</option>
        <option>Pending</option>
      </select><br /><br />

      <label>Dx:</label><br />
      <select name="dx" value={formData.dx} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>Relapse Refractory</option>
        <option>MRD Positive</option>
      </select><br /><br />

      <label>Hospital:</label><br />
      <select name="hospital" value={formData.hospital} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>UWMC</option>
        <option>Swedish</option>
        <option>Prov Colby</option>
        <option>FHCC</option>
        <option>SCH</option>
      </select><br /><br />

      <label>Pharm Team:</label><br />
      <select name="pharmTeam" value={formData.pharmTeam} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>1A</option>
        <option>1E</option>
        <option>2G</option>
        <option>4G</option>
      </select><br /><br />

      <label>Nurse Team:</label><br />
      <select name="nurseTeam" value={formData.nurseTeam} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>North</option>
        <option>South</option>
        <option>Central</option>
        <option>East</option>
      </select><br /><br />

      <label>Interpreter needed:</label><br />
      <select name="interpreter" value={formData.interpreter} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>No</option>
        <option>Yes - Spanish</option>
        <option>Yes - Cantonese</option>
        <option>Yes - Mandarin</option>
        <option>Yes - Korean</option>
        <option>Yes - Russian</option>
        <option>Yes - Japanese</option>
        <option>Yes - Arabic</option>
        <option>Yes - Vietnamese</option>
        <option>Yes - Portugese</option>
        <option>Yes - Other</option>
      </select><br /><br />

      <label>Read/Write in their Language:</label><br />
      <select name="readWriteLang" value={formData.readWriteLang} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>Yes</option>
        <option>No</option>
      </select><br /><br />

      <label>Notes:</label><br />
      <textarea name="notes" placeholder="Notes" value={formData.notes} onChange={handleChange} /><br /><br />

      <label>Line Type:</label><br />
      <select name="lineType" value={formData.lineType} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>Port</option>
        <option>PICC - SL</option>
        <option>PICC - DL</option>
        <option>PICC - TL</option>
        <option>CVC Tunneled - SL</option>
        <option>CVC Tunneled - DL</option>
        <option>CVC Tunneled - TL</option>
        <option>Midline - SL</option>
        <option>Midline - DL</option>
        <option>Midline - TL</option>
      </select><br /><br />

      <label>Ext added?:</label><br />
      <select name="ext" value={formData.ext} onChange={handleChange}>
        <option value="">--Select--</option>
        <option>No</option>
        <option>Yes-7"</option>
        <option>Yes-14"</option>
      </select><br /><br />

      <button type="submit">Save</button>
      <button type="button" onClick={onClose} style={{ marginLeft: 10 }}>Cancel</button>
    </form>
  );
}
