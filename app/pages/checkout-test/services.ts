import { ForbiddenError, NotFoundError } from "@elements/app";
import { loadPendingOrder, recordPayment } from "#app/shared/services/checkout";
import { testCheckout } from "#app/shared/stripe";

/**
 * Pays a pending order on the test checkout. Development only, without a
 * Stripe key: it records the payment through the same function a Stripe
 * payment uses, so the board, the status page and the receipt all follow.
 *
 * @rpc
 */
export function payTestOrder(orderId: string) {
  if (!testCheckout()) {
    throw new ForbiddenError("The test checkout is off.");
  }

  let order = loadPendingOrder(orderId);

  if (!order) {
    throw new NotFoundError("This order is already paid.");
  }

  recordPayment(order.id, `test_${order.id}`, order.totalCents, "usd");
}
