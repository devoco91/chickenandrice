// utils/salesTracker.js

export function getTodayKey() {
  const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
  return today
}

export function getTodaysSales() {
  const stored = JSON.parse(localStorage.getItem("todaysSales")) || { date: getTodayKey(), total: 0 }

  // Reset if date changed
  if (stored.date !== getTodayKey()) {
    const reset = { date: getTodayKey(), total: 0 }
    localStorage.setItem("todaysSales", JSON.stringify(reset))
    return 0
  }

  return stored.total
}

export function addToTodaysSales(amount) {
  const stored = JSON.parse(localStorage.getItem("todaysSales")) || { date: getTodayKey(), total: 0 }

  let updated
  if (stored.date === getTodayKey()) {
    updated = { date: stored.date, total: stored.total + amount }
  } else {
    updated = { date: getTodayKey(), total: amount }
  }

  localStorage.setItem("todaysSales", JSON.stringify(updated))
  return updated.total
}

export function resetTodaysSales() {
  const reset = { date: getTodayKey(), total: 0 }
  localStorage.setItem("todaysSales", JSON.stringify(reset))
  return 0
}
