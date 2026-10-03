import { test, assert, equal, sql, Email } from "@elements/app";
import ReceiptEmail from "#app/emails/receipt";
import { seedFixture } from "#app/shared/testing/fixtures";
import { createOrder, priceCart } from "#app/shared/services/checkout";
import { Ticket } from "#app/shared/tickets";

test("send-receipt", () => {
  let f = seedFixture();

  test("the receipt lists the order, its options and the total", () => {
    let form = { name: "Ada Lovelace", phone: "3235550100", email: "ada@example.com", pickup: "asap", lines: [] };
    let id = createOrder(form, priceCart([{ itemId: f.tacosId, quantity: 2, optionIds: [f.asadaId, f.guacId] }]), null);
    let ticket = sql<Ticket>(`select *, ticketItems(id) as items from orders where id = ${id}`).firstOrThrow();
    let receipt = new Email({ to: ticket.email, subject: "receipt", body: new ReceiptEmail({ ticket }) });

    equal(receipt.to, ["ada@example.com"]);
    assert(receipt.html.includes(`#${ticket.number}`), "order number missing");
    assert(receipt.html.includes("Carne asada · + Guacamole"), "options missing");
    assert(receipt.html.includes("$30.11"), `total missing: ${ticket.totalCents}`);
    assert(receipt.html.includes(`/orders/${id}`), "status link missing");
  });
});
