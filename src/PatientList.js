import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import AddPatient from './AddPatient';
import { useAuth } from './AuthProvider';
import { logAuditEvent } from './utils/logAuditEvent'; // <-- NEW

export default function PatientList() {
  const { user, authLoading } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    const unsub = onSnapshot(collection(db, 'patients'), (snapshot) => {
      const active = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.status === 'Active' || p.status === 'Pending')
        .sort((a, b) => a.name.localeCompare(b.name));
      setPatients(active);
    });
    return () => unsub();
  }, [authLoading, user]);

  if (authLoading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in to view patients.</div>;

  const handleEdit = (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
  };

  const handleStatusChange = async (patient, newStatus) => {
    if (newStatus === patient.status) return;

    const confirmed = window.confirm(
      'Would you like to change the status of this patient?\n\nChanging a patient\'s status to On Hold or Discharged will move their profile to the Inactive Patients page. Their Blincyto cycle, if current, will no longer be viewable.'
    );

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'patients', patient.id), { status: newStatus });

      // AUDIT LOG for status change
      await logAuditEvent(
        user,
        'UPDATE_STATUS',
        'Patient',
        patient.id,
        `Changed status for ${patient.name} (MRN: ${patient.mrn}) from "${patient.status}" to "${newStatus}"`
      );
    } catch (err) {
      alert('Error updating patient status.');
      console.error(err);
    }
  };

  const getDisconnectDate = (startDateStr, days) => {
    if (!startDateStr || !days) return '';
    const startDate = new Date(startDateStr);
    if (isNaN(startDate)) return '';
    const disconnectDate = new Date(startDate);
    disconnectDate.setDate(startDate.getDate() + Number(days));
    return disconnectDate.toLocaleDateString(); // Format: MM/DD/YYYY
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Active & Pending Patients</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>MRN</th>
            <th>DOB</th>
            <th>Status</th>
            <th>Hospital</th>
            <th>Type</th>
            <th>Pharm Team</th>
            <th>Nurse Team</th>
            <th>Interpreter</th>
            <th>Blincyto Start Date</th>
            <th>PIPS Start Date</th>
            <th>Disconnect Date</th>
          </tr>
        </thead>
        <tbody>
          {patients.map(p => (
            <tr key={p.id}>
              <td>
                <button
                  onClick={() => handleEdit(p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'blue',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  {p.name}
                </button>
              </td>
              <td>{p.mrn}</td>
              <td>{p.dob}</td>
              <td>
                <select
                  value={p.status}
                  onChange={(e) => handleStatusChange(p, e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Discharged">Discharged</option>
                </select>
              </td>
              <td>{p.hospital}</td>
              <td>{p.type}</td>
              <td>{p.pharmTeam}</td>
              <td>{p.nurseTeam}</td>
              <td>{p.interpreter}</td>
              <td>{p.hospStartDate}</td>
              <td>{p.ourStartDate}</td>
              <td>{getDisconnectDate(p.ourStartDate, p.daysInCycle)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
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
            <AddPatient key={selectedPatient?.id || 'new'} editData={selectedPatient} onClose={handleCloseModal} />
          </div>
        </div>
      )}
    </div>
  );
}
