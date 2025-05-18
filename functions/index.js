//functions.index.js//
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const app = express();
app.use(cors({ origin: true }));

const ADMIN_EMAIL = "turnerm100@hotmail.com";

async function requireAdminManually(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(403).json({ error: "Unauthorized: Missing token" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    console.log("🔐 requireAdmin — decoded token:", decoded);
    if (decoded.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Forbidden: Not admin" });
    }

    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(403).json({ error: "Unauthorized: Token verification failed" });
  }
}

app.post("/createUser", requireAdminManually, async (req, res) => {
  const { email, password } = req.body.data || {};
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    res.json({ data: { uid: userRecord.uid, email: userRecord.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/getUsers", requireAdminManually, async (req, res) => {
  const users = [];
  let nextPageToken;

  try {
    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      users.push(...result.users.map(u => ({
        uid: u.uid,
        email: u.email,
        disabled: u.disabled,
      })));
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    res.json({ data: { users } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/setUserStatus", requireAdminManually, async (req, res) => {
  const { uid, disabled } = req.body.data || {};
  try {
    await admin.auth().updateUser(uid, { disabled });
    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/deleteUser", requireAdminManually, async (req, res) => {
  const { uid } = req.body.data || {};
  try {
    await admin.auth().deleteUser(uid);
    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Export all routes via 1 Express function
exports.api = functions.https.onRequest(app);
