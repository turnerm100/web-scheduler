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
        setTimeout(() => window.print(), 500);
      } else {
        alert('Patient not found.');
      }
    };
    fetchPatient();
  }, [id]);

  const parseDate = (str) => {
    if (!str) return null;
    const [year, month, day] = str.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return isNaN(parsed) ? null : parsed;
  };

  const formatDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const getVolumeAndRate = (duration) => {
    switch (duration) {
      case 1: return { volume: '240ml', rate: '10ml/hr' };
      case 2: return { volume: '240ml', rate: '5ml/hr' };
      case 3: return { volume: '130ml', rate: '1.8ml/hr' };
      case 4: return { volume: '173ml', rate: '1.8ml/hr' };
      case 7: return { volume: '101ml', rate: '0.6ml/hr' };
      default: return { volume: 'TBD', rate: 'TBD' };
    }
  };

  const generateSchedule = () => {
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

    for (let i = 0; i < 28 && remainingDays > 0; i++) {
      const override = parseInt(overrides[i]);
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
      const { volume, rate } = getVolumeAndRate(duration);

      schedule.push({
        label: `Bag ${i + 1}`,
        dateKey: formatDateKey(start),
        date: start,
        duration,
        volume,
        rate
      });

      current.setDate(current.getDate() + duration);
      remainingDays -= duration;
    }

    return schedule;
  };

  const buildCalendarGridForMonth = (year, month, dayMap) => {
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const startDay = firstOfMonth.getDay();
    const totalDays = lastOfMonth.getDate();
    const cells = [];

    for (let i = 0; i < startDay; i++) cells.push(<td key={`empty-${year}-${month}-${i}`}></td>);

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      const key = formatDateKey(date);
      const items = dayMap.get(key) || [];

      cells.push(
        <td
          key={key}
          style={{
            border: '1px solid #ccc',
            verticalAlign: 'top',
            padding: '6px',
            width: '14.28%',
            height: '120px',
            wordWrap: 'break-word',
            whiteSpace: 'normal',
            overflowWrap: 'break-word'
          }}
        >
          <strong>{d}</strong>
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                marginTop: '5px',
                background:
                  item.type === 'final-disconnect' ? '#d4edda' :
                  item.type === 'bag' ? '#eaf3fb' : 'transparent',
                border: item.type === 'final-disconnect' ? '1px solid #155724' :
                        item.type === 'bag' ? '1px solid #153D64' : 'none',
                borderRadius: '6px',
                padding: '5px',
                fontSize: '12px'
              }}
            >
              {item.type === 'final-disconnect' && (
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#155724', wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>
                  Final Disconnect – Blincyto Cycle Complete. A nures will be doing your final disconnect. 
                </div>
              )}
              {item.type === 'bag' && (
                <>
                  <strong>{item.label}</strong><br />
                  Duration: {item.duration} day(s)<br />
                  Volume: {item.volume}<br />
                  Rate: {item.rate}
                </>
              )}
            </div>
          ))}
        </td>
      );
    }

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(<tr key={`row-${year}-${month}-${i}`}>{cells.slice(i, i + 7)}</tr>);
    }

    return (
      <div style={{ pageBreakInside: 'avoid', overflow: 'visible', marginBottom: '40px' }} key={`${year}-${month}`}>
        <h3 style={{ marginBottom: '10px', textAlign: 'center' }}>
          {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            marginBottom: '20px'
          }}
        >
          <thead>
            <tr style={{ background: '#153D64', color: 'white' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <th key={day} style={{ padding: '8px', border: '1px solid #ccc' }}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  };

  if (!patient) return <div style={{ padding: '40px' }}>Loading...</div>;

  const schedule = generateSchedule();

  let disconnectDate = null;
  let disconnectDateKey = null;
  if (schedule.length > 0) {
    const lastBag = schedule[schedule.length - 1];
    disconnectDate = new Date(lastBag.date);
    disconnectDate.setDate(disconnectDate.getDate() + lastBag.duration);
    disconnectDateKey = formatDateKey(disconnectDate);
  }

  const dayMap = new Map();
  schedule.forEach(bag => {
    if (!dayMap.has(bag.dateKey)) dayMap.set(bag.dateKey, []);
    dayMap.get(bag.dateKey).push({ type: 'bag', ...bag });
  });
  if (disconnectDateKey) {
    if (!dayMap.has(disconnectDateKey)) dayMap.set(disconnectDateKey, []);
    dayMap.get(disconnectDateKey).push({ type: 'final-disconnect' });
  }

  const allDates = Array.from(dayMap.keys()).map(d => parseDate(d));
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));

  const monthGrids = [];
  let currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  while (currentMonth <= endMonth) {
    monthGrids.push(buildCalendarGridForMonth(currentMonth.getFullYear(), currentMonth.getMonth(), dayMap));
    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>Blincyto Calendar</h1>
      <h2 style={{ textAlign: 'center', marginTop: '0' }}>{patient.name}</h2>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '40px',
        marginBottom: '30px',
        fontSize: '14px'
      }}>
        <div><strong>Cycle Days:</strong> {patient.daysInCycle}</div>
        <div><strong>Start Date:</strong> {patient.ourStartDate}</div>
        <div><strong>Final Disconnect:</strong> {disconnectDateKey || '[not calculated]'}</div>
      </div>

      {monthGrids}

      <div style={{ fontSize: '14px', pageBreakBefore: 'always' }}>
        <h3 style={{ color: '#153D64' }}>Nursing Visit Information</h3>
        <p>
          {patient.pipsDoingBags?.toLowerCase() === 'yes' && (
            <>A Providence RN will change bags and perform labs/line care if ordered.</>
          )}
          {patient.pipsDoingBags?.toLowerCase() === 'no' &&
            patient.nursingVisitPlan?.toLowerCase().includes('rn to do lab') && (
              <>You will be doing your own bag changes but a Providence Infusion and Pharmacy RN will be visiting you once weekly and as needed for your central line dressing change or port reaccess and lab draw (if ordered). Your scheduled RN visit day is <strong>{patient.nursingVisitDay || '[not provided]'}</strong>.</>
          )}
          {patient.pipsDoingBags?.toLowerCase() === 'no' &&
            patient.nursingVisitPlan?.toLowerCase().includes('lab/drsg done at hospital') && (
              <>Bag changes by pt/cg. Labs and dressing care are at clinic/provider office.</>
          )}
        </p>
      </div>

      <style>{`
        @media print {
          @page {
            size: landscape;
          }
          * { visibility: visible !important; }
          button, nav, .no-print { display: none !important; }
          body { background: white; }
          td, tr, table, div, h1, h2, h3, p {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
