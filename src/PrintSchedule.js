// src/PrintSchedule.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthProvider';

// ----- Utility: Nurse Visit Info Statement -----
function getNurseVisitStatement(bagChangeBy, centralLineCareBy, labsManagedBy, nursingVisitDay) {
  const key =
    `${bagChangeBy === 'Providence Infusion' ? 'PI' : 'CG'},` +
    `${centralLineCareBy === 'Providence Infusion' ? 'PI' : 'H/C'},` +
    `${labsManagedBy === 'Providence Infusion'
      ? 'PI'
      : labsManagedBy === 'Not ordered'
        ? 'N/O'
        : 'H/C'
    }`;

  const statements = {
    'PI,PI,PI': `Providence Infusion will be managing all Blincyto bag changes, central line care, and lab draws.
An RN will schedule visits to see you based on your bag change schedule and MD-ordered lab draw dates.
Please contact Providence Infusion with any questions or concerns.`,

    'PI,PI,H/C': `Providence Infusion will be managing your Blincyto bag changes and central line care.
An RN will schedule visits to see you based on your bag change schedule.
You will have your labs drawn at your hospital/clinic, with visits arranged by your doctor’s care team.
Please contact Providence Infusion with any questions or concerns.`,

    'PI,PI,N/O': `Providence Infusion will be managing your Blincyto bag changes and central line care.
An RN will schedule visits to see you based on your bag change schedule.
Currently, there are no orders for lab draws. If this changes, your doctor’s care team or Providence Infusion will notify you of any future visits needed.
Please contact Providence Infusion with any questions or concerns.`,

    'PI,H/C,PI': `Providence Infusion will be managing your Blincyto bag changes and lab draws.
An RN will schedule visits to see you based on your bag change schedule.
Your central line care will be managed at your hospital/clinic, with visit days arranged by your doctor’s care team.
Please contact Providence Infusion with any questions or concerns.`,

    'PI,H/C,H/C': `Providence Infusion will be managing your Blincyto bag changes.
An RN will schedule visits to see you based on your bag change schedule.
Your central line care and lab draws will be managed at your hospital/clinic. These visits will be arranged by your doctor’s care team.
Please contact Providence Infusion with any questions or concerns.`,

    'PI,H/C,N/O': `Providence Infusion will be managing your Blincyto bag changes.
An RN will schedule visits to see you based on your bag change schedule.
Your central line care will be managed at your hospital/clinic, with visits arranged by your doctor’s care team.
Currently, there are no orders for lab draws. Providence Infusion or your doctor’s care team will notify you if this changes.
Please contact Providence Infusion with any questions or concerns.`,

    'CG,PI,PI': [
      `You or your caregiver will be managing your Blincyto bag changes. You have been provided with instructions on how to manage this process.
Providence Infusion will be managing your central line care and lab draws.
An RN will see you on `,
      ` each week and will contact you the day before to confirm your visit time.
Please contact Providence Infusion with any questions or concerns.`
    ],

    'CG,PI,H/C': [
      `You or your caregiver will be managing your Blincyto bag changes. You have been provided with instructions on how to manage this process.
Providence Infusion will be managing your central line care.
An RN will see you on `,
      ` each week and will contact you the day before to confirm your visit time.
Your labs will be drawn at your hospital/clinic, with visits arranged by your doctor’s care team.
Please contact Providence Infusion with any questions or concerns.`
    ],

    'CG,PI,N/O': [
      `You or your caregiver will be managing your Blincyto bag changes. You have been provided with instructions on how to manage this process.
Providence Infusion will be managing your central line care.
An RN will see you on `,
      ` each week and will contact you the day before to confirm your visit time.
Currently, there are no orders for lab draws. Providence Infusion or your doctor’s care team will notify you if this changes.
Please contact Providence Infusion with any questions or concerns.`
    ],

    'CG,H/C,PI': [
      `You or your caregiver will be managing your Blincyto bag changes. You have been provided with instructions on how to manage this process.
Your central line care will be managed at your hospital/clinic, with visits arranged by your doctor’s care team.
Providence Infusion will be managing your lab draws.
An RN will see you on `,
      ` each week and will contact you the day before to confirm your visit time.
Please contact Providence Infusion with any questions or concerns.`
    ],

    'CG,H/C,H/C': `You or your caregiver will be managing your Blincyto bag changes. You have been provided with instructions on how to manage this process.
Your central line care and lab draws will be managed at your hospital/clinic. These visits will be arranged by your doctor’s care team.
Please contact Providence Infusion with any questions or concerns.`,

    'CG,H/C,N/O': [
      `You or your caregiver will be managing your Blincyto bag changes. You have been provided with instructions on how to manage this process.
Your central line care will be managed at your hospital/clinic, with visits arranged by your doctor’s care team.
Currently, there are no orders for lab draws. Providence Infusion or your doctor’s care team will notify you if this changes.
An RN will see you on `,
      ` each week and will contact you the day before to confirm your visit time.
Please contact Providence Infusion with any questions or concerns.`
    ]
  };

  const statement = statements[key];
  if (Array.isArray(statement)) {
    return (
      <span>
        {statement[0]}
        <strong>{nursingVisitDay || '[insert RN Visit Day]'}</strong>
        {statement[1]}
      </span>
    );
  }
  return statement;
}

