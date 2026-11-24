const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const DIGITS = 2;

const twoDigits = (value: number): string => String(value).padStart(DIGITS, '0');

export const formatCounter = (seconds: number): string => {
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / SECONDS_PER_HOUR);
  const minutes = Math.floor((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  return `${String(hours)}:${twoDigits(minutes)}:${twoDigits(whole % SECONDS_PER_MINUTE)}`;
};
