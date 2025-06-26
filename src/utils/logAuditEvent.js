// utils/logAuditEvent.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs an audit event to Firestore
 * @param {Object} user - Firebase Auth user object
 * @param {string} actionType - READ | WRITE | DELETE | EXPORT | PERMISSION_CHANGE
 * @param {string} resourceType - Patient | Schedule | User | etc.
 * @param {string} resourceId - Unique ID of the affected resource
 * @param {string} description - Summary of the action performed
 */
export const logAuditEvent = async (user, actionType, resourceType, resourceId, description) => {
  if (!user || !user.uid) return;
  try {
    await addDoc(collection(db, 'auditLogs'), {
      timestamp: serverTimestamp(),
      userId: user.uid,
      userEmail: user.email || '',
      actionType,
      resourceType,
      resourceId,
      description,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};
