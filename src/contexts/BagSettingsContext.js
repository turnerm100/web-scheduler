// src/contexts/BagSettingsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const BagSettingsContext = createContext();

export function BagSettingsProvider({ children }) {
  const [bagSettings, setBagSettings] = useState({
    enable5DayBags: false,
    enable6DayBags: false,
    loading: true,
  });

  useEffect(() => {
    async function fetchSettings() {
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
        setBagSettings({ enable5DayBags: false, enable6DayBags: false, loading: false });
      }
    }
    fetchSettings();
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
