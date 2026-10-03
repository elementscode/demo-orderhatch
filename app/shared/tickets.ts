export type OrderStatus = "pending" | "new" | "preparing" | "ready" | "done";

export interface Choice {
  group: string;
  name: string;
  priceCents: number;
}

export interface TicketItem {
  id: string;
  name: string;
  quantity: number;
  unitCents: number;
  choices: Choice[];
}

/** An order with its lines, the row the kitchen, the owner and the customer watch. */
export interface Ticket {
  id: string;
  number: number;
  status: OrderStatus;
  customerName: string;
  phone: string;
  email: string;
  pickupAt: Date | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidAt: Date | null;
  statusAt: Date;
  createdAt: Date;
  items: TicketItem[];
}

/** The column a ticket moves to when the kitchen taps it. */
export function nextStatus(status: OrderStatus): OrderStatus {
  switch (status) {
    case "new":
      return "preparing";

    case "preparing":
      return "ready";

    default:
      return "done";
  }
}

export function previousStatus(status: OrderStatus): OrderStatus {
  switch (status) {
    case "done":
      return "ready";

    case "ready":
      return "preparing";

    default:
      return "new";
  }
}

/** One line of options as a customer or a cook reads it: "Al pastor · Verde · + Guacamole". */
export function choiceSummary(choices: Choice[]): string {
  return choices.map((c) => (c.group === "Add-ons" ? `+ ${c.name}` : c.name)).join(" · ");
}

/** When the kitchen should start the clock: when it was paid for. */
export function placedAt(t: Ticket): Date {
  return new Date(t.paidAt ?? t.createdAt);
}
