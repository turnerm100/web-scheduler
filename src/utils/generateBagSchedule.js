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

// ======= ONLY ONE DEFINITION OF getBagDurations =======
export function getBagDurations(
  daysLeft,
  overrides = [],
  isPreservativeFree = false,
  enable5DayBags = false,
  enable6DayBags = false
) {
  const bags = [];
  let remaining = daysLeft;

if (isPreservativeFree) {
  let i = 0;
  // If cycle odd, start with a 1-day bag
  if (remaining % 2 === 1) {
    bags.push(1);
    remaining -= 1;
    i++; // Advance position so overrides stay aligned
  }

  while (remaining > 0 && i < 28) {
    const override = parseInt(overrides[i]);
    let duration;

    if (override === 1) {
      // User wants a 1-day bag here; put it, then do another 1-day bag for the leftover day (if more than 1 day left)
      bags.push(1);
      remaining -= 1;

      // If more days left and the next override is also 1, do it again
      // Or if no override for next, default to 1 for leftover
      if (remaining > 0 && (overrides[i + 1] === 1 || isNaN(parseInt(overrides[i + 1])))) {
        bags.push(1);
        remaining -= 1;
        i++; // We manually handled an extra bag
      }
      // If not, just continue
    } else if (override === 2) {
      bags.push(2);
      remaining -= 2;
    } else {
      // Default: take 2-day if possible, else 1-day
      duration = Math.min(2, remaining);
      bags.push(duration);
      remaining -= duration;
    }
    i++;
  }
  return bags;
}

  for (let i = 0; i < 28 && remaining > 0; i++) {
    // Only use override if present and valid
    const override = parseInt(overrides[i]);
    let duration;
    if ([1, 2, 3, 4, 5, 6, 7].includes(override)) {
      duration = override;
    } else if (remaining === 5 && enable5DayBags) {
      duration = 5;
    } else if (remaining === 6 && enable6DayBags) {
      duration = 6;
    } else if (remaining <= 4) {
      duration = remaining;
    } else if (remaining % 7 === 0) {
      duration = 7;
    } else {
      // Default fallback for other cases (maintain your pattern)
      const mod = remaining % 7;
      duration = mod <= 4 ? mod : (mod === 5 ? (enable5DayBags ? 5 : 2) : (mod === 6 ? (enable6DayBags ? 6 : 3) : 3));
    }

    if (duration > remaining) duration = remaining;
    bags.push(duration);
    remaining -= duration;
  }
  return bags;
}

// Don't forget: you'll need to update all uses of getBagDurations elsewhere to pass
// enable5DayBags and enable6DayBags!

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

// If you use enable5DayBags/enable6DayBags in getLastBagDate, add them as args too
export function getLastBagDate(patient, overrideEdits = {}, enable5DayBags = false, enable6DayBags = false) {
  const totalDays = parseInt(patient.daysInCycle, 10);
  const hospitalDate = parseLocalDate(patient.hospStartDate);
  const ourDate = parseLocalDate(patient.ourStartDate);
  let daysPassed = Math.floor((ourDate - hospitalDate) / (1000 * 60 * 60 * 24));
  daysPassed = daysPassed < 0 ? 0 : daysPassed;
  const remainingDays = totalDays - daysPassed;
  const overrides = overrideEdits[patient.id] || patient.bagOverrides || [];
  const schedule = getBagDurations(
    remainingDays,
    overrides,
    patient.isPreservativeFree || false,
    enable5DayBags,
    enable6DayBags
  );
  let current = new Date(ourDate);
  schedule.forEach((days) => {
    current.setDate(current.getDate() + days);
  });
  return current;
}
