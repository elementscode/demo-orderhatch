-- demo data: the owner, one kitchen account, the menu and a lunch rush

insert into users (email, name, passwordHash, role) values
  ('owner@orderhatch.test', 'Rosa Méndez', crypt('hatch-owner', genSalt('bf', 12)), 'owner'),
  ('kitchen@orderhatch.test', 'Luis Ortega', crypt('hatch-kitchen', genSalt('bf', 12)), 'staff');

insert into categories (name, blurb, position) values
  ('Tacos', 'Corn tortillas pressed to order, onion, cilantro.', 1),
  ('Burritos', 'Flour tortillas, wrapped tight or smothered in salsa.', 2),
  ('Plates', 'Off the comal and out of the oven.', 3),
  ('Sides', 'For the table.', 4),
  ('Drinks & Sweets', 'Made in house every morning.', 5);

insert into optionGroups (name, kind, required, position) values
  ('Protein', 'one', true, 1),
  ('Salsa', 'one', true, 2),
  ('Add-ons', 'many', false, 3);

insert into options (groupId, name, priceCents, position)
  select g.id, o.name, o.priceCents, o.position
    from optionGroups g
    join (values
      ('Protein', 'Al pastor', 0, 1),
      ('Protein', 'Carne asada', 100, 2),
      ('Protein', 'Carnitas', 0, 3),
      ('Protein', 'Pollo asado', 0, 4),
      ('Protein', 'Chorizo', 0, 5),
      ('Protein', 'Hongos (mushroom)', 0, 6),
      ('Salsa', 'Roja', 0, 1),
      ('Salsa', 'Verde', 0, 2),
      ('Salsa', 'Habanero', 0, 3),
      ('Salsa', 'Pico de gallo', 0, 4),
      ('Salsa', 'No salsa', 0, 5),
      ('Add-ons', 'Guacamole', 225, 1),
      ('Add-ons', 'Queso Oaxaca', 100, 2),
      ('Add-ons', 'Crema', 50, 3),
      ('Add-ons', 'Grilled onions & jalapeños', 75, 4),
      ('Add-ons', 'Extra meat', 250, 5)
    ) as o (groupName, name, priceCents, position) on o.groupName = g.name;

insert into menuItems (categoryId, name, description, priceCents, photo, optionGroupIds, position)
  select c.id, i.name, i.description, i.priceCents, i.photo,
         coalesce((select jsonb_agg(g.id order by g.position)
                     from optionGroups g
                    where g.name = any (string_to_array(i.groups, ','))), '[]'::jsonb),
         i.position
    from categories c
    join (values
      ('Tacos', 'Street Tacos', 'Three tacos on fresh corn tortillas with onion, cilantro and lime.', 1050, 'street-tacos', 'Protein,Salsa,Add-ons', 1),
      ('Tacos', 'Baja Fish Tacos', 'Two beer-battered rockfish tacos, cabbage slaw, pico, chipotle crema.', 1100, 'baja-fish-taco', 'Salsa,Add-ons', 2),
      ('Tacos', 'Shrimp Tacos', 'Two tacos of garlic shrimp, avocado crema, cilantro and cheddar.', 1250, 'shrimp-tacos', 'Salsa,Add-ons', 3),
      ('Tacos', 'Taco Sampler', 'Four tacos, one each: al pastor, carne asada, cochinita pibil, hongos.', 1450, 'taco-sampler', 'Salsa,Add-ons', 4),
      ('Burritos', 'Classic Burrito', 'Rice, pinto beans, peppers, onion, cilantro and your choice of protein.', 1250, 'burrito', 'Protein,Salsa,Add-ons', 1),
      ('Burritos', 'California Burrito', 'Carne asada, cheese, guacamole and crema, with fries on the side.', 1400, 'california-burrito', 'Salsa,Add-ons', 2),
      ('Burritos', 'Burrito Mojado', 'Smothered in salsa verde and melted cheese, topped with crema.', 1350, 'burrito-mojado', 'Protein,Add-ons', 3),
      ('Burritos', 'Breakfast Burrito', 'Eggs, peppers, cheese and chorizo, with crispy potatoes. Served all day.', 1100, 'breakfast-burrito', 'Salsa,Add-ons', 4),
      ('Plates', 'Quesadilla', 'Flour tortilla, Oaxaca cheese and your protein, with pico and lettuce.', 1000, 'quesadilla', 'Protein,Salsa,Add-ons', 1),
      ('Plates', 'Enchiladas de Mole', 'Chicken enchiladas in mole poblano, red rice, black beans, pico.', 1450, 'enchilada-plate', '', 2),
      ('Plates', 'Tamales Oaxaqueños', 'Two pork tamales steamed in banana leaf, salsa roja, lime.', 1150, 'tamales', '', 3),
      ('Plates', 'Enchiladas Rojas', 'Four cheese enchiladas baked in red chile sauce. Vegetarian.', 1300, 'enchiladas-rojas', 'Add-ons', 4),
      ('Sides', 'Chips & Guacamole', 'Guacamole in the molcajete with pico and warm chips.', 750, 'chips-guacamole', '', 1),
      ('Sides', 'Elote', 'Grilled corn, butter, cotija, chile and lime.', 500, 'elote', '', 2),
      ('Sides', 'Nachos', 'Chips, queso, black beans, corn, pico, jalapeños and chipotle crema.', 950, 'nachos', '', 3),
      ('Sides', 'Chips & Salsa', 'Warm chips and a bowl of salsa roja.', 450, 'chips-salsa', '', 4),
      ('Drinks & Sweets', 'Horchata', 'Rice, cinnamon and vanilla. 24 oz.', 400, 'horchata', '', 1),
      ('Drinks & Sweets', 'Agua de Jamaica', 'Hibiscus over ice, lightly sweetened. 24 oz.', 400, 'jamaica', '', 2),
      ('Drinks & Sweets', 'Flan', 'Vanilla custard under burnt caramel.', 500, 'flan', '', 3),
      ('Drinks & Sweets', 'Churros', 'Three churros, cinnamon sugar, cajeta for dipping.', 600, 'churros', '', 4)
    ) as i (category, name, description, priceCents, photo, groups, position) on i.category = c.name;

