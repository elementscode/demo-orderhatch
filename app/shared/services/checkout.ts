import type Stripe from "stripe";
import { AppError, FieldErrors, getAppUrl, sql, tx, ValidationError } from "@elements/app";
import { SendReceiptJob } from "#app/jobs/send-receipt";
import { taxFor } from "#app/shared/format";
import { isSoldOut, MenuItem } from "#app/shared/menu";
import { Choice } from "#app/shared/tickets";
import { todaySchedule } from "#app/shared/services/hours";
import { loadOptionGroups } from "#app/shared/services/menu";
import { stripe, testCheckout } from "#app/shared/stripe";
import { ensureWebhook } from "#app/shared/stripe-webhook";

export interface CartLine {
  itemId: string;
  quantity: number;
  optionIds: string[];
}

export interface OrderForm {
  name: string;
  phone: string;
  email: string;
  /** "asap", or the ISO time of a slot from today's schedule. */
  pickup: string;
  lines: CartLine[];
}

export interface PricedLine {
  menuItemId: string;
  name: string;
  quantity: number;
  unitCents: number;
  choices: Choice[];
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

const MAX_QUANTITY = 20;

/**
 * Prices a cart from the database. The browser sends ids and counts only, so
 * a price, an option or a sold-out item can never come from the client.
 */
export function priceCart(lines: CartLine[], now: Date = new Date()): PricedCart {
  if (lines.length === 0) {
    throw new ValidationError("Your cart is empty.");
  }

  let groups = loadOptionGroups();
  let ids = lines.map((l) => l.itemId);
  let items = sql<MenuItem>(`
    select id, categoryId, name, description, priceCents, photo, optionGroupIds, hidden, soldOutUntil, position, createdAt
      from menuItems
     where id = any (${ids}::uuid[])
  `).all();

  let priced: PricedLine[] = lines.map((line) => {
    let item = items.find((i) => i.id === line.itemId);

    if (!item || item.hidden) {
      throw new ValidationError("Something in your cart is no longer on the menu.");
    }

    if (isSoldOut(item, now)) {
      throw new ValidationError(`Sorry, ${item.name} just sold out for today. Remove it to continue.`);
    }

    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) {
      throw new ValidationError(`Choose between 1 and ${MAX_QUANTITY} of ${item.name}.`);
    }

    let choices: Choice[] = [];

    for (let groupId of item.optionGroupIds) {
      let group = groups.find((g) => g.id === groupId);

      if (!group) {
        continue;
      }

      let picked = group.options.filter((o) => line.optionIds.includes(o.id));

      if (group.kind === "one" && picked.length > 1) {
        throw new ValidationError(`Choose one ${group.name.toLowerCase()} for ${item.name}.`);
      }

      if (group.required && picked.length === 0) {
        throw new ValidationError(`Choose a ${group.name.toLowerCase()} for ${item.name}.`);
      }

      for (let option of picked) {
        choices.push({ group: group.name, name: option.name, priceCents: option.priceCents });
      }
    }

    let known = choices.length;
    let sent = new Set(line.optionIds).size;

    if (known !== sent) {
      throw new ValidationError(`One of the options on ${item.name} isn't available.`);
    }

    let unitCents = item.priceCents + choices.reduce((sum, c) => sum + c.priceCents, 0);

    return { menuItemId: item.id, name: item.name, quantity: line.quantity, unitCents, choices };
  });

  let subtotalCents = priced.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
  let taxCents = taxFor(subtotalCents);

