import { LiveTable, sql, ForbiddenError, ValidationError } from "@elements/app";
import config from "#config";
import { requireStaff } from "#app/shared/services/auth";
import { OrderStatus, Ticket } from "#app/shared/tickets";

export { Ticket };

const STATUSES: OrderStatus[] = ["new", "preparing", "ready", "done"];

function columns() {
  return sql.raw(`
    o.id, o.number, o.status, o.customerName, o.phone, o.email, o.pickupAt,
    o.subtotalCents, o.taxCents, o.totalCents, o.paidAt, o.statusAt, o.createdAt,
    ticketItems(o.id) as items
  `);
}

/**
 * The whole table is today's paid orders. A partition on id is one order,
 * any day, for the customer's status page. The orders trigger notifies the
 * table's channel (see the notify-tickets migration).
 */
export let tickets: LiveTable<Ticket> = new LiveTable<Ticket>({
  table: "orders",

  select: (partition: { id?: string }) => {
    if (partition.id) {
      return sql<Ticket>(`select ${columns()} from orders o where o.id = ${partition.id}`);
    }

    return sql<Ticket>(`
      select ${columns()} from orders o
       where o.status <> 'pending'
         and o.createdAt >= date_trunc('day', now() at time zone ${config.restaurant.timeZone}) at time zone ${config.restaurant.timeZone}
    `);
  },

  update: (item) => {
    requireStaff();

    if (!STATUSES.includes(item.status)) {
      throw new ValidationError("Unknown ticket status.");
    }

    let row = sql<Ticket>(`
      update orders o set status = ${item.status}, statusAt = now()
       where o.id = ${item.id} and o.status <> 'pending'
      returning ${columns()}
    `).first();

    if (!row) {
      throw new ValidationError("That order is not on the board.");
    }

    return row;
  },

  insert: () => {
    throw new ForbiddenError();
  },

  delete: () => {
    throw new ForbiddenError();
  },
});
