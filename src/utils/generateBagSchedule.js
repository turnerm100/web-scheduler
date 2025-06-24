// src/utils/generateBagSchedule.js

export function parseLocalDate(dateString) {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date) {
  if (!(date instanceof Date)) date = new Date(date);
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric'
  });
}

export function isTomorrow(date) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
}

export function isTodayAndDifferentFromPrevious(currentBag, prevBag) {
  const today = new Date();
  return (
    currentBag.startDateObj?.toDateString() === today.toDateString() &&
    prevBag &&
    currentBag.durationDays !== prevBag.durationDays
  );
}

export function getBagDurations(daysLeft, overrides = [], isPreservativeFree = false) {
  const bags = [];
  let remaining = daysLeft;

  if (isPreservativeFree) {
    for (let i = 0; i < 28 && remaining > 0; i++) {
      const rawOverride = overrides[i];
      const override = Number.isInteger(rawOverride) ? rawOverride : parseInt(rawOverride);
      let duration;
      if (override === 1) {
        duration = 1;
      } else if (isNaN(override)) {
        if (remaining % 2 === 1 && bags.length === 0) {
          duration = 1;
        } else {
          duration = 2;
        }
      } else {
        duration = 2;
      }
      if (duration > remaining) duration = remaining;
      bags.push(duration);
      remaining -= duration;
    }
    return bags;
  }

  for (let i = 0; i < 28 && remaining > 0; i++) {
    const override = parseInt(overrides[i]);
    let duration;
    if ([1, 2, 3, 4, 7].includes(override)) {
      duration = override;
    } else {
      if (remaining <= 4) duration = remaining;
      else if (remaining === 5) duration = 2;
      else if (remaining === 6) duration = 3;
      else if (remaining % 7 === 0) duration = 7;
      else {
        const mod = remaining % 7;
        duration = mod <= 4 ? mod : (mod === 5 ? 2 : 3);
      }
    }
    if (duration > remaining) duration = remaining;
    bags.push(duration);
    remaining -= duration;
  }
  return bags;
}

export function getBagDetails(duration) {
  switch (duration) {
    case 1: return { volume: '240ml', rate: '10ml/hr' };
    case 2: return { volume: '240ml', rate: '5ml/hr' };
    case 3: return { volume: '130ml', rate: '1.8ml/hr' };
    case 4: return { volume: '173ml', rate: '1.8ml/hr' };
    case 7: return { volume: '101ml', rate: '0.6ml/hr' };
    default: return { volume: '-', rate: '-' };
  }
}

export function getLastBagDate(patient, overrideEdits = {}) {
  const totalDays = parseInt(patient.daysInCycle, 10);
  const hospitalDate = parseLocalDate(patient.hospStartDate);
  const ourDate = parseLocalDate(patient.ourStartDate);
  let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
  daysPassed = daysPassed < 0 ? 0 : daysPassed;
  const remainingDays = totalDays - daysPassed;
  const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
  const schedule = getBagDurations(remainingDays, overrides, patient.isPreservativeFree || false);
  let current = new Date(ourDate);
  schedule.forEach((days) => {
    current.setDate(current.getDate() + days);
  });
  return current;
}
