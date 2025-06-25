import { HashRouter, Routes, Route } from 'react-router-dom';
import BagSchedule from './BagSchedule';
import PatientList from './PatientList';
import InactivePatients from './InactivePatients';
import AddPatient from './AddPatient';
import PrintSchedule from './PrintSchedule';
import Login from './Login';
import PrivateRoute from './PrivateRoute';
import AdminDashboard from './AdminDashboard';
import MainLayout from './MainLayout';
import { BagSettingsProvider } from './contexts/BagSettingsContext';
import './BagSchedule.css';

function App() {
  return (
    <BagSettingsProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<Login isAdminModeProp={true} />} />
          {/* Use MainLayout as a wrapper for the main app routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<BagSchedule />} />
            <Route path="bag-schedule" element={<BagSchedule />} />
            <Route path="active" element={<PatientList />} />
            <Route path="inactive" element={<InactivePatients />} />
          </Route>
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="/print-schedule/:id" element={<PrivateRoute><PrintSchedule /></PrivateRoute>} />
        </Routes>
      </HashRouter>
    </BagSettingsProvider>
  );
}

export default App;
