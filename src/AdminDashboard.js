// src/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const auth = getAuth();

export default function AdminDashboard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [enable5DayBags, setEnable5DayBags] = useState(false);
  const [enable6DayBags, setEnable6DayBags] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);

  const projectRegion = 'us-central1';
  const projectId = 'blincyto-tracking-tool';
  const apiBase = `https://${projectRegion}-${projectId}.cloudfunctions.net/api`;

  const navigate = useNavigate();

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().isAdmin === true) {
          setCurrentUser(user);
          setIsAdmin(true);
          fetchUsers(user);
          loadSettings();
        } else {
          setError('❌ You do not have permission to access the admin dashboard.');
          navigate('/');
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Error verifying user access.');
        navigate('/');
      }
    } else {
      setError('You must be signed in to access the admin dashboard.');
      navigate('/login');
    }
  });

  return () => unsubscribe();
}, [navigate]);


  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setEnable5DayBags(!!data.enable5DayBags);
        setEnable6DayBags(!!data.enable6DayBags);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        enable5DayBags,
        enable6DayBags
      });
      alert('✅ Settings saved.');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('❌ Failed to save settings.');
    }
  };

  const fetchUsers = async (user) => {
    try {
      console.log('[fetchUsers] Fetching user list...');

      const token = await user.getIdToken();
      const response = await fetch(`${apiBase}/getUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: {} })
      });

      const res = await response.json();
      console.log('[fetchUsers] API response:', res);

      const authUsers = res?.data?.users || [];

      const mergedUsers = await Promise.all(
        authUsers.map(async (u) => {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            console.warn(`⚠️ No Firestore user doc found for UID: ${u.uid}`);
          }
          const isAdmin = docSnap.exists() ? docSnap.data().isAdmin || false : false;
          return { ...u, isAdmin };
        })
      );

      setUsers(mergedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load user list.');
    }
  };

  const handleCreateUser = async () => {
    setResult('');
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      setError('A user with this email already exists.');
      setLoading(false);
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${apiBase}/createUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { email, password } })
      });

      const res = await response.json();

      if (res.data?.uid && res.data?.email) {
        await setDoc(doc(db, 'users', res.data.uid), {
          email: res.data.email,
          isAdmin: isAdmin,
          createdAt: new Date()
        });

        setResult(`✅ User created: ${res.data.email}`);
        setEmail('');
        setPassword('');
        setIsAdmin(false);
        fetchUsers(currentUser);
      } else {
        setError(res.error || 'Error creating user.');
      }
    } catch (err) {
      console.error(err);
      setError('Error creating user.');
    }

    setLoading(false);
  };

const handleToggleAdmin = async (uid, email, currentValue) => {
  // If revoking admin, ensure it's not the last admin
  if (currentValue) {
    const currentAdmins = users.filter(u => u.isAdmin && u.uid !== uid);
    if (currentAdmins.length === 0) {
      alert(`❌ You cannot remove admin privileges from "${email}" because they are the last admin.`);
      return;
    }
  }

  const confirmed = window.confirm(
    `Are you sure you want to ${currentValue ? 'revoke' : 'grant'} admin privileges for "${email}"?`
  );
  if (!confirmed) return;

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: email,
        isAdmin: !currentValue,
        createdAt: new Date()
      });
    } else {
      await setDoc(userRef, {
        isAdmin: !currentValue
      }, { merge: true });
    }
    alert(`✅ Admin privileges ${!currentValue ? 'granted' : 'revoked'} for "${email}".`);
    fetchUsers(currentUser);
  } catch (err) {
    console.error(err);
    alert(`❌ Failed to update admin status for "${email}".`);
  }
};

  const handleToggleStatus = async (uid, disabled, email) => {
    const action = disabled ? 'reactivate' : 'deactivate';
    const confirmed = window.confirm(`⚠️ Are you sure you want to ${action} the user "${email}"?`);
    if (!confirmed) return;

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${apiBase}/setUserStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { uid, disabled: !disabled } })
      });

      const res = await response.json();
      if (res.data?.success) {
        alert(`✅ User "${email}" has been ${action}d.`);
        fetchUsers(currentUser);
      } else {
        alert(`❌ Failed to ${action} user: ${res.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating the user status.');
    }
  };

  const handleDeleteUser = async (uid, email) => {
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to permanently delete the account for "${email}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`${apiBase}/deleteUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: { uid } })
      });

      const res = await response.json();

      if (res.data?.success) {
        alert(`✅ User "${email}" deleted successfully.`);
        fetchUsers(currentUser);
      } else {
        alert(`❌ Failed to delete user: ${res.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting the user.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const goToMainApp = () => {
    navigate('/');
  };

  return (
    <div>
      {/* Top Navigation */}
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
            src={`${process.env.PUBLIC_URL}/ProvidenceLogo.png`}
            alt="Providence Logo"
            style={{ height: '40px', marginRight: '15px' }}
          />
          <h1 style={{ margin: 0, lineHeight: 1.3, fontSize: '16px' }}>
            Providence Infusion and Pharmacy Services<br />
            Blincyto Tracking Tool — Admin Dashboard
          </h1>
        </div>
        <div>
          <button className="rounded-button" onClick={goToMainApp} style={{ marginRight: 10 }}>
            Enter Blincyto Tool
          </button>
          <button className="rounded-button" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </nav>

<h2 style={{
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '20px 20px 10px 20px',
  color: '#153D64'
}}>
  Admin Settings & New Users
</h2>

{/* User Management Section */}
<div style={{ padding: 20 }}>
  <h2>
    <button onClick={() => setShowUserManagement(prev => !prev)}>
      {showUserManagement ? '🔽 Hide User Management' : '👥 Show User Management'}
    </button>
  </h2>

  {showUserManagement && (
    <div style={{ border: '1px solid #ccc', padding: 20, maxWidth: 800 }}>
      {/* Create New User */}
      <h3>➕ Create New User</h3>
      <input
        type="email"
        placeholder="New User Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />
      <input
        type="password"
        placeholder="New User Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />
      <label style={{ display: 'block', marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={isAdmin}
          onChange={() => setIsAdmin(prev => !prev)}
          style={{ marginRight: 6 }}
        />
        Give admin privileges
      </label>
      <button onClick={handleCreateUser} disabled={loading}>
        {loading ? 'Creating...' : 'Create Account'}
      </button>
      {result && <p style={{ color: 'green' }}>{result}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Current Users List */}
      <h3 style={{ marginTop: 40 }}>📋 Current Users</h3>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Email</th>
              <th>Status</th>
              <th>Admin Privileges</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid}>
                <td>{user.email}</td>
                <td>{user.disabled ? 'Inactive' : 'Active'}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={user.isAdmin || false}
                    onChange={() => handleToggleAdmin(user.uid, user.email, user.isAdmin)}
                  />
                </td>
                <td>
                  <button
                    onClick={() => handleToggleStatus(user.uid, user.disabled, user.email)}
                    style={{ marginRight: 5 }}
                  >
                    {user.disabled ? 'Activate' : 'Deactivate'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.uid, user.email)}
                    style={{ marginLeft: 5, color: 'red' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )}
</div>


      {/* Settings Tab */}
      <div style={{ padding: 20 }}>
        <h2>
          <button onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? '🔽 Hide Settings' : '⚙️ Show Settings'}
          </button>
        </h2>

        {showSettings && !settingsLoading && (
          <div style={{ border: '1px solid #ccc', padding: 20, maxWidth: 600 }}>
            <h3>Blincyto Bag Duration Settings</h3>
            <label>
              <input
                type="checkbox"
                checked={enable5DayBags}
                onChange={() => setEnable5DayBags(prev => !prev)}
              />
              Enable 5-Day Bag Duration
            </label>
            <br />
            <label>
              <input
                type="checkbox"
                checked={enable6DayBags}
                onChange={() => setEnable6DayBags(prev => !prev)}
              />
              Enable 6-Day Bag Duration
            </label>
            <br />
            <button onClick={saveSettings} style={{ marginTop: 10 }}>
              💾 Save Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
