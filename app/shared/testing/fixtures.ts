import { session, sql } from "@elements/app";

export interface Fixture {
  categoryId: string;
  proteinId: string;
  addOnsId: string;
  pastorId: string;
  asadaId: string;
  guacId: string;
  tacosId: string;
  horchataId: string;
  ownerId: string;
  staffId: string;
}

/** A tiny menu, two accounts, and a restaurant open all day, for tests. */
export function seedFixture(): Fixture {
  sql(`update hours set opensAt = '00:00', closesAt = '23:59', closed = false`);

  let one = (query: ReturnType<typeof sql>) => (query.firstOrThrow() as { id: string }).id;

  let categoryId = one(sql(`insert into categories (name, position) values ('Tacos', 1) returning id`));
  let proteinId = one(sql(`insert into optionGroups (name, kind, required, position) values ('Protein', 'one', true, 1) returning id`));
  let addOnsId = one(sql(`insert into optionGroups (name, kind, required, position) values ('Add-ons', 'many', false, 2) returning id`));
  let pastorId = one(sql(`insert into options (groupId, name, priceCents, position) values (${proteinId}, 'Al pastor', 0, 1) returning id`));
  let asadaId = one(sql(`insert into options (groupId, name, priceCents, position) values (${proteinId}, 'Carne asada', 100, 2) returning id`));
  let guacId = one(sql(`insert into options (groupId, name, priceCents, position) values (${addOnsId}, 'Guacamole', 225, 1) returning id`));
  let tacosId = one(sql(`
    insert into menuItems (categoryId, name, priceCents, optionGroupIds, position)
         values (${categoryId}, 'Street Tacos', 1050, ${JSON.stringify([proteinId, addOnsId])}::jsonb, 1)
    returning id
  `));
  let horchataId = one(sql(`insert into menuItems (categoryId, name, priceCents, position) values (${categoryId}, 'Horchata', 400, 2) returning id`));
  let ownerId = one(sql(`insert into users (email, name, passwordHash, role) values ('o@test', 'Owner', crypt('pw', genSalt('bf', 4)), 'owner') returning id`));
  let staffId = one(sql(`insert into users (email, name, passwordHash, role) values ('s@test', 'Staff', crypt('pw', genSalt('bf', 4)), 'staff') returning id`));

  return { categoryId, proteinId, addOnsId, pastorId, asadaId, guacId, tacosId, horchataId, ownerId, staffId };
}

export function loginAs(userId: string, role: "staff" | "owner") {
  session.login({ userId, userName: role, role });
}
