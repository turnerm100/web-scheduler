// src/App.js
import React, { useState } from 'react';
import PatientList from './PatientList';
import InactivePatients from './InactivePatients';
import AddPatient from './AddPatient';

function App() {
  const [view, setView] = useState('active');
  const [showAddModal, setShowAddModal] = useState(false);

  const renderView = () => {
    if (view === 'inactive') return <InactivePatients />;
    return <PatientList />;
  };

  return (
    <div>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#153D64', color: 'white' }}>
        <h1 style={{ margin: 0 }}>Blincyto Tracking Tool</h1>
        <div>
          <button onClick={() => setView('active')} style={{ marginRight: 10 }}>Active Patients</button>
          <button onClick={() => setView('inactive')} style={{ marginRight: 10 }}>Inactive Patients</button>
          <button onClick={() => setShowAddModal(true)}>Add Patient</button>
        </div>
      </nav>

      <div style={{ padding: 20 }}>
        {renderView()}
      </div>

      {showAddModal && (
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
            <button onClick={() => setShowAddModal(false)} style={{ float: 'right' }}>Cancel</button>
            <AddPatient onClose={() => setShowAddModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
