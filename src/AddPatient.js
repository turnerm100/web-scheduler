// src/AddPatient.js
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, Timestamp, doc } from 'firebase/firestore';

export default function AddPatient({ editData, onClose }) {
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
    ext: '',
    cycle: '',
    daysInCycle: '',
    pipsBagChanges: '',
    hospStartDate: '',
    ourStartDate: '',
    hookupTime: '',
    bagOverrides: []
  });

  useEffect(() => {
    if (editData) {
      setFormData({ ...editData, bagOverrides: editData.bagOverrides || [] });
    }
  }, [editData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOverrideChange = (index, value) => {
    const updatedOverrides = [...formData.bagOverrides];
    updatedOverrides[index] = value;
    setFormData({ ...formData, bagOverrides: updatedOverrides });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editData) {
        await updateDoc(doc(db, 'patients', editData.id), formData);
        alert('Patient updated successfully!');
      } else {
        await addDoc(collection(db, 'patients'), {
          ...formData,
          createdAt: Timestamp.now()
        });
        alert('Patient added successfully!');
      }
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Failed to save patient.');
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '', mrn: '', dob: '', type: '', status: '', dx: '', hospital: '',
      pharmTeam: '', nurseTeam: '', interpreter: '', readWriteLang: '', notes: '',
      lineType: '', ext: '', cycle: '', daysInCycle: '', pipsBagChanges: '',
      hospStartDate: '', ourStartDate: '', hookupTime: '', bagOverrides: []
    });
    if (onClose) onClose();
  };

  const renderField = (label, name, type = 'text') => (
    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
      <label style={{ width: '250px' }}><strong>{label}:</strong></label>
      <input
        type={type}
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        style={{ width: '300px' }}
      />
    </div>
  );

  const renderSelect = (label, name, options) => (
    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
      <label style={{ width: '250px' }}><strong>{label}:</strong></label>
      <select name={name} value={formData[name] || ''} onChange={handleChange} style={{ width: '300px' }}>
        <option value="">Select</option>
        {options.map(opt => <option key={opt}>{opt}</option>)}
      </select>
    </div>
  );

  const renderOverrides = () => (
    <div>
      <h4>Bag Duration Overrides</h4>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ marginBottom: '8px' }}>
          <label>Bag {i + 1} Override:</label>
          <input
            type="number"
            min="1"
            max="7"
            value={formData.bagOverrides[i] || ''}
            onChange={(e) => handleOverrideChange(i, e.target.value)}
            style={{ marginLeft: '10px', width: '60px' }}
          />
        </div>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20 }}>
      {renderField('Patient Name (Last, First)', 'name')}
      {renderField('CPR+ MRN#', 'mrn')}
      {renderField('DOB', 'dob', 'date')}
      {renderSelect('Adult/ Pediatric', 'type', ['Adult', 'Pediatric'])}
      {renderSelect('Status', 'status', ['Active', 'On Hold', 'Discharged', 'Pending'])}
      {renderSelect('Diagnosis', 'dx', ['Relapse Refractory', 'MRD Positive'])}
      {renderSelect('Hospital', 'hospital', ['UWMC', 'Swedish', 'Prov Colby', 'FHCC', 'SCH'])}
      {renderSelect('Pharmacy Team', 'pharmTeam', ['1A', '1E', '2G', '4G'])}
      {renderSelect('Nursing Team', 'nurseTeam', ['North', 'South', 'Central', 'East'])}
      {renderSelect('Interpreter Needed', 'interpreter', ['No', 'Yes - Spanish', 'Yes - Cantonese', 'Yes - Mandarin', 'Yes - Korean', 'Yes - Russian', 'Yes - Japanese', 'Yes - Arabic', 'Yes - Vietnamese', 'Yes - Portugese', 'Yes - Other'])}
      {renderSelect('Reads/Writes in their language', 'readWriteLang', ['Yes', 'No'])}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
        <label style={{ width: '250px' }}><strong>Notes:</strong></label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          style={{ width: '300px', height: '80px' }}
        />
      </div>
      {renderSelect('Line Type', 'lineType', ['Port', 'PICC - SL', 'PICC - DL', 'PICC - TL', 'CVC Tunneled - SL', 'CVC Tunneled - DL', 'CVC Tunneled - TL', 'Midline - SL', 'Midline - DL', 'Midline - TL'])}
      {renderSelect('Extension Added?', 'ext', ['No', 'Yes-7"', 'Yes-14"'])}
      {renderSelect('Blincyto Cycle', 'cycle', ['Cycle 1', 'Cycle 2', 'Cycle 3', 'Cycle 4', 'Cycle 5'])}
      {renderSelect('# Days in Cycle', 'daysInCycle', Array.from({ length: 28 }, (_, i) => (i + 1).toString()))}
      {renderSelect('PIPS doing Bag Changes?', 'pipsBagChanges', ['Yes', 'No'])}
      {renderField('Hospital Start Date', 'hospStartDate', 'date')}
      {renderField('Our Start Date', 'ourStartDate', 'date')}
      {renderField('Hookup Time', 'hookupTime', 'time')}

      {renderOverrides()}

      <div style={{ marginTop: '20px' }}>
        <button type="submit" style={{ marginRight: '10px' }}>Save Patient</button>
        <button type="button" onClick={handleCancel}>Cancel</button>
      </div>
    </form>
  );
}
