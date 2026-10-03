import { Request, Response, redirect } from "@elements/app";
import { fulfillCheckout } from "#app/shared/services/checkout";

/**
 * Stripe sends the customer here after paying. Fulfilling on return means
 * development needs no webhook; the order page then shows its status live.
 */
export default async function route(req: Request, res: Response) {
  let orderId = await fulfillCheckout(String(req.query.session_id ?? ""));

  redirect(orderId ? `/orders/${orderId}` : "/");
}
