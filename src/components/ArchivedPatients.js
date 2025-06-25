// src/components/ArchivedPatients.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function ArchivedPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const col = collection(db, 'discharged_archive');
      const snap = await getDocs(col);
      setPatients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    })();
  }, []);

  // Helper to format Firestore Timestamp or Date string
  function renderDate(val) {
    if (!val) return '';
    if (val.toDate) return val.toDate().toLocaleString();
    if (typeof val === 'string' || typeof val === 'number') {
      // Try new Date for string or number
      const d = new Date(val);
      if (!isNaN(d)) return d.toLocaleString();
    }
    return '';
  }

  if (loading) return <p>Loading archived patients...</p>;
  if (patients.length === 0) return <p>No archived (discharged) patients.</p>;

  return (
    <div>
      <h3 style={{ fontSize: 20, margin: '22px 0 16px 0' }}>Archived (Discharged) Patients</h3>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '15px',
        minWidth: 800,
        background: 'white'
      }}>
        <thead>
          <tr style={{ background: '#f2f2f2' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>MRN</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Archived At</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(pt => (
            <tr key={pt.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: 8 }}>{pt.name || pt.patientName || pt.id}</td>
              <td style={{ padding: 8 }}>{pt.mrn || pt.MRN || ''}</td>
              <td style={{ padding: 8 }}>{pt.status || 'Discharged'}</td>
              <td style={{ padding: 8 }}>{renderDate(pt.archivedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
