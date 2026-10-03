import { App, getEnv } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import signin from "#app/pages/signin";
import kitchen from "#app/pages/kitchen";
import orderStatus from "#app/pages/order-status";
import kitchenSoldOut from "#app/pages/kitchen-sold-out";
import admin from "#app/pages/admin";
import adminMenu from "#app/pages/admin-menu";
import adminHours from "#app/pages/admin-hours";
import checkoutTest from "#app/pages/checkout-test";
import checkoutReturn from "#app/routes/checkout-return";
import stripeWebhook from "#app/routes/stripe-webhook";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";
import { stripeConfigured } from "#app/shared/stripe";

if (getEnv() === "production" && !stripeConfigured()) {
  throw new Error("STRIPE_SECRET_KEY is required in production.");
}

const app = new App();

app.route("/", home);
app.route("/signin", signin);
app.route("/kitchen", kitchen);
app.route("/kitchen/sold-out", kitchenSoldOut);
app.route("/admin", admin);
app.route("/admin/menu", adminMenu);
app.route("/admin/hours", adminHours);
app.route("/orders/:id", orderStatus);
app.route("/checkout/test/:orderId", checkoutTest);
app.route("/checkout/return", checkoutReturn);
app.route({ method: "post", path: "/stripe/webhook", handler: stripeWebhook });

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
