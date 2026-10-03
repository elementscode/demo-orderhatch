import { test, assert, equal, session, AuthError } from "@elements/app";
import { seedFixture } from "#app/shared/testing/fixtures";
import { signin } from "#app/shared/services/auth";

test("signin", () => {
  seedFixture();

  test("the owner lands on the dashboard, staff on the kitchen", () => {
    equal(signin("O@TEST", "pw"), "/admin");
    equal(session.get("role"), "owner");

    session.logout();
    equal(signin("s@test", "pw"), "/kitchen");
  });

  test("a wrong password is refused", async () => {
    let threw: unknown;

    try {
      await signin("o@test", "nope");
    } catch (err) {
      threw = err;
    }

    assert(threw instanceof AuthError, `got ${threw}`);
    assert(!session.isLoggedIn());
  });
});
