import { sql } from "@elements/app";
import config from "#config";
import { clock } from "#app/shared/format";

export interface PickupSlot {
  value: string;
  label: string;
}

export interface Schedule {
  /** Taking orders for right now. */
  asap: boolean;
  /** Later pickup times still open today. */
  slots: PickupSlot[];
  /** "Open today 10:30 AM – 9:00 PM", or "Closed today". */
  label: string;
}

interface TodayHours {
  opensAt: Date;
  closesAt: Date;
  closed: boolean;
}

const MINUTE = 60_000;

/** Today's hours in the restaurant's time zone, as instants. */
function todayHours(): TodayHours | undefined {
  let tz = config.restaurant.timeZone;

  return sql<TodayHours>(`
    select (date_trunc('day', now() at time zone ${tz}) + h.opensAt) at time zone ${tz} as opensAt,
           (date_trunc('day', now() at time zone ${tz}) + h.closesAt) at time zone ${tz} as closesAt,
           h.closed
      from hours h
     where h.weekday = extract(dow from now() at time zone ${tz})
  `).first();
}

export function todaySchedule(now: Date = new Date()): Schedule {
  let hours = todayHours();

  if (!hours || hours.closed) {
    return { asap: false, slots: [], label: "Closed today" };
  }

  let opens = new Date(hours.opensAt).getTime();
  let closes = new Date(hours.closesAt).getTime();
  let step = config.restaurant.slotMinutes * MINUTE;
  let earliest = Math.max(opens, now.getTime() + config.restaurant.leadMinutes * MINUTE);
  let first = Math.ceil(earliest / step) * step;
  let slots: PickupSlot[] = [];

  for (let t = first; t <= closes - step; t += step) {
    let at = new Date(t);
    slots.push({ value: at.toISOString(), label: clock(at) });
  }

  let label = `Open today ${clock(hours.opensAt)} – ${clock(hours.closesAt)}`;

  if (now.getTime() >= closes) {
    label = `Closed for today. We opened at ${clock(hours.opensAt)}.`;
  }

  return {
    asap: now.getTime() >= opens && now.getTime() + config.restaurant.leadMinutes * MINUTE <= closes,
    slots,
    label,
  };
}
