import { test, assert, equal, sql, AuthError, ForbiddenError } from "@elements/app";
import { seedFixture, loginAs } from "#app/shared/testing/fixtures";
import { createOrder, recordPayment, priceCart } from "#app/shared/services/checkout";
import { tickets } from "#app/shared/services/tickets";
import { nextStatus } from "#app/shared/tickets";

async function refused(run: () => unknown): Promise<unknown> {
  try {
    await run();
  } catch (err) {
    return err;
  }

  return undefined;
}

test("kitchen", () => {
  let f = seedFixture();
  let form = { name: "Ada", phone: "3235550100", email: "ada@example.com", pickup: "asap", lines: [] };
  let paidId = createOrder(form, priceCart([{ itemId: f.horchataId, quantity: 2, optionIds: [] }]), null);
  let pendingId = createOrder(form, priceCart([{ itemId: f.horchataId, quantity: 1, optionIds: [] }]), null);
  recordPayment(paidId, "cs_test_k", 876, "usd");

  test("the board shows paid orders only, with their items", () => {
    let board = tickets.view();
    let ids = board.map((t) => t.id);

    assert(ids.includes(paidId), "paid order missing from the board");
    assert(!ids.includes(pendingId), "unpaid order is on the board");
    equal(board.get(paidId)?.items[0].quantity, 2);
  });

  test("a tap moves a ticket new → preparing → ready → done", () => {
    equal([nextStatus("new"), nextStatus("preparing"), nextStatus("ready")], ["preparing", "ready", "done"]);

    loginAs(f.staffId, "staff");
    let board = tickets.view();
    let ticket = board.get(paidId)!;
    board.update({ ...ticket, status: "preparing" });

    equal(sql<{ status: string }>(`select status from orders where id = ${paidId}`).firstOrThrow().status, "preparing");
  });

  test("signed-out visitors can't move tickets", async () => {
    let board = tickets.view();
    let err = await refused(() => board.update({ ...board.get(paidId)!, status: "ready" }));

    assert(err instanceof AuthError, `got ${err}`);
  });

  test("tickets can't be created or deleted through the board", async () => {
    loginAs(f.staffId, "staff");
    let board = tickets.view();
    let err = await refused(() => board.delete(board.get(paidId)!));

    assert(err instanceof ForbiddenError, `got ${err}`);
  });
});
