// src/AddPatient.js
import React, { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export default function AddPatient() {
  const [formData, setFormData] = useState({
    name: '',
    mrn: '',
    dob: '',
    type: 'Adult',
    status: 'Active',
    dx: 'Relapse Refractory',
    hospital: 'UWMC',
    pharmTeam: '1A',
    nurseTeam: 'North',
    interpreter: 'No',
    readWriteLang: 'Yes',
    notes: '',
    lineType: 'Port',
    ext: 'No',
    cycle: 'Cycle 1',
    daysInCycle: '28',
    pipsBagChanges: 'Yes',
    hospStartDate: '',
    ourStartDate: '',
    hookupTime: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'patients'), {
        ...formData,
        createdAt: Timestamp.now()
      });
      alert('Patient added successfully!');
      setFormData({
        name: '', mrn: '', dob: '', type: 'Adult', status: 'Active', dx: 'Relapse Refractory',
        hospital: 'UWMC', pharmTeam: '1A', nurseTeam: 'North', interpreter: 'No',
        readWriteLang: 'Yes', notes: '', lineType: 'Port', ext: 'No', cycle: 'Cycle 1',
        daysInCycle: '28', pipsBagChanges: 'Yes', hospStartDate: '', ourStartDate: '', hookupTime: ''
      });
    } catch (error) {
      console.error('Error adding patient:', error);
      alert('Failed to add patient.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20 }}>
      <h2>Add New Patient</h2>
      <input name="name" placeholder="Patient Name" value={formData.name} onChange={handleChange} /><br /><br />
      <input name="mrn" placeholder="MRN#" value={formData.mrn} onChange={handleChange} /><br /><br />
      <input name="dob" type="date" placeholder="DOB" value={formData.dob} onChange={handleChange} /><br /><br />
      <select name="type" value={formData.type} onChange={handleChange}>
        <option>Adult</option><option>Pediatric</option>
      </select><br /><br />
      <select name="status" value={formData.status} onChange={handleChange}>
        <option>Active</option><option>On Hold</option><option>Discharged</option><option>Pending</option>
      </select><br /><br />
      <select name="dx" value={formData.dx} onChange={handleChange}>
        <option>Relapse Refractory</option><option>MRD Positive</option>
      </select><br /><br />
      <select name="hospital" value={formData.hospital} onChange={handleChange}>
        <option>UWMC</option><option>Swedish</option><option>Prov Colby</option><option>FHCC</option><option>SCH</option>
      </select><br /><br />
      <select name="pharmTeam" value={formData.pharmTeam} onChange={handleChange}>
        <option>1A</option><option>1E</option><option>2G</option><option>4G</option>
      </select><br /><br />
      <select name="nurseTeam" value={formData.nurseTeam} onChange={handleChange}>
        <option>North</option><option>South</option><option>Central</option><option>East</option>
      </select><br /><br />
      <select name="interpreter" value={formData.interpreter} onChange={handleChange}>
        <option>No</option><option>Yes - Spanish</option><option>Yes - Cantonese</option>
        <option>Yes - Mandarin</option><option>Yes - Korean</option><option>Yes - Russian</option>
        <option>Yes - Japanese</option><option>Yes - Arabic</option><option>Yes - Vietnamese</option>
        <option>Yes - Portugese</option><option>Yes - Other</option>
      </select><br /><br />
      <select name="readWriteLang" value={formData.readWriteLang} onChange={handleChange}>
        <option>Yes</option><option>No</option>
      </select><br /><br />
      <textarea name="notes" placeholder="Notes" value={formData.notes} onChange={handleChange} /><br /><br />
      <select name="lineType" value={formData.lineType} onChange={handleChange}>
        <option>Port</option><option>PICC - SL</option><option>PICC - DL</option><option>PICC - TL</option>
        <option>CVC Tunneled - SL</option><option>CVC Tunneled - DL</option><option>CVC Tunneled - TL</option>
        <option>Midline - SL</option><option>Midline - DL</option><option>Midline - TL</option>
      </select><br /><br />
      <select name="ext" value={formData.ext} onChange={handleChange}>
        <option>No</option><option>Yes-7"</option><option>Yes-14"</option>
      </select><br /><br />
      <select name="cycle" value={formData.cycle} onChange={handleChange}>
        <option>Cycle 1</option><option>Cycle 2</option><option>Cycle 3</option><option>Cycle 4</option><option>Cycle 5</option>
      </select><br /><br />
      <select name="daysInCycle" value={formData.daysInCycle} onChange={handleChange}>
        {[...Array(28)].map((_, i) => (
          <option key={i+1}>{i+1}</option>
        ))}
      </select><br /><br />
      <select name="pipsBagChanges" value={formData.pipsBagChanges} onChange={handleChange}>
        <option>Yes</option><option>No</option>
      </select><br /><br />
      <input name="hospStartDate" type="date" value={formData.hospStartDate} onChange={handleChange} /><br /><br />
      <input name="ourStartDate" type="date" value={formData.ourStartDate} onChange={handleChange} /><br /><br />
      <input name="hookupTime" type="time" value={formData.hookupTime} onChange={handleChange} /><br /><br />
      <button type="submit">Save Patient</button>
    </form>
  );
}