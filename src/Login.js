// src/Login.js
import React, { useState, useEffect } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  // Your admin email — change this to match your Firebase admin account
const ADMIN_EMAIL = 'turnerm100@hotmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const handleLogin = async () => {
  setError('');

  if (!email || !password) {
    setError('Please enter both email and password.');
    return;
  }

  if (!isValidEmail(email)) {
    setError('Invalid email format.');
    return;
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // ✅ Force token refresh so Firebase sends email in auth context
    await result.user.getIdToken(true);

    if (isAdminMode) {
      if (email === ADMIN_EMAIL) {
        navigate('/admin');
      } else {
        setError('Access denied. This is not an admin account.');
        await signOut(auth);
      }
    } else {
      navigate('/');
    }
  } catch (err) {
    setError('Login failed. Check your credentials.');
  }
};

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: '100px auto' }}>
      {user ? (
        <>
          <h2>Welcome, {user.email}</h2>
          <button onClick={handleLogout}>Log Out</button>
        </>
      ) : (
        <>
          <h2>{isAdminMode ? 'Admin Login' : 'User Login'}</h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: 10 }}
          />

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <button onClick={handleLogin} style={{ marginBottom: 10 }}>
            Log In
          </button>

          <button
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setError('');
              setEmail('');
              setPassword('');
            }}
            style={{ display: 'block', width: '100%', marginTop: 10 }}
          >
            {isAdminMode ? 'Switch to User Login' : 'Admin Login'}
          </button>
        </>
      )}
    </div>
  );
}
