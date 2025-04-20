// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEW5KkV2aap_8U4Nlk5MdMUdNjkT-Gn2Y",
  authDomain: "blincyto-tracking-tool.firebaseapp.com",
  projectId: "blincyto-tracking-tool",
  storageBucket: "blincyto-tracking-tool.firebasestorage.app",
  messagingSenderId: "995513405180",
  appId: "1:995513405180:web:e750c0793a92914cfe5179"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);