import { isTomorrow, isTodayAndDifferentFromPrevious } from './generateBagSchedule';

export function shouldHighlightRow(bagData, patient, rnVisitNeededEdits = {}) {
  const todayStr = new Date().toDateString();

  const isDisconnectToday = (() => {
    const lastBag = bagData[bagData.length - 1];
    return lastBag?.endDateObj?.toDateString() === todayStr;
  })();

  const isDisconnectTomorrow = (() => {
    const lastBag = bagData[bagData.length - 1];
    return lastBag && isTomorrow(lastBag.endDateObj);
  })();

  const showDisconnectAlert = isDisconnectToday || isDisconnectTomorrow;
  const isPtCg = patient.bagChangeBy && patient.bagChangeBy.toLowerCase().includes('pt');

  for (let i = 0; i < bagData.length; i++) {
    const bag = bagData[i];
    const prevBag = i > 0 ? bagData[i - 1] : null;
    const isToday = bag.startDateObj.toDateString() === todayStr;
    const isTomorrowBag = isTomorrow(bag.startDateObj);
    const isFirstBagToday = i === 0 && isToday;
    const isPumpReprogram = isTodayAndDifferentFromPrevious(bag, prevBag);
    const rnVisitChecked = isPtCg && rnVisitNeededEdits[patient.id]?.[i];

    // Highlight for RN visit checkbox (green/yellow)
    if (rnVisitChecked && isToday) return true;
    if (rnVisitChecked && isTomorrowBag) return true;

    // All original highlight rules
    if (
      (i > 0 && bag.durationDays < prevBag?.durationDays && isTomorrowBag) ||
      (i > 0 && bag.durationDays < prevBag?.durationDays && isToday) ||
      isFirstBagToday ||
      isPumpReprogram ||
      (i === 0 && isTomorrowBag && !isPtCg) ||
      (isTomorrowBag && !isPtCg) ||
      (isToday && !isPtCg)
    ) {
      return true;
    }
  }

  if (showDisconnectAlert) {
    return true;
  }

  return false;
}
