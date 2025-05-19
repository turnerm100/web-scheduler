// src/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

const auth = getAuth();

export default function AdminDashboard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const projectRegion = 'us-central1';
  const projectId = 'blincyto-tracking-tool';
  const apiBase = `https://${projectRegion}-${projectId}.cloudfunctions.net/api`;

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUsers(user);
      } else {
        setError('You must be signed in to access the admin dashboard.');
      }
    });
    return () => unsubscribe();
  }, []);

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
      setUsers(res.data?.users || []);
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
      if (res.data?.email) {
        setResult(`✅ User created: ${res.data.email}`);
        setEmail('');
        setPassword('');
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

  const handleToggleStatus = async (uid, disabled, email) => {
  const action = disabled ? 'reactivate' : 'deactivate';
  const confirmed = window.confirm(
    `⚠️ Are you sure you want to ${action} the user "${email}"?`
  );

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
            src={`${process.env.PUBLIC_URL}/providencelogo.png`}
            alt="Providence Logo"
            style={{ height: '40px', marginRight: '15px' }}
          />
          <h1 style={{ margin: 0, lineHeight: 1.3, fontSize: '16px' }}>
            Providence Infusion and Pharmacy Services<br />
            Blincyto Tracking Tool — Admin Dashboard
          </h1>
        </div>
        <div>
          <button
            className="rounded-button"
            onClick={goToMainApp}
            style={{ marginRight: 10 }}
          >
            Enter Blincyto Tool
          </button>
          <button
            className="rounded-button"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </nav>

      <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
        <h2>👨‍⚕️ Create New User</h2>
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
        <button onClick={handleCreateUser} disabled={loading}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>
        {result && <p style={{ color: 'green' }}>{result}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>

      <div style={{ padding: 20 }}>
        <h2>👥 Current Users</h2>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
  {users.map(user => (
    <tr key={user.uid}>
      <td>{user.email}</td>
      <td>{user.disabled ? 'Inactive' : 'Active'}</td>
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
    </div>
  );
}
