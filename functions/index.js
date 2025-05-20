//functions.index.js//
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

// 🔐 Firestore-based admin check middleware
async function requireAdminFromFirestore(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(403).json({ error: "Unauthorized: Missing token" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    const userDoc = await db.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().isAdmin !== true) {
      return res.status(403).json({ error: "Forbidden: Not an admin user" });
    }

    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(403).json({ error: "Unauthorized: Token verification failed" });
  }
}

// 🧑‍💼 Admin-only route to create users
app.post("/createUser", requireAdminFromFirestore, async (req, res) => {
  const { email, password } = req.body.data || {};
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    res.json({ data: { uid: userRecord.uid, email: userRecord.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 📋 Admin-only route to list users
app.post("/getUsers", requireAdminFromFirestore, async (req, res) => {
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

// 🔄 Admin-only route to activate/deactivate users
app.post("/setUserStatus", requireAdminFromFirestore, async (req, res) => {
  const { uid, disabled } = req.body.data || {};
  try {
    await admin.auth().updateUser(uid, { disabled });
    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ❌ Admin-only route to delete a user
app.post("/deleteUser", requireAdminFromFirestore, async (req, res) => {
  const { uid } = req.body.data || {};
  try {
    await admin.auth().deleteUser(uid);
    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Export all routes via one Express function
exports.api = functions.https.onRequest(app);
