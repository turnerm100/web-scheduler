import { isTomorrow, isTodayAndDifferentFromPrevious } from './generateBagSchedule';

export function shouldHighlightRow(bagData, patient) {
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
  const showPtDoingBagsAlert = patient.bagChangeBy?.toString().toLowerCase() === 'pt/cg';

  for (let i = 0; i < bagData.length; i++) {
    const bag = bagData[i];
    const prevBag = i > 0 ? bagData[i - 1] : null;
    const isToday = bag.startDateObj.toDateString() === todayStr;
    const isTomorrowBag = isTomorrow(bag.startDateObj);
    const isFirstBagToday = i === 0 && isToday;
    const isPumpReprogram = isTodayAndDifferentFromPrevious(bag, prevBag);

    if (
      (i > 0 && bag.durationDays < prevBag?.durationDays && isTomorrowBag) ||
      (i > 0 && bag.durationDays < prevBag?.durationDays && isToday) ||
      isFirstBagToday ||
      isPumpReprogram ||
      (i === 0 && isTomorrowBag && !showPtDoingBagsAlert) ||
      (isTomorrowBag && !showPtDoingBagsAlert) ||
      (isToday && !showPtDoingBagsAlert)
    ) {
      return true;
    }
  }

  if (showDisconnectAlert) {
    return true;
  }

  return false;
}
