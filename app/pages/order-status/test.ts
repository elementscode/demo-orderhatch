import { test, assert, equal, NotFoundError, Request, Response } from "@elements/app";
import { seedFixture } from "#app/shared/testing/fixtures";
import { createOrder, priceCart } from "#app/shared/services/checkout";
import { tickets } from "#app/shared/services/tickets";
import route from "./index";

test("order-status", () => {
  let f = seedFixture();

  test("a malformed order id is a 404", async () => {
    let threw: unknown;

    try {
      await route({ params: { id: "1017" } } as unknown as Request, {} as Response);
    } catch (err) {
      threw = err;
    }

    assert(threw instanceof NotFoundError, `got ${threw}`);
  });

  test("the customer's view is their one order, unpaid included", () => {
    let form = { name: "Ada", phone: "3235550100", email: "ada@example.com", pickup: "asap", lines: [] };
    let id = createOrder(form, priceCart([{ itemId: f.tacosId, quantity: 1, optionIds: [f.pastorId] }]), null);
    let view = tickets.view({ id });

    equal(view.length, 1);
    equal(view.at(0)?.status, "pending");
    equal(view.at(0)?.items[0].choices[0].name, "Al pastor");
  });
});
