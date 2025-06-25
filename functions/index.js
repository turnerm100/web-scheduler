import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { onSchedule } from 'firebase-functions/v2/scheduler';

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

// 🔐 Admin check middleware
async function requireAdminFromFirestore(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'Unauthorized: Missing token' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    const userDoc = await db.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().isAdmin !== true) {
      return res.status(403).json({ error: 'Forbidden: Not an admin user' });
    }

    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(403).json({ error: 'Unauthorized: Token verification failed' });
  }
}

// Admin routes
app.post('/createUser', requireAdminFromFirestore, async (req, res) => {
  const { email, password } = req.body.data || {};
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    res.json({ data: { uid: userRecord.uid, email: userRecord.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/getUsers', requireAdminFromFirestore, async (req, res) => {
  const users = [];
  let nextPageToken;
  try {
    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      users.push(...result.users.map(u => ({
        uid: u.uid,
        email: u.email,
        disabled: u.disabled
      })));
      nextPageToken = result.pageToken;
    } while (nextPageToken);
    res.json({ data: { users } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/setUserStatus', requireAdminFromFirestore, async (req, res) => {
  const { uid, disabled } = req.body.data || {};
  try {
    await admin.auth().updateUser(uid, { disabled });
    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/deleteUser', requireAdminFromFirestore, async (req, res) => {
  const { uid } = req.body.data || {};
  try {
    await admin.auth().deleteUser(uid);
    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🌐 API
export const api = functions.https.onRequest(app);

// 📆 Scheduled archive/delete job
export const archiveAndDeleteOldDischargedPatients = onSchedule('every 24 hours', async (event) => {
  const now = admin.firestore.Timestamp.now();
  const cutoffDate = new Date(now.toDate().getTime() - 60 * 24 * 60 * 60 * 1000);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

  const snapshot = await db.collection('patients')
    .where('status', '==', 'Discharged')
    .where('statusUpdatedAt', '<=', cutoffTimestamp)
    .get();

  if (snapshot.empty) {
    console.log('✅ No discharged patients to archive.');
    return;
  }

  const batch = db.batch();
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const archiveRef = db.collection('discharged_archive').doc(docSnap.id);
    batch.set(archiveRef, { ...data, archivedAt: now });
    batch.delete(docSnap.ref);
  });

  await batch.commit();
  console.log(`✅ Archived and deleted ${snapshot.size} discharged patient(s).`);
});