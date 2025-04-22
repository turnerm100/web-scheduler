// src/App.js
import React, { useState } from 'react';
import PatientList from './PatientList';
import InactivePatients from './InactivePatients';
import AddPatient from './AddPatient';
import BagSchedule from './BagSchedule';

function App() {
  const [view, setView] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);

  const renderView = () => {
    if (view === 'inactive') return <InactivePatients onAddPatientClick={() => setShowAddModal(true)} />;
    if (view === 'bags') return <BagSchedule />;
    return <PatientList onAddPatientClick={() => setShowAddModal(true)} />;
  };

  return (
    <div>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#153D64', color: 'white' }}>
        <h1 style={{ margin: 0 }}>Blincyto Tracking Tool</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setView('active')}>Active Patients</button>
          <button onClick={() => setView('inactive')}>Inactive Patients</button>
          <button onClick={() => setShowAddModal(true)}>Add Patient</button>
          <button onClick={() => setView('bags')}>Bag Schedule</button>
        </div>
      </nav>
      <div style={{ padding: 20 }}>
        {renderView()}
      </div>
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ background: 'white', margin: '5% auto', padding: 20, width: '90%', maxWidth: 800 }}>
            <button onClick={() => setShowAddModal(false)} style={{ float: 'right' }}>Cancel</button>
            <AddPatient onClose={() => setShowAddModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;