-- A lunch rush, timed against when this seed runs. lines is
-- [{ "item": name, "qty": n, "pick": [option names] }].
create function seedOrder(customer text, phone text, status text, minutesAgo integer, pickupIn integer, lines jsonb)
returns void
language plpgsql as $$
declare
  orderId uuid;
  line jsonb;
  item record;
  pos integer := 0;
  unit integer;
  choices jsonb;
  subtotal integer := 0;
  tax integer;
  paid timestamptz := now() - make_interval(mins => minutesAgo);
begin
  insert into orders (customerName, phone, email, status, pickupAt, subtotalCents, taxCents, totalCents, paidAt, statusAt, createdAt)
  values (customer, phone, lower(split_part(customer, ' ', 1)) || '@example.com', status,
          case when pickupIn is null then null else now() + make_interval(mins => pickupIn) end,
          0, 0, 0, paid,
          case status
            when 'new' then paid
            when 'preparing' then paid + make_interval(mins => least(minutesAgo, 3))
            when 'ready' then paid + make_interval(mins => least(minutesAgo, 11))
            else paid + make_interval(mins => least(minutesAgo, 16))
          end,
          paid - interval '1 minute')
  returning id into orderId;

  for line in select * from jsonb_array_elements(lines) loop
    pos := pos + 1;
    select * into item from menuItems where name = line->>'item';

    select coalesce(jsonb_agg(jsonb_build_object('group', g.name, 'name', o.name, 'priceCents', o.priceCents) order by g.position, o.position), '[]'::jsonb),
           coalesce(sum(o.priceCents), 0)
      into choices, unit
      from options o
      join optionGroups g on g.id = o.groupId
     where o.name in (select jsonb_array_elements_text(coalesce(line->'pick', '[]'::jsonb)));

    unit := unit + item.priceCents;
    subtotal := subtotal + unit * (line->>'qty')::integer;

    insert into orderLines (orderId, menuItemId, name, quantity, unitCents, choices, position)
    values (orderId, item.id, item.name, (line->>'qty')::integer, unit, choices, pos);
  end loop;

  tax := round(subtotal * 0.095);
  update orders set subtotalCents = subtotal, taxCents = tax, totalCents = subtotal + tax where id = orderId;
end;
$$;

