import React, { useState, useEffect } from 'react';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Login({ isAdminModeProp = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(isAdminModeProp);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setError('');
      if (currentUser && isAdminMode) {
        setCheckingAdmin(true);
        // Check if already admin, and auto-redirect
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().isAdmin === true) {
          navigate('/admin');
        }
        setCheckingAdmin(false);
      } else if (currentUser && !isAdminMode) {
        // Non-admin login: send to normal user page
        navigate('/');
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [auth, isAdminMode, navigate]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

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
      await result.user.getIdToken(true);

      if (isAdminMode) {
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().isAdmin === true) {
          navigate('/admin');
        } else {
          setError('Access denied. This account is not an admin.');
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

  const handleForgotPassword = () => {
    const emailPrompt = window.prompt('Please enter your email to reset your password:');

    if (!emailPrompt) return;

    if (!isValidEmail(emailPrompt)) {
      alert('Invalid email format.');
      return;
    }

    sendPasswordResetEmail(auth, emailPrompt)
      .then(() => {
        alert('A password reset email has been sent to your inbox.');
      })
      .catch((error) => {
        console.error('Error sending reset email:', error);
        alert('There was an issue sending the reset email. Please check the address and try again.');
      });
  };

  return (
    <>
      {/* ✅ Shared Header */}
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
            Blincyto Tracking Tool
          </h1>
        </div>

        <button
          style={{
            background: 'white',
            color: '#215C98',
            padding: '6px 12px',
            borderRadius: '5px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          onClick={() => {
            setIsAdminMode(!isAdminMode);
            setError('');
            setEmail('');
            setPassword('');
          }}
        >
          {isAdminMode ? 'Switch to User Login' : 'Admin Login'}
        </button>
      </nav>

      {/* ✅ Login Content */}
      <div style={{ padding: 20, maxWidth: 400, margin: '100px auto' }}>
        {user ? (
          <>
            <h2>Welcome, {user.email}</h2>
            <button onClick={handleLogout}>Log Out</button>
          </>
        ) : (
          <form onSubmit={handleLogin}>
            <h2>{isAdminMode ? 'Admin Login' : 'User Login'}</h2>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: 10 }}
              autoFocus
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ display: 'block', width: '100%', marginBottom: 10 }}
            />

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <button type="submit" style={{ marginBottom: 10 }}>
              {checkingAdmin ? 'Checking...' : 'Log In'}
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                display: 'block',
                width: '100%',
                marginTop: 10,
                background: 'none',
                border: 'none',
                color: '#007BFF',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              Forgot Password or Username?
            </button>
          </form>
        )}
      </div>
    </>
  );
}
