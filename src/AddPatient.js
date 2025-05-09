// src/AddPatient.js
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, updateDoc, Timestamp, doc } from 'firebase/firestore';

export default function AddPatient({ editData, onClose }) {
  const [activeTab, setActiveTab] = useState('patient');

  const [formData, setFormData] = useState({
    name: '', mrn: '', dob: '', type: '', status: '', dx: '', hospital: '',
    pharmTeam: '', nurseTeam: '', interpreter: '', readWriteLang: '', notes: '',
    lineType: '', ext: '', cycle: '', daysInCycle: '', pipsBagChanges: '',
    hospStartDate: '', ourStartDate: '', hookupTime: '',
    isPreservativeFree: false,
    nursingVisitPlan: '',
    nursingVisitDay: ''
  });

  useEffect(() => {
    if (editData) setFormData(editData);
  }, [editData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'pipsBagChanges') {
      if (value === 'Yes') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          nursingVisitPlan: 'RN will be doing bag/drsg changes and labs if ordered.',
          nursingVisitDay: 'RN visit will coincide with bag change schedule.'
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          nursingVisitPlan: '',
          nursingVisitDay: ''
        }));
      }
    } else if (name === 'nursingVisitPlan') {
      if (!formData.pipsBagChanges) {
        alert('Please select "PIPS doing Bag Changes?" before choosing a Nursing Visit Plan.');
        return;
      }
    
      let updatedVisitDay = formData.nursingVisitDay;
    
      if (formData.pipsBagChanges === 'No' && value === 'Pt/Cg doing bag changes and lab/drsg done at hospital/clinic.') {
        updatedVisitDay = 'Pt doing drsg/labs at Hospital/Clinic';
      } else if (value === 'RN to do lab/drsg only. Pt/cg doing bag changes.') {
        updatedVisitDay = '';
      }
    
      setFormData(prev => ({
        ...prev,
        [name]: value,
        nursingVisitDay: updatedVisitDay
      }));
    }
     else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const { name, mrn, dob } = formData;
  if (!name.trim() || !mrn.trim() || !dob.trim()) {
    alert('Patient Name, MRN #, and DOB are required.');
    return;
  }

  try {
    if (editData) {
      await updateDoc(doc(db, 'patients', editData.id), {
        ...formData,
        pipsDoingBags: formData.pipsBagChanges // 🔥 critical fix here
      });
      alert('Patient updated successfully!');
    } else {
      await addDoc(collection(db, 'patients'), {
        ...formData,
        pipsDoingBags: formData.pipsBagChanges,
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
        style={{ width: '400px' }}
      />
    </div>
  );

  const renderSelect = (label, name, options, disabled = false) => (
    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
      <label style={{ width: '250px' }}><strong>{label}:</strong></label>
      <select
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        style={{ width: '420px', whiteSpace: 'normal', overflowWrap: 'break-word', padding: '4px', color: '#000' }}
        disabled={disabled}
      >
        <option value="">Select</option>
        {options.map(opt => <option key={opt}>{opt}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ padding: 20 }}>
<div style={{
  position: 'sticky',
  top: 0,
  zIndex: 1000,
  backgroundColor: 'white',
  padding: '10px 20px',
  borderBottom: '1px solid #ccc',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '10px',
  marginBottom: '16px'
}}>
  {/* Tab Buttons on Left */}
  <div>
    <button
      type="button"
      onClick={() => setActiveTab('patient')}
      style={{
        marginRight: 10,
        backgroundColor: activeTab === 'patient' ? '#153D64' : '#ccc',
        color: activeTab === 'patient' ? 'white' : 'black',
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px'
      }}
    >
      Patient Info
    </button>
    <button
      type="button"
      onClick={() => setActiveTab('schedule')}
      style={{
        backgroundColor: activeTab === 'schedule' ? '#153D64' : '#ccc',
        color: activeTab === 'schedule' ? 'white' : 'black',
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px'
      }}
    >
      Blincyto Schedule
    </button>
  </div>

  {/* Save / Cancel Buttons on Right */}
  <div>
    <button
      type="submit"
      style={{
        backgroundColor: '#153D64',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 16px',
        marginRight: '10px'
      }}
    >
      Save Patient
    </button>
    <button
      type="button"
      onClick={handleCancel}
      style={{
        backgroundColor: '#ccc',
        color: 'black',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 16px'
      }}
    >
      Cancel
    </button>
  </div>
</div>

      {/* Tab 1: Patient Info */}
      {activeTab === 'patient' && (
        <>
          {renderField('Patient Name (Last, First)', 'name')}
          {renderField('CPR+ MRN#', 'mrn')}
          {renderField('DOB', 'dob', 'date')}
          {renderSelect('Adult/ Pediatric', 'type', ['Adult', 'Pediatric'])}
          {renderSelect('Status', 'status', ['Active', 'On Hold', 'Discharged', 'Pending'])}
          {renderSelect('Diagnosis', 'dx', ['Relapse Refractory', 'MRD Positive'])}
          {renderSelect('Hospital', 'hospital', ['UWMC', 'Swedish', 'Prov Colby', 'FHCC', 'SCH'])}
          {renderSelect('Pharmacy Team', 'pharmTeam', ['1A', '1E', '2G', '4G'])}
          {renderSelect('Nursing Team', 'nurseTeam', ['North', 'South', 'Central', 'East'])}
          {renderSelect('Interpreter Needed', 'interpreter', [
            'No', 'Yes - Spanish', 'Yes - Cantonese', 'Yes - Mandarin', 'Yes - Korean',
            'Yes - Russian', 'Yes - Japanese', 'Yes - Arabic', 'Yes - Vietnamese', 'Yes - Portugese', 'Yes - Other'
          ])}
          {renderSelect('Reads/Writes in their language', 'readWriteLang', ['Yes', 'No'])}
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
            <label style={{ width: '250px' }}><strong>Notes:</strong></label>
            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} style={{ width: '400px', height: '80px' }} />
          </div>
          {renderSelect('Line Type', 'lineType', ['Port', 'PICC - SL', 'PICC - DL', 'PICC - TL', 'CVC Tunneled - SL', 'CVC Tunneled - DL', 'CVC Tunneled - TL', 'Midline - SL', 'Midline - DL', 'Midline - TL'])}
          {renderSelect('Extension Added?', 'ext', ['No', 'Yes-7"', 'Yes-14"'])}
        </>
      )}

      {/* Tab 2: Blincyto Schedule */}
      {activeTab === 'schedule' && (
        <>
          {renderSelect('Blincyto Cycle', 'cycle', ['Cycle 1', 'Cycle 2', 'Cycle 3', 'Cycle 4', 'Cycle 5'])}
          {renderSelect('# Days in Cycle', 'daysInCycle', Array.from({ length: 28 }, (_, i) => (28 - i).toString()))}
          {renderSelect('PIPS doing Bag Changes?', 'pipsBagChanges', ['Yes', 'No'])}

          {renderSelect('Nursing Visit Plan', 'nursingVisitPlan',
            formData.pipsBagChanges === 'Yes'
              ? ['RN will be doing bag/drsg changes and labs if ordered.']
              : ['RN to do lab/drsg only. Pt/cg doing bag changes.', 'Pt/Cg doing bag changes and lab/drsg done at hospital/clinic.'],
            formData.pipsBagChanges === 'Yes')}

          {formData.pipsBagChanges === 'No' && formData.nursingVisitPlan === 'RN to do lab/drsg only. Pt/cg doing bag changes.'
            ? renderSelect('RN Visit Day', 'nursingVisitDay', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
            : renderField('RN Visit Day', 'nursingVisitDay')}

          {renderField('Blincyto Start Date', 'hospStartDate', 'date')}
          {renderField('PIPS start Date', 'ourStartDate', 'date')}
          {renderField('Hookup Time', 'hookupTime', 'time')}

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '250px' }}><strong>Preservative free only cycle:</strong></label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={formData.isPreservativeFree || false} onChange={(e) => setFormData(prev => ({ ...prev, isPreservativeFree: e.target.checked }))} style={{ transform: 'scale(1.5)', marginRight: '8px' }} />
              <span style={{ color: formData.isPreservativeFree ? 'green' : 'gray', fontWeight: formData.isPreservativeFree ? 'bold' : 'normal' }}>
                {formData.isPreservativeFree ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>
          <div style={{ marginTop: '16px' }}>
  <button
    type="button"
    onClick={() => {
      const confirmReset = window.confirm('This will clear all Blincyto Cycle information. Are you sure?');
      if (confirmReset) {
        setFormData(prev => ({
          ...prev,
          cycle: '',
          daysInCycle: '',
          pipsBagChanges: '',
          nursingVisitPlan: '',
          nursingVisitDay: '',
          hospStartDate: '',
          ourStartDate: '',
          hookupTime: '',
          isPreservativeFree: false
        }));
      }
    }}
    style={{
      backgroundColor: '#D9534F',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    }}
  >
    Reset Cycle Info
  </button>
</div>

        </>
      )}
    </form>
  );
}