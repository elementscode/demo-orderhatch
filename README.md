![Orderhatch, online ordering for a neighborhood taqueria built with Elements: the menu with photos and prices for street tacos, fish tacos, shrimp tacos and a taco sampler, beside a cart with options, quantities and a total.](https://elements.dev/demos/01a0f44c-eff4-72bd-8850-b62e0d56b6cd/poster?v=2cdefae254ce)

# Orderhatch

> A demo app built with [Elements](https://elements.dev).

A photo menu, card checkout and a live order status page, plus a kitchen board with ticket timers and sold-out toggles.

**Demo:** [Orderhatch](https://elements.dev/demos/01a0f44c-eff4-72bd-8850-b62e0d56b6cd)

## Agent specs

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 28 min
- **Cost:** $9.45 at API rates, September 2026

## Get started

```bash
elements create orderhatch -scaffold=elementscode/demo-orderhatch
```

## Seed data and demo accounts

The seed sets up La Esquina Taquería, a made-up taqueria: twenty menu items in
five categories (tacos, burritos, plates, sides, drinks and sweets) with
photos, option groups for protein, salsa and add-ons, opening hours, and a
lunch rush of seventeen orders across new, preparing, ready and picked up.
The rush is timed from when the seed runs, so the kitchen timers start fresh
on a new database. The sign-in page lists both accounts.

| Email                   | Password        | Role                                   |
| ----------------------- | --------------- | -------------------------------------- |
| owner@orderhatch.test   | `hatch-owner`   | Owner: menu, hours, today's orders     |
| kitchen@orderhatch.test | `hatch-kitchen` | Kitchen staff: ticket board, sold out  |

Customers order from `/` without an account. The kitchen display is at
`/kitchen`, sold-out toggles at `/kitchen/sold-out`, and the owner's pages at
`/admin`, `/admin/menu` and `/admin/hours`.

Menu photos are CC0 or public domain, from Wikimedia Commons.

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

### What Elements gave the app

- **A live kitchen board.** Orders are a LiveTable, so a paid order appears on the kitchen display the moment it lands, a tap moves the ticket between columns, and the customer's status page moves from received to preparing to ready with it.

- **Live sold-out items.** The menu is a LiveTable too. Kitchen staff mark an item sold out, it comes back at the end of the business day, and every customer's menu shows it at once.

- **Card checkout.** Placing an order is one `@rpc` call that prices the cart on the server, holds the order off the board and sends the customer to Stripe. The order moves to the kitchen once whether the return page or Stripe's webhook arrives first. Without a Stripe key, a test checkout inside the app records the payment through the same function, and production registers its own webhook.

- **Email receipts.** The payment and the receipt job are recorded in one transaction, and the job emails the receipt.

- **Data from SQL files.** Migrations define the app and seed the owner, a staff account, twenty items in five categories with photos and options, opening hours, and a lunch rush of seventeen orders timed from when the seed runs.

- **Sessions and roles.** Kitchen pages check for staff and the owner's pages check for the owner.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 29 tests pass. Every page works on desktop and phone. A real sandbox payment went through Stripe end to end.

**Demo:** [Orderhatch](https://elements.dev/demos/01a0f44c-eff4-72bd-8850-b62e0d56b6cd)

## License

MIT. See [LICENSE](LICENSE).
