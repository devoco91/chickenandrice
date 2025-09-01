// app/utils/formatPortion.js
export function formatPortion(portion) {
  const whole = Math.floor(portion);
  const fraction = portion - whole;

  if (fraction === 0.5) {
    return whole > 0 ? `${whole}½` : "½";
  }
  return `${portion}`;
}
