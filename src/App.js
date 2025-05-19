import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import BagSchedule from './BagSchedule';
import PatientList from './PatientList';
import InactivePatients from './InactivePatients';
import AddPatient from './AddPatient';
import PrintSchedule from './PrintSchedule';
import AllPatients from './AllPatients';
import Login from './Login';
import PrivateRoute from './PrivateRoute';
import AdminDashboard from './AdminDashboard';
import MainLayout from './MainLayout'; // ✅ New

import './BagSchedule.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<Login isAdminModeProp={true} />} />
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/print-schedule/:id" element={<PrivateRoute><PrintSchedule /></PrivateRoute>} />
        <Route path="/all-patients" element={<PrivateRoute><AllPatients /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
