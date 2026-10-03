import config from "#config";

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "12:45 PM" in the restaurant's time zone, wherever the viewer is. */
export function clock(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: config.restaurant.timeZone,
  });
}

/** "4:07" elapsed, or "1:04:07" past an hour. */
export function elapsed(from: Date | string, now: Date): string {
  let seconds = Math.max(0, Math.floor((now.getTime() - new Date(from).getTime()) / 1000));
  let h = Math.floor(seconds / 3600);
  let m = Math.floor((seconds % 3600) / 60);
  let s = seconds % 60;
  let ss = String(s).padStart(2, "0");

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  }

  return `${m}:${ss}`;
}

export function minutesSince(from: Date | string, now: Date): number {
  return (now.getTime() - new Date(from).getTime()) / 60000;
}

export function taxFor(subtotalCents: number): number {
  return Math.round((subtotalCents * config.restaurant.taxBps) / 10000);
}
