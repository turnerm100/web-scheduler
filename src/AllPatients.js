// src/AllPatients.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useNavigate } from 'react-router-dom';

export default function AllPatients() {
  const [patients, setPatients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllPatients();
  }, []);

  const fetchAllPatients = async () => {
    try {
      const [activeSnap, inactiveSnap] = await Promise.all([
        getDocs(collection(db, 'patients')),
        getDocs(collection(db, 'inactivePatients'))
      ]);

      const active = activeSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'patients' }));
      const inactive = inactiveSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'inactivePatients' }));

      setPatients([...active, ...inactive]);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const handleDelete = async (id, source, name) => {
    if (!window.confirm(`Permanently delete "${name}"?`)) return;

    try {
      await deleteDoc(doc(db, source, id));
      fetchAllPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  return (
    <div>
      {/* Header */}
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
          <button className="rounded-button" onClick={() => navigate('/?view=bagSchedule')} style={{ marginRight: 10 }}>
            Bag Change Schedule
          </button>
          <button className="rounded-button" onClick={() => navigate('/?view=active')} style={{ marginRight: 10 }}>
            Active Patients
          </button>
          <button className="rounded-button" onClick={() => navigate('/?view=inactive')} style={{ marginRight: 10 }}>
            Inactive Patients
          </button>
          <button className="rounded-button" onClick={() => navigate('/?view=add')} style={{ marginRight: 10 }}>
            Add Patient
          </button>
          <button className="rounded-button" disabled style={{
            backgroundColor: '#ffffff55',
            color: '#fff',
            cursor: 'default'
          }}>
            All Patients
          </button>
        </div>
      </nav>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        <h2>All Patients (Merged View)</h2>
        <p>Total patients found: <strong>{patients.length}</strong></p>
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>MRN</th>
              <th>Status</th>
              <th>Hospital</th>
              <th>From</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((pt, idx) => (
              <tr key={`${pt.source}_${pt.id}`}>
                <td>{pt.name || '(missing name)'}</td>
                <td>{pt.mrn || '-'}</td>
                <td>{pt.status || '-'}</td>
                <td>{pt.hospital || '-'}</td>
                <td>{pt.source}</td>
                <td>
                  <button
                    onClick={() => handleDelete(pt.id, pt.source, pt.name)}
                    style={{
                      backgroundColor: '#c62828',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
