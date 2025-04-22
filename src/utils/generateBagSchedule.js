// src/utils/generateBagSchedule.js
export function generateBagSchedule({
    totalDays,
    startDate,
    overrideDurations = []
  }) {
    const bags = [];
    let remainingDays = totalDays;
    let currentDate = new Date(startDate);
  
    const getAutoDuration = (remaining) => {
      if (remaining <= 0) return null;
      if (remaining <= 4) return remaining;
      if (remaining === 5) return 2;
      if (remaining === 6) return 3;
      const mod = remaining % 7;
      if (mod === 0) return 7;
      if (mod <= 4) return mod;
      if (mod === 5) return 2;
      if (mod === 6) return 3;
      return null;
    };
  
    for (let i = 0; i < 7 && remainingDays > 0; i++) {
      const override = overrideDurations[i];
      const duration = override ? parseInt(override) : getAutoDuration(remainingDays);
  
      if (!duration || duration <= 0) break;
  
      const visitDate = new Date(currentDate);
      const disconnect = i === 6 || duration >= remainingDays;
  
      bags.push({
        bagNumber: i + 1,
        duration,
        visitDate: visitDate.toLocaleDateString('en-US', {
          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        }),
        disconnect: disconnect ? `Disconnect\n${visitDate.toLocaleDateString('en-US')}` : null
      });
  
      currentDate.setDate(currentDate.getDate() + duration);
      remainingDays -= duration;
    }
  
    return bags;
  }
  