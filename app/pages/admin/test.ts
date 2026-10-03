import { test, assert, sql } from "@elements/app";
import { seedFixture } from "#app/shared/testing/fixtures";
import { createOrder, recordPayment, priceCart } from "#app/shared/services/checkout";
import { tickets } from "#app/shared/services/tickets";

test("admin", () => {
  let f = seedFixture();
  let form = { name: "Ada", phone: "3235550100", email: "ada@example.com", pickup: "asap", lines: [] };

  test("today's orders leave out yesterday's and unpaid ones", () => {
    let today = createOrder(form, priceCart([{ itemId: f.horchataId, quantity: 1, optionIds: [] }]), null);
    let yesterday = createOrder(form, priceCart([{ itemId: f.horchataId, quantity: 1, optionIds: [] }]), null);
    let unpaid = createOrder(form, priceCart([{ itemId: f.horchataId, quantity: 1, optionIds: [] }]), null);

    recordPayment(today, "cs_a", 438, "usd");
    recordPayment(yesterday, "cs_b", 438, "usd");
    sql(`update orders set createdAt = now() - interval '2 days' where id = ${yesterday}`);

    let ids = tickets.view().map((t) => t.id);

    assert(ids.includes(today), "today's paid order missing");
    assert(!ids.includes(yesterday), "yesterday's order counted today");
    assert(!ids.includes(unpaid), "unpaid order counted");
  });
});
