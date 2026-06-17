// Business-hours math for follow-up scheduling. Approximate: Mon–Fri, a
// configurable working window, evaluated in a fixed UTC offset (default ET).
// Good enough for "re-ping if unactioned past N business hours"; not a calendar.

const WORK_START = 9; // 9am
const WORK_END = 17; // 5pm
const TZ_OFFSET_HOURS = -5; // US Eastern (standard); adjust if DST precision matters

function toLocal(d: Date): Date {
  return new Date(d.getTime() + TZ_OFFSET_HOURS * 3600 * 1000);
}
function fromLocal(d: Date): Date {
  return new Date(d.getTime() - TZ_OFFSET_HOURS * 3600 * 1000);
}

/** Add N business hours to `start`, skipping weekends and off-hours. */
export function addBusinessHours(start: Date, hours: number): Date {
  let local = toLocal(start);
  let remaining = hours;

  while (remaining > 0) {
    const day = local.getUTCDay(); // 0 Sun .. 6 Sat (on the shifted clock)
    const hour = local.getUTCHours();

    // Weekend → jump to Monday 9am.
    if (day === 0 || day === 6) {
      local = advanceToNextWorkday(local);
      continue;
    }
    // Before open → move to 9am.
    if (hour < WORK_START) {
      local.setUTCHours(WORK_START, 0, 0, 0);
      continue;
    }
    // After close → next workday 9am.
    if (hour >= WORK_END) {
      local = advanceToNextWorkday(local);
      continue;
    }
    // Inside the window: consume up to the remaining hours or end of day.
    const hoursLeftToday = WORK_END - hour;
    const step = Math.min(remaining, hoursLeftToday);
    local = new Date(local.getTime() + step * 3600 * 1000);
    remaining -= step;
  }
  return fromLocal(local);
}

function advanceToNextWorkday(local: Date): Date {
  const next = new Date(local.getTime());
  do {
    next.setUTCDate(next.getUTCDate() + 1);
  } while (next.getUTCDay() === 0 || next.getUTCDay() === 6);
  next.setUTCHours(WORK_START, 0, 0, 0);
  return next;
}
