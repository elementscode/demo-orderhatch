import { test, assert, equal, sql, NotFoundError, Request, Response } from "@elements/app";
import { seedFixture } from "#app/shared/testing/fixtures";
import { placeOrder, resumePayment } from "#app/shared/services/checkout";
import { testCheckout } from "#app/shared/stripe";
import { payTestOrder } from "./services";
import route from "./index";

test("checkout-test", () => {
  let f = seedFixture();

  test("an order goes through the test checkout to the kitchen board", async () => {
    // Tests read the development env file. Once the owner adds a Stripe key,
    // checkout goes to Stripe and this page is off, so there is nothing to drive.
    if (!testCheckout()) {
      return;
    }

    let url = await placeOrder({
      name: "Ada Lovelace",
      phone: "3235550100",
      email: "ada@example.com",
      pickup: "asap",
      lines: [{ itemId: f.tacosId, quantity: 2, optionIds: [f.asadaId] }],
    });

    let match = /^\/checkout\/test\/([0-9a-f-]{36})$/.exec(url);
    assert(match, `got ${url}`);

    let orderId = match![1];
    let pending = sql<{ status: string; totalCents: number }>(`select status, totalCents from orders where id = ${orderId}`).firstOrThrow();
    equal(pending.status, "pending");
    equal(await resumePayment(orderId), url);

    payTestOrder(orderId);

    let order = sql<{ status: string; paid: boolean }>(`select status, paidAt is not null as paid from orders where id = ${orderId}`).firstOrThrow();
    equal(order.status, "new");
    assert(order.paid);

    let payment = sql<{ stripeSessionId: string; amountTotal: number }>(`select stripeSessionId, amountTotal from payments where orderId = ${orderId}`).all();
    equal(payment.length, 1);
    equal(payment[0].stripeSessionId, `test_${orderId}`);
    equal(payment[0].amountTotal, pending.totalCents);

    let jobs = sql<{ n: number }>(`select count(*)::int as n from elements.jobs where fields->>'orderId' = ${orderId}`).firstOrThrow();
    equal(jobs.n, 1);

    let threw: unknown;

    try {
      payTestOrder(orderId);
    } catch (err) {
      threw = err;
    }

    assert(threw instanceof NotFoundError, `paying twice: got ${threw}`);
  });

  test("a malformed order id is a 404, and so is every id once Stripe is on", async () => {
    let threw: unknown;

    try {
      await route({ params: { orderId: "1017" } } as unknown as Request, {} as Response);
    } catch (err) {
      threw = err;
    }

    assert(threw instanceof NotFoundError, `got ${threw}`);
  });
});
