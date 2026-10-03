import { test, assert, equal, ValidationError, ForbiddenError } from "@elements/app";
import { seedFixture, loginAs } from "#app/shared/testing/fixtures";
import { loadHours, saveHours } from "./template";

async function errorOf(run: () => unknown): Promise<unknown> {
  try {
    await run();
  } catch (err) {
    return err;
  }

  return undefined;
}

test("admin-hours", () => {
  let f = seedFixture();

  test("the owner saves hours", () => {
    loginAs(f.ownerId, "owner");
    let days = loadHours().map((d) => (d.weekday === 1 ? { ...d, opensAt: "11:00", closesAt: "15:00" } : d));
    let saved = saveHours(days).find((d) => d.weekday === 1)!;

    equal([saved.opensAt, saved.closesAt], ["11:00", "15:00"]);
  });

  test("closing before opening is refused", async () => {
    loginAs(f.ownerId, "owner");
    let days = loadHours().map((d) => (d.weekday === 2 ? { ...d, opensAt: "18:00", closesAt: "09:00", closed: false } : d));
    let err = await errorOf(() => saveHours(days));

    assert(err instanceof ValidationError, `got ${err}`);
  });

  test("staff can't change hours", async () => {
    loginAs(f.staffId, "staff");
    let err = await errorOf(() => saveHours(loadHours()));

    assert(err instanceof ForbiddenError, `got ${err}`);
  });
});
