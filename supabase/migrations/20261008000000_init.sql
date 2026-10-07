-- Kain schema (KAIN_BUILD_PROMPT §6).
--
-- Reference data (markets, ingredients, recipes, prices) is readable by
-- everyone, including guests. User tables are readable and writable only by
-- their owner (Row Level Security). Nobody inserts into prices directly: the
-- log-purchase Edge Function checks each logged price and writes it.
--
-- New tables are not exposed to the Data API by default, so every grant
-- below is explicit.

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.unit_t as enum ('kg', 'L', 'pc', 'bundle', 'can', 'pack');
create type public.tier_t as enum ('contributor', 'user_log', 'da_market', 'da_avg', 'estimate');
create type public.price_status_t as enum ('accepted', 'flagged');
create type public.role_t as enum ('family', 'eatery');
create type public.plan_t as enum ('free', 'business');
create type public.meal_t as enum ('breakfast', 'ulam');

-- ---------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------
create table public.markets (
  id text primary key,
  name text not null,
  city text not null
);

create table public.ingredients (
  id text primary key,
  name text not null,
  aliases text[] not null default '{}',
  category text not null check (category in ('staple', 'fish', 'meat', 'egg', 'legume', 'canned', 'veg', 'spice', 'pantry')),
  unit public.unit_t not null,
  grams_per_unit numeric not null check (grams_per_unit > 0),
  edible_portion numeric not null check (edible_portion > 0 and edible_portion <= 1),
  -- per 100 g edible: {kcal, protein_g, iron_mg, vita_ug, calcium_mg, vitc_mg}
  nutrients jsonb not null
);

create table public.recipes (
  id text primary key,
  name text not null,
  meal_type public.meal_t not null,
  rice_g numeric not null default 0 check (rice_g >= 0),
  default_price numeric(10, 2) check (default_price > 0),
  order_g numeric check (order_g > 0)
);

create table public.recipe_items (
  recipe_id text not null references public.recipes (id) on delete cascade,
  ingredient_id text not null references public.ingredients (id),
  -- grams for kg items, ml for L items, a count otherwise
  qty numeric not null check (qty > 0),
  primary key (recipe_id, ingredient_id)
);

create table public.prices (
  id uuid primary key default gen_random_uuid(),
  ingredient_id text not null references public.ingredients (id),
  -- null: a regional price that applies to every market (DA average, estimate)
  market_id text references public.markets (id),
  price numeric(10, 2) not null check (price > 0 and price < 100000),
  observed_at date not null,
  source_tier public.tier_t not null,
  reported_by uuid references auth.users (id) on delete set null,
  status public.price_status_t not null default 'accepted',
  created_at timestamptz not null default now()
);
create index prices_lookup on public.prices (ingredient_id, market_id, observed_at desc);

-- Switches the app reads: sample_prices (show the "Sample data" label),
-- business_demo (allow "Demo: activate without payment").
create table public.app_flags (
  key text primary key,
  enabled boolean not null default false
);

-- ---------------------------------------------------------------------
-- Current prices
-- ---------------------------------------------------------------------

-- Fallback order: 1 contributor or your log, 2 DA market, 3 DA average, 4 estimate.
create function public.tier_rank(t public.tier_t) returns int
language sql immutable parallel safe
set search_path = ''
as $$
  select case t
    when 'contributor' then 1
    when 'user_log' then 1
    when 'da_market' then 2
    when 'da_avg' then 3
    else 4
  end
$$;

-- Per (ingredient, market): the accepted price with the best tier among
-- prices from the last 14 days (newest first within a tier; a market's own
-- price before a regional one), falling back to the latest estimate, then
-- to the latest price of any kind. prev_price is the latest accepted price
-- from at least 4 weeks before it, for change pills and spike alerts.
create view public.current_prices
with (security_invoker = true)
as
select
  m.id as market_id,
  i.id as ingredient_id,
  cur.price,
  cur.observed_at,
  cur.source_tier,
  prev.price as prev_price,
  prev.observed_at as prev_observed_at
