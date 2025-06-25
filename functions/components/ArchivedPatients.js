// src/components/ArchivedPatients.js
import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export default function ArchivedPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArchivedPatients = async () => {
      const db = getFirestore();
      const archiveCol = collection(db, 'discharged_archive');
      const snap = await getDocs(archiveCol);
      const items = [];
      snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      setPatients(items);
      setLoading(false);
    };
    fetchArchivedPatients();
  }, []);

  if (loading) return <div>Loading archived patients...</div>;
  if (patients.length === 0) return <div>No archived patients found.</div>;

  return (
    <div>
      <h2>Archived Patients</h2>
      <table>
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>MRN</th>
            <th>Status</th>
            <th>Archived At</th>
            {/* Add more columns as needed */}
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.id}>
              <td>{p.name || 'N/A'}</td>
              <td>{p.mrn || 'N/A'}</td>
              <td>{p.status || 'N/A'}</td>
              <td>{p.archivedAt ? new Date(p.archivedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
              {/* Add more columns as needed */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
