import { test, assert, equal, sql, ForbiddenError } from "@elements/app";
import { seedFixture, loginAs } from "#app/shared/testing/fixtures";
import { menuItems } from "#app/shared/services/menu";

test("admin-menu", () => {
  let f = seedFixture();
  let draft = {
    categoryId: f.categoryId,
    name: "Tamales",
    description: "Pork, red chile.",
    priceCents: 450,
    photo: "",
    optionGroupIds: [f.addOnsId],
    hidden: true,
    soldOutUntil: null,
    position: 3,
    createdAt: new Date(),
  };

  test("the owner adds and edits items", () => {
    loginAs(f.ownerId, "owner");
    let menu = menuItems.view();
    let item = menu.insert(draft);

    menu.update({ ...item, priceCents: 500, hidden: false });

    let row = sql<{ priceCents: number; hidden: boolean; optionGroupIds: string[] }>(`
      select priceCents, hidden, optionGroupIds from menuItems where id = ${item.id}
    `).firstOrThrow();
    equal(row.priceCents, 500);
    equal(row.hidden, false);
    equal(row.optionGroupIds, [f.addOnsId]);
  });

  test("staff can't add items", async () => {
    loginAs(f.staffId, "staff");
    let menu = menuItems.view();
    let threw: unknown;

    try {
      await menu.insertAsync(draft);
    } catch (err) {
      threw = err;
    }

    assert(threw instanceof ForbiddenError, `got ${threw}`);
  });
});