select seedOrder('Marisol Vega', '(323) 555-0142', 'done', 128, null, '[{"item": "Street Tacos", "qty": 2, "pick": ["Al pastor", "Verde"]}, {"item": "Horchata", "qty": 2}]');
select seedOrder('Dev Patel', '(213) 555-0199', 'done', 117, null, '[{"item": "California Burrito", "qty": 1, "pick": ["Roja"]}, {"item": "Agua de Jamaica", "qty": 1}]');
select seedOrder('Hannah Brooks', '(323) 555-0107', 'done', 104, null, '[{"item": "Burrito Mojado", "qty": 1, "pick": ["Pollo asado", "Guacamole"]}, {"item": "Agua de Jamaica", "qty": 1}]');
select seedOrder('Tomás Rivera', '(626) 555-0163', 'done', 96, null, '[{"item": "Shrimp Tacos", "qty": 1, "pick": ["Habanero"]}, {"item": "Elote", "qty": 1}]');
select seedOrder('Grace Kim', '(213) 555-0120', 'done', 87, null, '[{"item": "Baja Fish Tacos", "qty": 2, "pick": ["Verde"]}, {"item": "Chips & Guacamole", "qty": 1}]');
select seedOrder('Andre Wallace', '(323) 555-0181', 'done', 74, null, '[{"item": "Classic Burrito", "qty": 2, "pick": ["Carne asada", "Roja", "Queso Oaxaca"]}, {"item": "Chips & Salsa", "qty": 1}]');
select seedOrder('Priya Shah', '(818) 555-0138', 'done', 61, null, '[{"item": "Tamales Oaxaqueños", "qty": 1}, {"item": "Quesadilla", "qty": 1, "pick": ["Hongos (mushroom)", "Pico de gallo"]}]');
select seedOrder('Sam O''Connor', '(323) 555-0110', 'done', 48, null, '[{"item": "Enchiladas de Mole", "qty": 1}, {"item": "Churros", "qty": 1}]');
select seedOrder('Lucia Fernández', '(213) 555-0174', 'ready', 21, null, '[{"item": "Street Tacos", "qty": 1, "pick": ["Carne asada", "Roja", "Grilled onions & jalapeños"]}, {"item": "Nachos", "qty": 1}, {"item": "Horchata", "qty": 1}]');
select seedOrder('Ben Adeyemi', '(323) 555-0156', 'ready', 17, null, '[{"item": "Breakfast Burrito", "qty": 2, "pick": ["Roja"]}]');
select seedOrder('Chloe Martin', '(626) 555-0102', 'preparing', 13, null, '[{"item": "Taco Sampler", "qty": 2, "pick": ["Roja"]}, {"item": "Flan", "qty": 1}, {"item": "Agua de Jamaica", "qty": 2}]');
select seedOrder('Jorge Castillo', '(213) 555-0147', 'preparing', 10, null, '[{"item": "Quesadilla", "qty": 1, "pick": ["Al pastor", "Verde"]}, {"item": "Elote", "qty": 2}]');
select seedOrder('Nina Kowalski', '(818) 555-0191', 'preparing', 8, null, '[{"item": "Enchiladas Rojas", "qty": 1, "pick": ["Guacamole", "Crema"]}]');
select seedOrder('Ray Delgado', '(323) 555-0115', 'new', 6, null, '[{"item": "Street Tacos", "qty": 3, "pick": ["Al pastor", "Habanero"]}, {"item": "Horchata", "qty": 3}]');
select seedOrder('Emily Nguyen', '(213) 555-0133', 'new', 4, null, '[{"item": "Quesadilla", "qty": 1, "pick": ["Pollo asado", "Roja", "Crema"]}, {"item": "Horchata", "qty": 1}]');
select seedOrder('Marcus Hill', '(626) 555-0168', 'new', 2, null, '[{"item": "California Burrito", "qty": 1, "pick": ["Pico de gallo", "Extra meat"]}, {"item": "Chips & Guacamole", "qty": 1}]');
select seedOrder('Office lunch: Ana Ruiz', '(213) 555-0126', 'new', 1, 45, '[{"item": "Classic Burrito", "qty": 4, "pick": ["Carnitas", "Verde"]}, {"item": "Street Tacos", "qty": 2, "pick": ["Chorizo", "Roja"]}, {"item": "Churros", "qty": 2}]');

drop function seedOrder(text, text, text, integer, integer, jsonb);
