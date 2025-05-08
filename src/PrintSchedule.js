// src/PrintSchedule.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function PrintSchedule() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    const fetchPatient = async () => {
      const docRef = doc(db, 'patients', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPatient({ id, ...docSnap.data() });
        setTimeout(() => window.print(), 500); // Auto-trigger print dialog
      } else {
        alert('Patient not found.');
      }
    };
    fetchPatient();
  }, [id]);

  const parseDate = (str) => {
    if (!str) return new Date();
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => {
    if (!(date instanceof Date)) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getBagSchedule = () => {
    const totalDays = parseInt(patient.daysInCycle, 10);
    const startDate = parseDate(patient.ourStartDate);
    const hospitalDate = parseDate(patient.hospStartDate);
    let daysPassed = Math.floor((startDate - hospitalDate) / (1000 * 60 * 60 * 24));
    daysPassed = Math.max(0, daysPassed);
    const remaining = totalDays - daysPassed;

    const overrides = patient.bagOverrides || [];
    const schedule = [];

    let current = new Date(startDate);
    let remainingDays = remaining;

    for (let i = 0; i < 8 && remainingDays > 0; i++) {
      const override = overrides[i];
      let duration;

      if ([1, 2, 3, 4, 7].includes(override)) {
        duration = override;
      } else {
        if (remainingDays <= 4) duration = remainingDays;
        else if (remainingDays === 5) duration = 2;
        else if (remainingDays === 6) duration = 3;
        else if (remainingDays % 7 === 0) duration = 7;
        else {
          const mod = remainingDays % 7;
          duration = mod <= 4 ? mod : mod === 5 ? 2 : 3;
        }
      }

      const start = new Date(current);
      const end = new Date(current);
      end.setDate(end.getDate() + duration);

      schedule.push({
        label: `Bag ${i + 1}`,
        start: formatDate(start),
        end: formatDate(end),
        duration
      });

      current = new Date(end);
      remainingDays -= duration;
    }

    return schedule;
  };

  if (!patient) return <div style={{ padding: '40px' }}>Loading...</div>;

  // Optional debug log
  console.log('Raw patient:', patient);

  const schedule = getBagSchedule();

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>Blincyto Bag Change Calendar</h1>
      <h2 style={{ textAlign: 'center', marginTop: '0' }}>{patient.name}</h2>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '40px',
        marginBottom: '30px',
        fontSize: '14px'
      }}>
        <div><strong>Cycle Days:</strong> {patient.daysInCycle}</div>
        <div><strong>Blincyto Start Date:</strong> {formatDate(parseDate(patient.hospStartDate))}</div>
        <div><strong>PIPS Start Date:</strong> {formatDate(parseDate(patient.ourStartDate))}</div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '20px',
        pageBreakInside: 'avoid'
      }}>
        {schedule.map((bag, idx) => (
          <div key={idx} style={{
            border: '2px solid #153D64',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#f4faff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            pageBreakInside: 'avoid'
          }}>
            <h3 style={{ marginTop: 0, color: '#153D64' }}>{bag.label}</h3>
            <p><strong>Start:</strong> {bag.start}</p>
            <p><strong>End:</strong> {bag.end}</p>
            <p><strong>Duration:</strong> {bag.duration} days</p>
          </div>
        ))}
      </div>

      {/* Nursing Visit Information */}
      <div style={{ marginTop: '40px', fontSize: '14px' }}>
        <h3 style={{ color: '#153D64' }}>Nursing Visit Information</h3>
        <p>
          {patient.pipsDoingBags?.toLowerCase() === 'yes' && (
            <>
              A Providence Infusion and Pharmacy Nurse will perform a central line dressing change or port reaccess and lab draw (if ordered) at time of bag changes when indicated.
            </>
          )}

          {patient.pipsDoingBags?.toLowerCase() === 'no' &&
            patient.nursingVisitPlan?.toLowerCase().includes('rn to do lab') && (
              <>
                You will be doing your own bag changes but a Providence Infusion and Pharmacy RN will be visiting you once weekly and as needed for your central line dressing change or port reaccess and lab draw (if ordered). Your scheduled RN visit day is <strong>{patient.nursingVisitDay || patient.rnVisitDay || '[not provided]'}</strong>.
              </>
            )}

          {patient.pipsDoingBags?.toLowerCase() === 'no' &&
            patient.nursingVisitPlan?.toLowerCase().includes('lab/drsg done at hospital') && (
              <>
                You will be doing your own Blincyto bag changes and your weekly central line dressing change or port reaccess and labs (if ordered) have been arranged to be completed with your ordering provider. Please contact your provider for information on scheduled dressing change date.
              </>
            )}
        </p>
      </div>

      <style>{`
        @media print {
          button, nav, .no-print { display: none !important; }
          body { background: white; }
          div { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