  return { lines: priced, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

/** Checks the customer's details and pickup time. Returns the pickup instant, or null for ASAP. */
export function checkDetails(form: OrderForm, now: Date = new Date()): Date | null {
  let errors: FieldErrors<OrderForm> = {};

  if (!form.name.trim()) {
    errors.name = ["Enter the name for the order."];
  }

  if (form.phone.replace(/\D/g, "").length < 10) {
    errors.phone = ["Enter a phone number we can text or call."];
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
    errors.email = ["Enter an email for your receipt."];
  }

  let schedule = todaySchedule(now);
  let pickupAt: Date | null = null;

  if (form.pickup === "asap") {
    if (!schedule.asap) {
      errors.pickup = ["We're not taking ASAP orders right now. Choose a pickup time."];
    }
  } else if (schedule.slots.some((s) => s.value === form.pickup)) {
    pickupAt = new Date(form.pickup);
  } else {
    errors.pickup = ["That pickup time isn't available any more. Choose another."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return pickupAt;
}

/** Records the order as pending, unpaid, and returns its id. */
export function createOrder(form: OrderForm, cart: PricedCart, pickupAt: Date | null): string {
  return tx(() => {
    let order = sql<{ id: string }>(`
      insert into orders (customerName, phone, email, pickupAt, subtotalCents, taxCents, totalCents)
           values (${form.name.trim()}, ${form.phone.trim()}, ${form.email.trim().toLowerCase()}, ${pickupAt},
                   ${cart.subtotalCents}, ${cart.taxCents}, ${cart.totalCents})
      returning id
    `).firstOrThrow();

    cart.lines.forEach((line, i) => {
      sql(`
        insert into orderLines (orderId, menuItemId, name, quantity, unitCents, choices, position)
             values (${order.id}, ${line.menuItemId}, ${line.name}, ${line.quantity}, ${line.unitCents},
                     ${JSON.stringify(line.choices)}::jsonb, ${i})
      `);
    });

    return order.id;
  });
}

/**
 * Places the order and returns the url to send the customer to: Stripe
 * Checkout, or the test checkout in development without a key. The order
 * stays pending, off the kitchen board, until it is paid.
 *
 * @rpc
 */
export async function placeOrder(form: OrderForm): Promise<string> {
  let pickupAt = checkDetails(form);
  let cart = priceCart(form.lines);
  let orderId = createOrder(form, cart, pickupAt);

  return await startCheckout(orderId);
}

/**
 * The customer's way back to checkout from the status page of an unpaid order.
 *
 * @rpc
 */
export async function resumePayment(orderId: string): Promise<string> {
  let order = sql<{ id: string }>(`
    select id from orders where id = ${orderId} and status = 'pending'
  `).first();

  if (!order) {
    throw new AppError("This order is already paid.");
  }

  return await startCheckout(order.id);
}

export interface CheckoutOrder {
  id: string;
  number: number;
  customerName: string;
  email: string;
  pickupAt: Date | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  lines: PricedLine[];
}

/** A pending order and its lines, priced as they were when it was placed. */
export function loadPendingOrder(orderId: string): CheckoutOrder | undefined {
  let order = sql<Omit<CheckoutOrder, "lines">>(`
    select id, number, customerName, email, pickupAt, subtotalCents, taxCents, totalCents
      from orders
     where id = ${orderId} and status = 'pending'
  `).first();

  if (!order) {
    return undefined;
  }

  let lines = sql<PricedLine>(`
    select menuItemId, name, quantity, unitCents, choices
      from orderLines
     where orderId = ${orderId}
     order by position
  `).all();

  return { ...order, lines };
}

/**
 * Returns the url to send the customer to for a pending order. Prices come
 * from the order's own rows, never from the browser.
 */
export async function startCheckout(orderId: string): Promise<string> {
  if (testCheckout()) {
    return `/checkout/test/${orderId}`;
  }

  let order = loadPendingOrder(orderId);

  if (!order) {
    throw new AppError("This order is already paid.");
  }

  await ensureWebhook();

  let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: "usd",
      unit_amount: line.unitCents,
      product_data: {
        name: line.name,
        ...(line.choices.length > 0 ? { description: line.choices.map((c) => c.name).join(", ") } : {}),
      },
    },
  }));

  lineItems.push({
    quantity: 1,
    price_data: { currency: "usd", unit_amount: order.taxCents, product_data: { name: "Sales tax" } },
  });

  let checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: order.email,
    client_reference_id: order.id,
    line_items: lineItems,
    success_url: `${getAppUrl()}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/orders/${order.id}`,
  });

  return checkout.url!;
}

/**
 * Records a paid session and puts the order on the kitchen board. Idempotent:
 * the return page and the webhook both call it, in either order, any number
 * of times. Returns the order id the session was for.
 */
export async function fulfillCheckout(sessionId: string): Promise<string | null> {
  let checkout = await stripe().checkout.sessions.retrieve(sessionId);
  let orderId = checkout.client_reference_id;

  if (!orderId) {
    return null;
  }

  if (checkout.payment_status !== "paid") {
    return orderId;
  }

  recordPayment(orderId, checkout.id, checkout.amount_total ?? 0, checkout.currency ?? "usd");

  return orderId;
}

/**
 * The one place a payment is recorded, real or test. The first call moves the
 * order to the board and queues the receipt; later calls do nothing.
 */
export function recordPayment(orderId: string, sessionId: string, amountTotal: number, currency: string) {
  tx(() => {
    sql(`
      insert into payments (stripeSessionId, orderId, amountTotal, currency)
           values (${sessionId}, ${orderId}, ${amountTotal}, ${currency})
      on conflict (stripeSessionId) do nothing
    `);

    let paid = sql(`
      update orders set status = 'new', paidAt = now(), statusAt = now()
       where id = ${orderId} and status = 'pending'
      returning id
    `).first();

    if (paid) {
      new SendReceiptJob({ orderId }).schedule();
    }
  });
}
