import { Job, email, sql } from "@elements/app";
import config from "#config";
import ReceiptEmail from "#app/emails/receipt";
import { Ticket } from "#app/shared/tickets";

export interface SendReceiptJobFields {
  orderId: string;
}

/** Emails the receipt for a paid order. Scheduled by fulfillment, in its transaction. */
export class SendReceiptJob extends Job<SendReceiptJobFields> {
  static maxAttempts = 5;

  run() {
    let ticket = sql<Ticket>(`
      select o.id, o.number, o.status, o.customerName, o.phone, o.email, o.pickupAt,
             o.subtotalCents, o.taxCents, o.totalCents, o.paidAt, o.statusAt, o.createdAt,
             ticketItems(o.id) as items
        from orders o
       where o.id = ${this.fields.orderId}
    `).firstOrThrow("order not found");

    email({
      to: ticket.email,
      subject: `Your order #${ticket.number} from ${config.restaurant.name}`,
      body: new ReceiptEmail({ ticket }),
    });
  }
}
