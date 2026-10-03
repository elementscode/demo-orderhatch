import { test, assert, equal, sql, ValidationError } from "@elements/app";
import { seedFixture } from "#app/shared/testing/fixtures";
import { checkDetails, createOrder, priceCart, recordPayment } from "#app/shared/services/checkout";

async function rejects(run: () => unknown, match: string) {
  try {
    await run();
    assert(false, `expected a ValidationError matching "${match}"`);
  } catch (err: any) {
    assert(err instanceof ValidationError, `got ${err}`);
    assert(JSON.stringify(err.errors ?? err.message).includes(match), `got ${JSON.stringify(err.errors ?? err.message)}`);
  }
}

test("checkout", () => {
  let f = seedFixture();

  test("prices options from the database, not the browser", () => {
    let cart = priceCart([
      { itemId: f.tacosId, quantity: 2, optionIds: [f.asadaId, f.guacId] },
      { itemId: f.horchataId, quantity: 1, optionIds: [] },
    ]);

    equal(cart.lines[0].unitCents, 1050 + 100 + 225);
    equal(cart.subtotalCents, 2 * 1375 + 400);
    equal(cart.taxCents, Math.round(3150 * 0.095));
    equal(cart.totalCents, cart.subtotalCents + cart.taxCents);
    equal(cart.lines[0].choices.map((c) => c.name), ["Carne asada", "Guacamole"]);
  });

  test("requires a pick in a required group", async () => {
    await rejects(() => priceCart([{ itemId: f.tacosId, quantity: 1, optionIds: [] }]), "protein");
  });

  test("refuses two picks in a pick-one group", async () => {
    await rejects(() => priceCart([{ itemId: f.tacosId, quantity: 1, optionIds: [f.asadaId, f.pastorId] }]), "Choose one");
  });

  test("refuses an option the item doesn't offer", async () => {
    await rejects(() => priceCart([{ itemId: f.horchataId, quantity: 1, optionIds: [f.guacId] }]), "isn't available");
  });

  test("refuses an item sold out today", async () => {
    sql(`update menuItems set soldOutUntil = now() + interval '1 hour' where id = ${f.horchataId}`);
    await rejects(() => priceCart([{ itemId: f.horchataId, quantity: 1, optionIds: [] }]), "sold out");
  });

  test("an item sold out yesterday is back", () => {
    sql(`update menuItems set soldOutUntil = now() - interval '1 minute' where id = ${f.horchataId}`);
    equal(priceCart([{ itemId: f.horchataId, quantity: 1, optionIds: [] }]).subtotalCents, 400);
  });

  test("checks the customer's details", async () => {
    await rejects(() => checkDetails({ name: "", phone: "12", email: "nope", pickup: "asap", lines: [] }), "phone");
    await rejects(() => checkDetails({ name: "A", phone: "3235550100", email: "a@b.co", pickup: "2001-01-01T00:00:00.000Z", lines: [] }), "pickup");
  });

  test("a paid order reaches the board once, with one receipt", () => {
    let form = { name: "Ada", phone: "3235550100", email: "ada@example.com", pickup: "asap", lines: [] };
    let cart = priceCart([{ itemId: f.horchataId, quantity: 1, optionIds: [] }]);
    let orderId = createOrder(form, cart, null);

    equal(sql<{ status: string }>(`select status from orders where id = ${orderId}`).firstOrThrow().status, "pending");

    recordPayment(orderId, "cs_test_1", cart.totalCents, "usd");
    recordPayment(orderId, "cs_test_1", cart.totalCents, "usd");

    let order = sql<{ status: string; paid: boolean }>(`select status, paidAt is not null as paid from orders where id = ${orderId}`).firstOrThrow();
    equal(order.status, "new");
    assert(order.paid);
    equal(sql<{ n: number }>(`select count(*)::int as n from payments where orderId = ${orderId}`).firstOrThrow().n, 1);
    equal(sql<{ n: number }>(`select count(*)::int as n from elements.jobs where fields->>'orderId' = ${orderId}`).firstOrThrow().n, 1);
  });
});
