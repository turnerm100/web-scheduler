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

  if (loading) return <p>Loading archived patients...</p>;
  if (patients.length === 0) return <p>No archived (discharged) patients.</p>;

  return (
    <div>
      <h3>Archived (Discharged) Patients</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>MRN</th>
            <th>Status</th>
            <th>Discharged Date</th>
            <th>Archived At</th>
            {/* Add more fields as needed */}
          </tr>
        </thead>
        <tbody>
          {patients.map(pt => (
            <tr key={pt.id}>
              <td>{pt.name || pt.patientName || pt.id}</td>
              <td>{pt.mrn || pt.MRN || ''}</td>
              <td>{pt.status}</td>
              <td>{pt.statusUpdatedAt?.toDate?.().toLocaleDateString?.() || ''}</td>
              <td>{pt.archivedAt?.toDate?.().toLocaleString?.() || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