// --------- Main Component ---------
export default function PrintSchedule() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const { user, authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchPatient = async () => {
      const docRef = doc(db, 'patients', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setPatient({ id, ...docSnap.data() });
      else alert('Patient not found.');
    };
    fetchPatient();
  }, [authLoading, user, id]);

  if (authLoading) return <div style={{ padding: '40px' }}>Loading...</div>;
  if (!user) return <div style={{ padding: '40px' }}>Please sign in to view schedule.</div>;
  if (!patient) return <div style={{ padding: '40px' }}>Loading...</div>;

  // ---- Utilities ----
  const parseDate = (str) => {
    if (!str) return null;
    const [year, month, day] = str.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return isNaN(d) ? null : d;
  };

  const formatDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  // -------- Bag Schedule Logic --------
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
      } else if (patient.isPreservativeFree) {
        if (remainingDays === 1) duration = 1;
        else if (remainingDays === 2) duration = 2;
        else if (remainingDays > 2) duration = 2;
        else duration = 1;
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

      schedule.push({
        label: `Bag ${i + 1}`,
        dateKey: formatDateKey(start),
        date: start,
        duration,
        bagIndex: i
      });

      current.setDate(current.getDate() + duration);
      remainingDays -= duration;
    }

    return schedule;
  };

  // -------- Calendar Grid for Month --------
  const buildCalendarGridForMonth = (year, month, dayMap, rnVisits = []) => (
    <div
      className="calendar-month"
      key={`${year}-${month}`}
      style={{
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        overflow: 'visible',
        marginBottom: '40px'
      }}
    >
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
        <tbody>
          {
            (() => {
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
                            item.type === 'final-disconnect' ? '#f8d7da' :
                            item.type === 'bag' && item.isReprogram ? '#d4edda' :
                            item.type === 'bag' ? '#eaf3fb' : 'transparent',
                          border:
                            item.type === 'final-disconnect' ? '1px solid #721c24' :
                            item.type === 'bag' && item.isReprogram ? '1px solid #155724' :
                            item.type === 'bag' ? '1px solid #153D64' : 'none',
                          borderRadius: '6px',
                          padding: '5px',
                          fontSize: '12px'
                        }}
                      >
                        {item.type === 'final-disconnect' && (
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#721c24' }}>
                            Final Disconnect – Your blincyto Cycle will be completed on this date. A nurse will be doing your final disconnect. You should receive a call the day before to schedule the appropriate time for this visit.
                          </div>
                        )}
                        {item.type === 'bag' && (
                          <>
                            <strong>{item.label}</strong><br />
                            Duration: {item.duration} day(s)<br />
                            {patient.bagChangeBy === "Providence Infusion" ? (
                              <span style={{ color: '#215C98', fontWeight: 600 }}>
                                A nurse will make a visit to do the bag change.<br />
                                You will receive a call the day before to schedule your visit time.
                              </span>
                            ) : (
                              <span style={{ color: '#215C98', fontWeight: 600 }}>
                                Bag change is due on this date.
                              </span>
                            )}
                            {item.isReprogram && (
                              <div style={{ color: 'green', fontWeight: 'bold', marginTop: '4px' }}>
                                Pump reprogram needed
                              </div>
                            )}
                            {item.requiresRNVisit && (
                              <div style={{ color: '#c0392b', fontWeight: 'bold', marginTop: '4px' }}>
                                RN visit required for this bag change.
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </td>
                );
              }

              // Add rows of 7 cells (week by week)
              const rows = [];
              for (let i = 0; i < cells.length; i += 7) {
                rows.push(<tr key={`row-${year}-${month}-${i}`}>{cells.slice(i, i + 7)}</tr>);
              }
              return rows;
            })()
          }
        </tbody>
      </table>
    </div>
  );

  // ----- Build Full Calendar -----
  const schedule = generateSchedule();
  const rnVisits = patient.rnVisits || [];
  let disconnectDate = null;
  let disconnectDateKey = null;

  if (schedule.length > 0) {
    const lastBag = schedule[schedule.length - 1];
    disconnectDate = new Date(lastBag.date);
    disconnectDate.setDate(disconnectDate.getDate() + lastBag.duration);
    disconnectDateKey = formatDateKey(disconnectDate);
  }

  // Map day -> bag(s) for calendar
  const dayMap = new Map();

  schedule.forEach((bag, i) => {
    if (!dayMap.has(bag.dateKey)) dayMap.set(bag.dateKey, []);
    const prev = i > 0 ? schedule[i - 1] : null;
    const isReprogram = prev && bag.duration !== prev.duration;
    const requiresRNVisit =
      (Array.isArray(rnVisits) && rnVisits[i]) ||
      (prev && bag.duration < prev.duration);
    dayMap.get(bag.dateKey).push({
      type: 'bag',
      ...bag,
      isReprogram,
      requiresRNVisit
    });
  });

  if (disconnectDateKey) {
    if (!dayMap.has(disconnectDateKey)) dayMap.set(disconnectDateKey, []);
    dayMap.get(disconnectDateKey).push({ type: 'final-disconnect' });
  }

  // Find calendar bounds
  const allDates = Array.from(dayMap.keys()).map(d => parseDate(d));
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const monthGrids = [];
  let currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  let monthIdx = 0;

  while (currentMonth <= endMonth) {
    if (monthIdx > 0) {
      monthGrids.push(<div key={`break-${monthIdx}`} className="page-break" />);
    }
    monthGrids.push(
      buildCalendarGridForMonth(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        dayMap,
        rnVisits
      )
    );
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    monthIdx++;
  }

  // ----- RENDER -----
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#153D64',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Print Schedule
        </button>
        <span
          style={{
            background: '#f5f5fa',
            border: '1px solid #bfc5d0',
            color: '#153D64',
            padding: '9px 16px',
            borderRadius: '6px',
            fontSize: '15px',
            maxWidth: '380px'
          }}
        >
          <strong>Tip:</strong> For a printable PDF file that can be shared with other caregivers, use your browser's <b>Print</b> dialog and select <b>Save as PDF</b>.
        </span>
      </div>

      {/* -- PRINTABLE CONTENT -- */}
      <div id="print-root">
        {/* Patient Header */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h1 style={{
            fontSize: '2.3rem',
            fontWeight: 700,
            margin: 0,
            color: '#153D64',
            letterSpacing: '0.02em'
          }}>
            {patient.name}
          </h1>
          {patient.dob && (
            <div style={{
              fontSize: '1.1rem',
              color: '#444',
              margin: '5px 0 0 0'
            }}>
              DOB: {patient.dob}
            </div>
          )}
          <h2 style={{
            margin: '15px 0 0 0',
            fontWeight: 600,
            color: '#153D64',
            fontSize: '1.5rem'
          }}>
            Blincyto Calendar
          </h2>
        </div>

        {/* Summary Bar */}
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

        {/* Nursing Visit Info */}
        <div style={{ fontSize: '14px', marginBottom: '40px' }}>
          <h3 style={{ color: '#153D64' }}>Nursing Visit Information</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>
            {getNurseVisitStatement(
              patient.bagChangeBy,
              patient.centralLineCareBy,
              patient.labsManagedBy,
              patient.nursingVisitDay
            )}
          </p>
        </div>

        {/* Calendar Grids */}
        {monthGrids}
      </div>

<style>{`
  @media print {
    html, body {
      font-size: 14px !important;
      margin: 0 !important;
      padding: 0 !important;
      color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background: white !important;
    }
    #print-root {
      max-width: 1200px !important;
      margin: 0 auto !important;
      font-size: 14px !important;
      padding: 10px !important;
    }
    .calendar-month {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-bottom: 40px !important;
    }
    h1, h2, h3 {
      font-size: 1.3em !important;
      margin: 0 0 0.2em 0 !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      color: #153D64 !important;
    }
    table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      background: white !important;
      font-size: 13px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    th {
      background: #153D64 !important;
      color: white !important;
      font-weight: bold !important;
      font-size: 16px !important;
      height: 36px !important;        /* <-- shorter header row! */
      padding: 5px !important;
      vertical-align: middle !important;
    }
    td {
      border: 1px solid #bfc7d3 !important;
      padding: 8px !important;
      font-size: 13px !important;
      vertical-align: top !important;
      background: white !important;
      height: 68px !important;         /* regular days stay tall */
    }
    .calendar-card {
      border-radius: 8px !important;
      border: 1.5px solid #153D64 !important;
      background: #eaf3fb !important;
      padding: 5px 7px !important;
      margin-top: 6px !important;
      font-size: 12.5px !important;
      color: #153D64 !important;
    }
    .calendar-card.reprogram {
      border-color: #228b22 !important;
      background: #d4edda !important;
      color: #155724 !important;
      font-weight: bold !important;
    }
    .calendar-card.disconnect {
      border-color: #721c24 !important;
      background: #f8d7da !important;
      color: #721c24 !important;
      font-weight: bold !important;
    }
    .no-print {
      display: none !important;
    }
    .page-break {
      display: block;
      page-break-before: always !important;
      break-before: page !important;
      height: 0 !important;
    }
  }
`}</style>

    </div>
  );
}
