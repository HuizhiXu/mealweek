const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekDates(weekOffset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: dateKey(date),
      date,
      weekday: WEEKDAY_NAMES[date.getDay()],
      day: date.getDate(),
      isToday: dateKey(date) === dateKey(today),
    };
  });
}

export function formatWeekRange(weekOffset = 0) {
  const dates = getWeekDates(weekOffset);
  const first = dates[0].date;
  const last = dates[6].date;
  const month = first.getMonth() === last.getMonth()
    ? `${first.getMonth() + 1}月`
    : `${first.getMonth() + 1}月 · ${last.getMonth() + 1}月`;
  return `${first.getFullYear()}年 ${month} ${first.getDate()}日–${last.getDate()}日`;
}

export function formatShortDate(key: string) {
  const date = new Date(`${key}T12:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
