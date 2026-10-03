import { test, assert, equal, sql } from "@elements/app";
import { todaySchedule } from "#app/shared/services/hours";

test("home", () => {
  test("an open restaurant offers ASAP and 15-minute slots after the lead time", () => {
    sql(`update hours set opensAt = '00:00', closesAt = '23:59', closed = false`);
    let now = new Date();
    let schedule = todaySchedule(now);
    let lastSlot = new Date(schedule.slots.at(-1)?.value ?? now);

    for (let slot of schedule.slots) {
      let at = new Date(slot.value);
      assert(at.getTime() >= now.getTime() + 20 * 60_000, `${slot.label} is inside the lead time`);
      equal(at.getTime() % (15 * 60_000), 0);
    }

    assert(lastSlot.getTime() <= now.getTime() + 24 * 60 * 60_000);
  });

  test("a closed day takes no orders", () => {
    sql(`update hours set closed = true`);
    let schedule = todaySchedule();

    equal(schedule.asap, false);
    equal(schedule.slots.length, 0);
    equal(schedule.label, "Closed today");
  });
});