from public.markets m
cross join public.ingredients i
cross join lateral (
  select p.price, p.observed_at, p.source_tier
  from public.prices p
  where p.ingredient_id = i.id
    and (p.market_id = m.id or p.market_id is null)
    and p.status = 'accepted'
  order by
    case
      when p.observed_at >= current_date - 14 then public.tier_rank(p.source_tier)
      when p.source_tier = 'estimate' then 10
      else 11
    end,
    p.observed_at desc,
    (p.market_id is null),
    p.created_at desc
  limit 1
) cur
left join lateral (
  select p.price, p.observed_at
  from public.prices p
  where p.ingredient_id = i.id
    and (p.market_id = m.id or p.market_id is null)
    and p.status = 'accepted'
    and p.observed_at <= cur.observed_at - 28
  order by p.observed_at desc, p.created_at desc
  limit 1
) prev on true;

-- The price a newly logged price is checked against. When the current price
-- is itself someone's purchase log, compare with the best price that isn't,
-- so a few logs can't walk the price away from the market.
create function public.reference_price(p_ingredient text, p_market text)
returns table (price numeric, source_tier public.tier_t, observed_at date)
language sql stable
set search_path = ''
as $$
  with cur as (
    select c.price, c.source_tier, c.observed_at
    from public.current_prices c
    where c.ingredient_id = p_ingredient and c.market_id = p_market
  )
  select * from cur where cur.source_tier <> 'user_log'
  union all
  select * from (
    select p.price, p.source_tier, p.observed_at
    from public.prices p
    where p.ingredient_id = p_ingredient
      and (p.market_id = p_market or p.market_id is null)
      and p.status = 'accepted'
      and p.source_tier <> 'user_log'
    order by
      case
        when p.observed_at >= current_date - 14 then public.tier_rank(p.source_tier)
        when p.source_tier = 'estimate' then 10
        else 11
      end,
      p.observed_at desc,
      (p.market_id is null),
      p.created_at desc
    limit 1
  ) fallback
  where exists (select 1 from cur where cur.source_tier = 'user_log')
$$;

-- ---------------------------------------------------------------------
-- User data
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- null until the person picks "For my family" or "For my eatery"
  role public.role_t,
  market_id text not null default 'pampang' references public.markets (id),
  plan public.plan_t not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  budget_per_day int not null check (budget_per_day between 100 and 2000),
  adults int not null check (adults between 1 and 20),
  kids int not null check (kids between 0 and 20),
  days int not null check (days in (1, 7)),
  updated_at timestamptz not null default now()
);

create table public.purchase_logs (
  -- generated on the phone, so a retried upload can't log twice
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ingredient_id text not null references public.ingredients (id),
  qty numeric not null check (qty > 0),
  total_price numeric(10, 2) not null check (total_price > 0),
  unit_price numeric(12, 4) not null check (unit_price > 0),
  market_id text not null references public.markets (id),
  logged_at timestamptz not null default now(),
  status public.price_status_t not null,
  price_id uuid references public.prices (id) on delete set null
);
create index purchase_logs_user on public.purchase_logs (user_id, logged_at desc);

create table public.eatery_menu (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id text not null references public.recipes (id),
  price numeric(10, 2) not null check (price > 0),
  order_g numeric not null check (order_g > 0),
  late_price numeric(10, 2) check (late_price > 0),
  -- gas and extras per order (§7.3)
  extras numeric(10, 2) not null default 3 check (extras >= 0),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create table public.pots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  menu_item_id uuid not null references public.eatery_menu (id) on delete cascade,
  date date not null default current_date,
  cooked_kg numeric not null check (cooked_kg > 0 and cooked_kg <= 200),
  cooked_at timestamptz not null default now()
);
create index pots_user_date on public.pots (user_id, date);

create table public.pot_sales (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots (id) on delete cascade,
  -- owner copied from the pot, for simple row security
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- +n orders sold, -1 to undo, or a correction from weighing the pot
  orders int not null check (orders <> 0 and orders between -2000 and 2000),
  created_at timestamptz not null default now()
);
create index pot_sales_pot on public.pot_sales (pot_id);

-- A sale must belong to the same person as its pot.
create function public.pot_sales_owner_check() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.pots p where p.id = new.pot_id and p.user_id = new.user_id) then
    raise exception 'pot not found' using errcode = 'P0002';
  end if;
  return new;
