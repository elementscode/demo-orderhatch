import { test, assert, equal, sql } from "@elements/app";
import { seedFixture, loginAs } from "#app/shared/testing/fixtures";
import { menuItems } from "#app/shared/services/menu";
import { isSoldOut } from "#app/shared/menu";

test("kitchen-sold-out", () => {
  let f = seedFixture();

  test("sold out lasts until the end of the business day", () => {
    loginAs(f.staffId, "staff");
    let menu = menuItems.view();
    let item = menu.get(f.tacosId)!;

    menu.update({ ...item, soldOutUntil: new Date() });

    let row = sql<{ soldOutUntil: Date }>(`select soldOutUntil from menuItems where id = ${f.tacosId}`).firstOrThrow();
    let until = new Date(row.soldOutUntil).getTime();

    assert(until > Date.now(), "sold out should still be in effect");
    assert(until <= Date.now() + 24 * 60 * 60 * 1000, "sold out should end within a day");
    assert(isSoldOut({ ...item, soldOutUntil: row.soldOutUntil }));
  });

  test("staff can mark sold out but can't edit the menu", () => {
    loginAs(f.staffId, "staff");
    let menu = menuItems.view();
    let item = menu.get(f.tacosId)!;

    menu.update({ ...item, name: "Free Tacos", priceCents: 0, soldOutUntil: null });

    let row = sql<{ name: string; priceCents: number }>(`select name, priceCents from menuItems where id = ${f.tacosId}`).firstOrThrow();
    equal(row.name, "Street Tacos");
    equal(row.priceCents, 1050);
  });
});
