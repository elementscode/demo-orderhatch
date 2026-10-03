import { sql, session, redirect, AuthError, ForbiddenError } from "@elements/app";

export type Role = "staff" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  return role === "owner" ? "/admin" : "/kitchen";
}

/** @rpc */
export function signin(email: string, password: string): string {
  let address = email.trim().toLowerCase();

  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  let user = sql<User>(`
    select id, name, email, role from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("That email and password don't match an account.");
  }

  session.login({ userId: user.id, userName: user.name, role: user.role });

  return homeFor(user.role);
}

/** @rpc */
export function signout() {
  session.logout();
}

/**
 * The signed-in user, read from the database on every call so a role change
 * takes effect at once. Throws 401 when signed out.
 */
export function currentUser(): User {
  session.isLoggedInOrThrow();

  let user = sql<User>(`
    select id, name, email, role from users where id = ${session.getOrThrow("userId")}
  `).first();

  if (!user) {
    throw new AuthError();
  }

  return user;
}

/** The kitchen: staff and the owner. */
export function requireStaff(): User {
  return currentUser();
}

export function requireOwner(): User {
  let user = currentUser();

  if (user.role !== "owner") {
    throw new ForbiddenError("Owner access required.");
  }

  return user;
}

/**
 * For page routes: sends a signed-out visitor to sign in and a cook who
 * opened an owner page to the kitchen. Returns false when it redirected.
 */
export function allowPage(role: Role): boolean {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return false;
  }

  let user = currentUser();

  if (role === "owner" && user.role !== "owner") {
    redirect("/kitchen");
    return false;
  }

  return true;
}
