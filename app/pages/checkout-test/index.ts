import { NotFoundError, Request, Response, redirect } from "@elements/app";
import { loadPendingOrder } from "#app/shared/services/checkout";
import { testCheckout } from "#app/shared/stripe";
import html from "./template";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Stands in for Stripe's hosted checkout in development without a key. Like
 * the status page, the unguessable order id is the capability.
 */
export default function route(req: Request, res: Response) {
  let id = String(req.params.orderId ?? "");

  if (!testCheckout() || !UUID.test(id)) {
    throw new NotFoundError();
  }

  let order = loadPendingOrder(id);

  if (!order) {
    // Already paid, or not an order: the status page knows which.
    redirect(`/orders/${id}`);
    return;
  }

  return new html({ order });
}
