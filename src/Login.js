// Login.js
return (
    <div style={{ padding: 20 }}>
      {user ? (
        <>
          <h2>Welcome, {user.email}</h2>
          <h3>📋 Dashboard</h3>
          <p>This is where your schedule, calendar, and tools will go.</p>
          <button onClick={handleLogout}>Log Out</button>
        </>
      ) : (
        <>
          <h2>Login or Sign Up</h2>
  
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          /><br /><br />
  
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          /><br /><br />
  
          <button onClick={handleLogin}>Log In</button>
          <button onClick={handleSignup} style={{ marginLeft: 10 }}>Sign Up</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </>
      )}
    </div>
  );  