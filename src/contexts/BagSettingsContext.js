// src/contexts/BagSettingsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const BagSettingsContext = createContext();

export function BagSettingsProvider({ children }) {
  const [bagSettings, setBagSettings] = useState({
    enable5DayBags: false,
    enable6DayBags: false,
    loading: true,
  });

  useEffect(() => {
    // Only run after user is authenticated
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setBagSettings({
          enable5DayBags: false,
          enable6DayBags: false,
          loading: false,
        });
        return;
      }
      // Now safe to fetch settings
      const settingsRef = doc(db, 'settings', 'global');
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const data = snap.data();
        setBagSettings({
          enable5DayBags: !!data.enable5DayBags,
          enable6DayBags: !!data.enable6DayBags,
          loading: false,
        });
      } else {
        setBagSettings({
          enable5DayBags: false,
          enable6DayBags: false,
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <BagSettingsContext.Provider value={bagSettings}>
      {children}
    </BagSettingsContext.Provider>
  );
}

export function useBagSettings() {
  return useContext(BagSettingsContext);
}
