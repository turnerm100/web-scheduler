import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import BagSchedule from './BagSchedule';
import PatientList from './PatientList';
import InactivePatients from './InactivePatients';
import AddPatient from './AddPatient';
import PrintSchedule from './PrintSchedule';
import AllPatients from './AllPatients';

import './BagSchedule.css';

function App() {
  const [view, setView] = useState('bagSchedule');
  const [showAddModal, setShowAddModal] = useState(false);

  const renderView = () => {
    if (view === 'inactive') return <InactivePatients />;
    if (view === 'bagSchedule') return <BagSchedule />;
    return <PatientList />;
  };

  const MainLayout = () => (
    <div>
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: '#215C98',
        color: 'white',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={`${process.env.PUBLIC_URL}/providencelogo.png`}
            alt="Providence Logo"
            style={{ height: '40px', marginRight: '15px' }}
          />
          <h1 style={{ margin: 0, lineHeight: 1.3, fontSize: '16px' }}>
            Providence Infusion and Pharmacy Services<br />
            Blincyto Tracking Tool
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="rounded-button" onClick={() => setView('bagSchedule')} style={{ marginRight: 10 }}>
            Bag Change Schedule
          </button>
          <button className="rounded-button" onClick={() => setView('active')} style={{ marginRight: 10 }}>
            Active Patients
          </button>
          <button className="rounded-button" onClick={() => setView('inactive')} style={{ marginRight: 10 }}>
            Inactive/On Hold Patients
          </button>
          <button className="rounded-button" onClick={() => setShowAddModal(true)} style={{ marginRight: 10 }}>
            Add Patient
          </button>
          <Link to="/all-patients" className="rounded-button" style={{ marginRight: 0 }}>
            View All Patients
          </Link>
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
          background: 'rgba(28, 66, 203, 0.63)',
          overflowY: 'auto',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingTop: '40px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            width: '90%',
            maxWidth: '800px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <AddPatient onClose={() => setShowAddModal(false)} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/print-schedule/:id" element={<PrintSchedule />} />
        <Route path="/all-patients" element={<AllPatients />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
