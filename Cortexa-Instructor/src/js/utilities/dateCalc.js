export function subtractDates(date1, date2) {
  const oneDay = 60 * 1000; // milliseconds in one day
  const diffInMilliseconds = date1.getTime() - date2.getTime();
  return Math.round(diffInMilliseconds / oneDay); // Convert milliseconds to days
}
export function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}
