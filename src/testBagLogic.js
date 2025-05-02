// testBagLogic.js
import { generateBagSchedule } from './utils/generateBagSchedule';

const result = generateBagSchedule({
  totalDays: 26,
  startDate: '2025-04-21',
  overrideDurations: [3, 4, '', '', '', '', '']
});

console.log(result);
