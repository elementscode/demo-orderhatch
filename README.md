![Online ordering with a kitchen display, built by Claude Code on Elements: the menu with photos and prices for street tacos, fish tacos, shrimp tacos and a taco sampler, beside a cart with options, quantities and a total.](https://elements.dev/demos/01a0f44c-eff4-72bd-8850-b62e0d56b6cd/poster?v=2cdefae254ce)

# Online ordering with a kitchen display, built by Claude Code on Elements

> Orderhatch is a full-stack app built with Claude Code on Elements.

A photo menu, card checkout and a live order status page, plus a kitchen board with ticket timers and sold-out toggles.

[Run this app on your machine](https://elements.dev/demos/01a0f44c-eff4-72bd-8850-b62e0d56b6cd). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## Payments

Without a Stripe key, payments run through the app's built-in test checkout:
the pay button opens a page with the order, the total and one Pay button, and
paying it sends the order to the kitchen and emails the receipt exactly as a
card payment does. No card details are asked for. For real Stripe Checkout,
create a free sandbox at
[dashboard.stripe.com/register](https://dashboard.stripe.com/register) and add
its secret key as `STRIPE_SECRET_KEY` in `config/env/development.env`; the
same button then goes to Stripe, and card 4242 4242 4242 4242 pays. In
development an order goes to the kitchen when Stripe sends the customer back,
so no webhook is needed. Production requires the key (the build and the app
both refuse to run without it) and registers its own Stripe webhook the first
time a customer checks out.

## How it's built

Orderhatch needed card checkout, a kitchen board that fills as orders are paid, a live status page for each customer, email receipts, and sold-out items that update on every screen. Each of those is a part of Elements, so the agent spent its 28 minutes on the taqueria app itself.

- **A live kitchen board.** Orders are a LiveTable, so a paid order appears on the kitchen display the moment it lands, a tap moves the ticket between columns, and the customer's status page moves from received to preparing to ready with it.

- **Live sold-out items.** The menu is a LiveTable too. Kitchen staff mark an item sold out, it comes back at the end of the business day, and every customer's menu shows it at once.

- **Card checkout.** Placing an order is one `@rpc` call that prices the cart on the server, holds the order off the board and sends the customer to Stripe. The order moves to the kitchen once whether the return page or Stripe's webhook arrives first. Without a Stripe key, a test checkout inside the app records the payment through the same function, and production registers its own webhook.

- **Email receipts.** The payment and the receipt job are recorded in one transaction, and the job emails the receipt.

- **Data from SQL files.** Migrations define the app and seed the owner, a staff account, twenty items in five categories with photos and options, opening hours, and a lunch rush of seventeen orders timed from when the seed runs.

- **Sessions and roles.** Kitchen pages check for staff and the owner's pages check for the owner.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
