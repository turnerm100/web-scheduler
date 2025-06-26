// src/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logAuditEvent } from './utils/logAuditEvent';
import ArchivedPatients from './components/ArchivedPatients';

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
  const [showArchived, setShowArchived] = useState(false);

  const projectRegion = 'us-central1';
  const projectId = 'blincyto-tracking-tool';
  const apiBase = `https://${projectRegion}-${projectId}.cloudfunctions.net/api`;

  // ...after all your useState calls
const [userMgmtKey, setUserMgmtKey] = useState(0);

useEffect(() => {
  if (showUserManagement) {
    setIsAdmin(false); // Always reset admin checkbox to unchecked
    setUserMgmtKey(prev => prev + 1); // Force remount of the section
  }
  // eslint-disable-next-line
}, [showUserManagement]);


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

    // 🔍 AUDIT LOG
    await logAuditEvent(
      currentUser,
      'UPDATE_SETTINGS',
      'Settings',
      'global',
      `Set 5-Day Bags: ${enable5DayBags}, 6-Day Bags: ${enable6DayBags}`
    );

    alert('✅ Settings saved.');
  } catch (err) {
    console.error('Error saving settings:', err);
    alert('❌ Failed to save settings.');
  }
};

  const fetchUsers = async (user) => {
    try {
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
      const authUsers = res?.data?.users || [];

      const mergedUsers = await Promise.all(
        authUsers.map(async (u) => {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
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

      // 🔍 AUDIT LOG
      await logAuditEvent(
        currentUser,
        'CREATE_USER',
        'User',
        res.data.uid,
        `Created user (${res.data.email}) with admin: ${isAdmin}`
      );

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

    // 🔍 AUDIT LOG
    await logAuditEvent(
      currentUser,
      'UPDATE_ADMIN_ROLE',
      'User',
      uid,
      `${!currentValue ? 'Granted' : 'Revoked'} admin privileges for ${email}`
    );

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
      // 🔍 AUDIT LOG
      await logAuditEvent(
        currentUser,
        'UPDATE_USER_STATUS',
        'User',
        uid,
        `${!disabled ? 'Deactivated' : 'Reactivated'} user (${email})`
      );

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
      // 🔍 AUDIT LOG
      await logAuditEvent(
        currentUser,
        'DELETE_USER',
        'User',
        uid,
        `Deleted user (${email})`
      );

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

  // --- Render ---
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

      {/* --- Section Tabs/Buttons --- */}
<div style={{ display: 'flex', gap: 12, margin: '24px 0 0 0', padding: '0 20px' }}>
  <button
    className="rounded-button"
    onClick={() => {
      setShowUserManagement(s => !s);
      setShowSettings(false);
      setShowArchived(false);
    }}
  >
    {showUserManagement ? '🔽 Hide User Management' : '👥 Show User Management'}
  </button>

  <button
    className="rounded-button"
    onClick={() => {
      setShowSettings(s => !s);
      setShowUserManagement(false);
      setShowArchived(false);
    }}
  >
    {showSettings ? '🔽 Hide Settings' : '⚙️ Show Settings'}
  </button>

  <button
    className="rounded-button"
    onClick={() => {
      setShowArchived(s => !s);
      setShowUserManagement(false);
      setShowSettings(false);
    }}
  >
    {showArchived ? '🔽 Hide Archived Patients' : '🗂️ Show Archived Patients'}
  </button>
</div>


      {/* --- User Management Section --- */}
{showUserManagement && (
  <div style={{ padding: 20 }} key={userMgmtKey}>
    <h2 style={{
      fontSize: '22px',
      fontWeight: 'bold',
      margin: '20px 0 10px 0',
      color: '#153D64'
    }}>
      Admin Settings & New Users
    </h2>
    {/* Create New User */}
    <h3>➕ Create New User</h3>

    <div style={{ marginBottom: 12 }}>
      <label htmlFor="new-user-email" style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>
        Email
      </label>
      <input
        id="new-user-email"
        type="email"
        placeholder="New User Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '450px', marginBottom: 0 }}
        autoComplete="off"
      />
    </div>

    <div style={{ marginBottom: 12 }}>
      <label htmlFor="new-user-password" style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>
        Password
      </label>
      <input
        id="new-user-password"
        type="password"
        placeholder="New User Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '450px', marginBottom: 0 }}
        autoComplete="new-password"
      />
    </div>

    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block' }}>
        <input
          type="checkbox"
          name="admin_privileges_do_not_autofill"
          autoComplete="off"
          checked={isAdmin}
          onChange={() => setIsAdmin(prev => !prev)}
          style={{ marginRight: 6 }}
        />
        Give admin privileges
      </label>
    </div>

    <button className="rounded-button" onClick={handleCreateUser} disabled={loading}>
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
<td style={{ whiteSpace: 'nowrap' }}>
  <button
    className="rounded-button"
    onClick={() => handleToggleStatus(user.uid, user.disabled, user.email)}
    style={{
      marginRight: 5,
      visibility: user.email === 'YOUR-ADMIN-EMAIL@EMAIL.COM' ? 'hidden' : 'visible', // Optionally hide for super admin
      width: 95, // or whatever fixed width works best for your text/buttons
      minWidth: 85 // make consistent width
    }}
    // Optionally, you can conditionally hide for your own admin, or just always render
  >
    {user.disabled ? 'Activate' : 'Deactivate'}
  </button>
  <button
    className="rounded-button"
    onClick={() => handleDeleteUser(user.uid, user.email)}
    style={{
      marginLeft: 5,
      backgroundColor: '#B00020',
      color: 'white',
      width: 75,
      minWidth: 70
    }}
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

      {/* --- Settings Section --- */}
      {showSettings && !settingsLoading && (
        <div style={{ padding: 20 }}>
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
          <button className="rounded-button" onClick={saveSettings} style={{ marginTop: 10 }}>
            💾 Save Settings
          </button>
        </div>
      )}

      {/* --- Archived Patients Section --- */}
      {showArchived && (
        <div style={{ padding: 20 }}>
          <ArchivedPatients />
        </div>
      )}
    </div>
  );
}
