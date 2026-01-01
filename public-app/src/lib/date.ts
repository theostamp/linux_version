export const getRelativeTimeEl = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return 'Μόλις τώρα';
  if (diffMs < hour) {
    const m = Math.floor(diffMs / minute);
    return `Πριν ${m} ${m === 1 ? 'λεπτό' : 'λεπτά'}`;
  }
  if (diffMs < day) {
    const h = Math.floor(diffMs / hour);
    return `Πριν ${h} ${h === 1 ? 'ώρα' : 'ώρες'}`;
  }
  const d = Math.floor(diffMs / day);
  return `Πριν ${d} ${d === 1 ? 'ημέρα' : 'ημέρες'}`;
};