end
$$;
create trigger pot_sales_owner before insert or update on public.pot_sales
for each row execute function public.pot_sales_owner_check();

-- The free plan costs up to 3 dishes.
create function public.eatery_menu_limit() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  dish_count int;
  user_plan public.plan_t;
begin
  select plan into user_plan from public.profiles where id = new.user_id;
  if coalesce(user_plan, 'free') = 'free' then
    select count(*) into dish_count from public.eatery_menu where user_id = new.user_id;
    if dish_count >= 3 then
      raise exception 'The free plan covers 3 dishes' using errcode = 'P0001', hint = 'business_plan_required';
    end if;
  end if;
  return new;
end
$$;
create trigger eatery_menu_limit before insert on public.eatery_menu
for each row execute function public.eatery_menu_limit();

-- A profile row for every new account, named from the provider.
create function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger family_settings_touch before update on public.family_settings
for each row execute function public.touch_updated_at();

-- Business plan, demo only: no payment is taken. Works only while the
-- business_demo flag is on.
create function public.activate_business_demo() returns public.plan_t
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '42501';
  end if;
  if not coalesce((select enabled from public.app_flags where key = 'business_demo'), false) then
    raise exception 'demo activation is off' using errcode = '42501';
  end if;
  update public.profiles set plan = 'business' where id = auth.uid();
  return 'business';
end
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.markets enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.prices enable row level security;
alter table public.app_flags enable row level security;
alter table public.profiles enable row level security;
alter table public.family_settings enable row level security;
alter table public.purchase_logs enable row level security;
alter table public.eatery_menu enable row level security;
alter table public.pots enable row level security;
alter table public.pot_sales enable row level security;

-- Reference data: everyone reads.
create policy "anyone reads markets" on public.markets for select to anon, authenticated using (true);
create policy "anyone reads ingredients" on public.ingredients for select to anon, authenticated using (true);
create policy "anyone reads recipes" on public.recipes for select to anon, authenticated using (true);
create policy "anyone reads recipe items" on public.recipe_items for select to anon, authenticated using (true);
create policy "anyone reads flags" on public.app_flags for select to anon, authenticated using (true);
-- Accepted prices only; flagged (unusual) prices stay private.
create policy "anyone reads accepted prices" on public.prices for select to anon, authenticated using (status = 'accepted');

-- User data: owner only.
create policy "own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "own profile update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own family settings" on public.family_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Purchase logs are written by the log-purchase function; owners read and delete.
create policy "own purchase logs" on public.purchase_logs for select to authenticated using ((select auth.uid()) = user_id);
create policy "own purchase logs delete" on public.purchase_logs for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own menu" on public.eatery_menu for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own pots" on public.pots for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own pot sales" on public.pot_sales for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- Grants (Data API)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant usage on type public.unit_t, public.tier_t, public.price_status_t, public.role_t, public.plan_t, public.meal_t
  to anon, authenticated, service_role;

grant select on public.markets, public.ingredients, public.recipes, public.recipe_items, public.app_flags
  to anon, authenticated;
-- Who reported a price is never exposed.
grant select (id, ingredient_id, market_id, price, observed_at, source_tier, status, created_at)
  on public.prices to anon, authenticated;
grant select on public.current_prices to anon, authenticated;

-- plan is never written by the person themselves (see activate_business_demo).
grant select, insert (id, display_name, role, market_id), update (display_name, role, market_id)
  on public.profiles to authenticated;
grant select, insert, update, delete on public.family_settings to authenticated;
grant select, delete on public.purchase_logs to authenticated;
grant select, insert, update, delete on public.eatery_menu, public.pots, public.pot_sales to authenticated;

grant execute on function public.tier_rank(public.tier_t) to anon, authenticated, service_role;
grant execute on function public.reference_price(text, text) to service_role;
grant execute on function public.activate_business_demo() to authenticated;
revoke execute on function public.activate_business_demo() from anon, public;
revoke execute on function public.reference_price(text, text) from anon, authenticated, public;

grant all on all tables in schema public to service_role;
