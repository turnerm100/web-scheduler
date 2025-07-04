// src/MainLayout.js
import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AddPatient from './AddPatient';
import BagSchedule from './BagSchedule';
import PatientList from './PatientList';
import InactivePatients from './InactivePatients';

export default function MainLayout() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { getAuth, signOut } = await import('firebase/auth');
    const auth = getAuth();
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const dropdownItem = {
    padding: '8px 12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  };

  return (
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
            src={`${process.env.PUBLIC_URL}/ProvidenceLogo.png`}
            alt="Providence Logo"
            style={{ height: '40px', marginRight: '15px' }}
          />
          <h1 style={{ margin: 0, lineHeight: 1.3, fontSize: '16px' }}>
            Providence Infusion and Pharmacy Services<br />
            Blincyto Tracking Tool
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button className="rounded-button" onClick={() => navigate('/bag-schedule')} style={{ marginRight: 10 }}>
            Bag Change Schedule
          </button>
          <button className="rounded-button" onClick={() => navigate('/active')} style={{ marginRight: 10 }}>
            Active Patients
          </button>
          <button className="rounded-button" onClick={() => navigate('/inactive')} style={{ marginRight: 10 }}>
            Inactive/On Hold Patients
          </button>
          <button className="rounded-button" onClick={() => setShowAddModal(true)} style={{ marginRight: 10 }}>
            Add Patient
          </button>
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button className="rounded-button">☰ Menu</button>
            {showDropdown && (
              <ul style={{
                position: 'absolute',
                right: 0,
                backgroundColor: 'white',
                listStyle: 'none',
                padding: '10px',
                margin: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                zIndex: 999,
                color: '#000'
              }}>
                <li style={dropdownItem} onClick={() => navigate('/admin-login')}>Admin Login</li>
                <li style={dropdownItem} onClick={handleLogout}>Logout</li>
              </ul>
            )}
          </div>
        </div>
      </nav>

      <div style={{ padding: 20 }}>
        <Routes>
          {/* Default: redirect root to /bag-schedule */}
          <Route path="/" element={<Navigate to="/bag-schedule" replace />} />
          <Route path="/bag-schedule" element={<BagSchedule />} />
          <Route path="/active" element={<PatientList />} />
          <Route path="/inactive" element={<InactivePatients />} />
        </Routes>
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
}
