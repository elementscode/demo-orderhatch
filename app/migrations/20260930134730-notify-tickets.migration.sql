-- notify tickets
--
-- Orders change from the checkout return page, the Stripe webhook and the
-- kitchen board. This trigger makes every one of those writes live on the
-- kitchen, the owner dashboard and the customer's status page.

create or replace function jsDate(t timestamptz) returns json
language sql immutable as $$
  select case when t is null then null
         else json_build_object('$type', 'Date', '$value', (extract(epoch from t) * 1000)::bigint)
         end;
$$;

create or replace function ticketItems(o uuid) returns json
language sql stable as $$
  select coalesce(json_agg(json_build_object(
           'id', l.id,
           'name', l.name,
           'quantity', l.quantity,
           'unitCents', l.unitCents,
           'choices', l.choices
         ) order by l.position), '[]'::json)
    from orderLines l
   where l.orderId = o;
$$;

create or replace function ticketsNotify() returns trigger
language plpgsql as $$
declare
  r record;
  payload text;
begin
  r := coalesce(new, old);

  payload := json_build_object(
    'op', lower(tg_op),
    'data', json_build_object(
      'id', r.id,
      'number', r.number,
      'status', r.status,
      'customerName', r.customerName,
      'phone', r.phone,
      'email', r.email,
      'pickupAt', jsDate(r.pickupAt),
      'subtotalCents', r.subtotalCents,
      'taxCents', r.taxCents,
      'totalCents', r.totalCents,
      'paidAt', jsDate(r.paidAt),
      'statusAt', jsDate(r.statusAt),
      'createdAt', jsDate(r.createdAt),
      'items', ticketItems(r.id)
    )
  )::text;

  if octet_length(payload) >= 8000 then
    payload := json_build_object('op', lower(tg_op), 'id', r.id)::text;
  end if;

  perform pg_notify(channel_name('orders'), payload);

  return r;
end;
$$;

create trigger ticketsNotifyTrigger
  after insert or update or delete on orders
  for each row execute function ticketsNotify();
