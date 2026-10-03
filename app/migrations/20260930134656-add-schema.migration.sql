-- add schema

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create type userRole as enum ('staff', 'owner');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  passwordHash text not null,
  role userRole not null default 'staff'
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table categories (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null,
  blurb text not null default '',
  position integer not null default 0
);

create trigger categoriesTouchUpdatedAt
  before update on categories
  for each row execute function touchUpdatedAt();

-- kind 'one' is a pick-one group (protein, salsa); 'many' is add-ons.
create table optionGroups (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null,
  kind text not null check (kind in ('one', 'many')),
  required boolean not null default false,
  position integer not null default 0
);

create trigger optionGroupsTouchUpdatedAt
  before update on optionGroups
  for each row execute function touchUpdatedAt();

create table options (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  groupId uuid not null references optionGroups (id) on delete cascade,
  name text not null,
  priceCents integer not null default 0,
  position integer not null default 0
);

create trigger optionsTouchUpdatedAt
  before update on options
  for each row execute function touchUpdatedAt();

-- soldOutUntil is the end of the business day an item sold out on, so it comes
-- back on the menu by itself the next morning.
create table menuItems (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  categoryId uuid not null references categories (id),
  name text not null,
  description text not null default '',
  priceCents integer not null check (priceCents >= 0),
  photo text not null default '',
  optionGroupIds jsonb not null default '[]',
  hidden boolean not null default false,
  soldOutUntil timestamptz,
  position integer not null default 0
);

create index menuItemsCategory on menuItems (categoryId, position);

create trigger menuItemsTouchUpdatedAt
  before update on menuItems
  for each row execute function touchUpdatedAt();

-- One row per weekday, 0 = Sunday, in the restaurant's time zone.
create table hours (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  weekday integer not null unique check (weekday between 0 and 6),
  opensAt time not null default '11:00',
  closesAt time not null default '21:00',
  closed boolean not null default false
);

create trigger hoursTouchUpdatedAt
  before update on hours
  for each row execute function touchUpdatedAt();

insert into hours (weekday, opensAt, closesAt, closed) values
  (0, '10:00', '20:00', false),
  (1, '10:30', '21:00', false),
  (2, '10:30', '21:00', false),
  (3, '10:30', '21:00', false),
  (4, '10:30', '21:00', false),
  (5, '10:30', '22:00', false),
  (6, '10:00', '22:00', false);

create sequence orderNumbers start 1001;

-- pending: created, not paid yet. new, preparing, ready: on the kitchen
-- board. done: picked up.
create table orders (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  number integer not null default nextval('orderNumbers'),
  status text not null default 'pending' check (status in ('pending', 'new', 'preparing', 'ready', 'done')),
  customerName text not null,
  phone text not null,
  email text not null,
  pickupAt timestamptz,
  subtotalCents integer not null,
  taxCents integer not null,
  totalCents integer not null,
  paidAt timestamptz,
  statusAt timestamptz not null default now()
);

create index ordersCreatedAt on orders (createdAt);

create trigger ordersTouchUpdatedAt
  before update on orders
  for each row execute function touchUpdatedAt();

create table orderLines (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  orderId uuid not null references orders (id) on delete cascade,
  menuItemId uuid references menuItems (id) on delete set null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unitCents integer not null,
  choices jsonb not null default '[]',
  position integer not null default 0
);

create index orderLinesOrder on orderLines (orderId);

create trigger orderLinesTouchUpdatedAt
  before update on orderLines
  for each row execute function touchUpdatedAt();

create table payments (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  stripeSessionId text not null unique,
  orderId uuid not null references orders (id),
  amountTotal integer not null,
  currency text not null
);

create trigger paymentsTouchUpdatedAt
  before update on payments
  for each row execute function touchUpdatedAt();
