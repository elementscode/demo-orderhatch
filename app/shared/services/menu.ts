import { LiveTable, sql, ValidationError } from "@elements/app";
import config from "#config";
import { requireOwner, requireStaff } from "#app/shared/services/auth";
import { Category, MenuItem, OptionGroup } from "#app/shared/menu";

function columns() {
  return sql.raw(`
    m.id, m.categoryId, m.name, m.description, m.priceCents, m.photo,
    m.optionGroupIds, m.hidden, m.soldOutUntil, m.position, m.createdAt
  `);
}

/** The end of today's business day, when a sold-out item comes back. */
function endOfDay() {
  return sql.raw(`(date_trunc('day', now() at time zone ${config.restaurant.timeZone}) + interval '1 day') at time zone ${config.restaurant.timeZone}`);
}

function check(item: Partial<MenuItem>) {
  if (!item.name?.trim()) {
    throw new ValidationError("Give the item a name.");
  }

  if (!Number.isInteger(item.priceCents) || item.priceCents! < 0) {
    throw new ValidationError("Price must be zero or more.");
  }
}

/**
 * Every item, hidden ones included; the customer menu filters them out. Staff
 * may only change soldOutUntil, and the server decides when "sold out today"
 * ends.
 */
export let menuItems: LiveTable<MenuItem> = new LiveTable<MenuItem>({
  select: () => sql<MenuItem>(`select ${columns()} from menuItems m`),

  insert: (item) => {
    requireOwner();
    check(item);

    return sql<MenuItem>(`
      insert into menuItems as m (id, categoryId, name, description, priceCents, photo, optionGroupIds, hidden, position)
           values (${item.id}, ${item.categoryId}, ${item.name!.trim()}, ${item.description ?? ""}, ${item.priceCents},
                   ${item.photo ?? ""}, ${JSON.stringify(item.optionGroupIds ?? [])}::jsonb, ${item.hidden ?? false}, ${item.position ?? 0})
      returning ${columns()}
    `).firstOrThrow();
  },

  update: (item) => {
    let user = requireStaff();
    let soldOut = item.soldOutUntil ? endOfDay() : sql.raw(`null`);

    if (user.role !== "owner") {
      return sql<MenuItem>(`
        update menuItems m set soldOutUntil = ${soldOut} where m.id = ${item.id}
        returning ${columns()}
      `).firstOrThrow();
    }

    check(item);

    return sql<MenuItem>(`
      update menuItems m set
        categoryId = ${item.categoryId},
        name = ${item.name.trim()},
        description = ${item.description},
        priceCents = ${item.priceCents},
        photo = ${item.photo},
        optionGroupIds = ${JSON.stringify(item.optionGroupIds)}::jsonb,
        hidden = ${item.hidden},
        position = ${item.position},
        soldOutUntil = ${soldOut}
      where m.id = ${item.id}
      returning ${columns()}
    `).firstOrThrow();
  },

  delete: (item) => {
    requireOwner();
    sql(`delete from menuItems where id = ${item.id}`);
  },
});

export function loadCategories(): Category[] {
  return sql<Category>(`select id, name, blurb, position from categories order by position, name`).all();
}

export function loadOptionGroups(): OptionGroup[] {
  return sql<OptionGroup>(`
    select g.id, g.name, g.kind, g.required,
           coalesce((select json_agg(json_build_object('id', o.id, 'name', o.name, 'priceCents', o.priceCents) order by o.position)
                       from options o where o.groupId = g.id), '[]') as options
      from optionGroups g
     order by g.position
  `).all();
}

