-- Reproducible schema for the dedicated IT415 simulated kiosk project.
create table public.kiosk_products (
  id text primary key,
  name text not null,
  price integer not null check (price > 0)
);
insert into public.kiosk_products values
('coffee','Coffee',4500),('sandwich','Sandwich',5000),('soft-drink','Soft Drink',3500),
('cookies','Cookies',2500),('water','Bottled Water',2000),('chocolate','Chocolate',2500);

create table public.kiosk_transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique not null,
  created_at timestamptz not null default now(),
  method text not null check (method in ('Cash','QR Payment','Credit/Debit Card')),
  total integer not null check (total > 0),
  paid integer not null check (paid >= total and paid <= 99999999),
  change integer generated always as (paid - total) stored,
  count integer not null check (count > 0),
  simulated boolean not null default true check (simulated),
  check (method = 'Cash' or paid = total)
);
create table public.kiosk_transaction_items (
  transaction_id uuid not null references public.kiosk_transactions(id),
  product_id text not null references public.kiosk_products(id),
  name text not null,
  quantity integer not null check (quantity between 1 and 999),
  price integer not null check (price > 0),
  subtotal integer generated always as (quantity * price) stored,
  primary key (transaction_id, product_id)
);
create index kiosk_transactions_created_at_idx on public.kiosk_transactions(created_at);
create index kiosk_items_product_id_idx on public.kiosk_transaction_items(product_id);

alter table public.kiosk_products enable row level security;
alter table public.kiosk_transactions enable row level security;
alter table public.kiosk_transaction_items enable row level security;
revoke all on public.kiosk_products, public.kiosk_transactions, public.kiosk_transaction_items from anon, authenticated;
grant all on public.kiosk_products, public.kiosk_transactions, public.kiosk_transaction_items to service_role;

-- Called only by the Edge Function's server-side service role.
-- SECURITY INVOKER: no privilege escalation; no public table policies.
create function public.kiosk_checkout(p_request_id uuid, p_items jsonb, p_method text, p_paid integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_total integer;
  v_count integer;
  v_rows integer;
  v_transaction public.kiosk_transactions%rowtype;
  v_lines jsonb;
begin
  if p_request_id is null or p_method is null or p_method not in ('Cash','QR Payment','Credit/Debit Card') then
    raise exception 'Invalid request or method';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 6 then
    raise exception 'Choose one to six products';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) x where
    jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'id') is distinct from 'string' or
    jsonb_typeof(x->'quantity') is distinct from 'number' or
    (x->>'quantity') !~ '^[1-9][0-9]{0,2}$') then
    raise exception 'Invalid item';
  end if;
  if (select count(distinct x->>'id') from jsonb_array_elements(p_items) x) <> jsonb_array_length(p_items) then
    raise exception 'Duplicate products';
  end if;
  select sum(p.price * (x->>'quantity')::integer), sum((x->>'quantity')::integer), count(*)
  into v_total, v_count, v_rows
  from jsonb_array_elements(p_items) x join public.kiosk_products p on p.id=x->>'id';
  if v_rows <> jsonb_array_length(p_items) then raise exception 'Unknown product'; end if;
  if p_paid is null or p_paid < v_total or p_paid > 99999999 or (p_method <> 'Cash' and p_paid <> v_total) then
    raise exception 'Invalid or insufficient payment';
  end if;
  -- Serialize retries with the same request ID. All line inserts commit atomically.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into v_transaction from public.kiosk_transactions where request_id=p_request_id;
  if found then
    if v_transaction.method <> p_method or v_transaction.paid <> p_paid or
       v_transaction.total <> v_total or v_transaction.count <> v_count or exists (
         select 1 from jsonb_array_elements(p_items) x left join public.kiosk_transaction_items i
         on i.transaction_id=v_transaction.id and i.product_id=x->>'id'
         where i.product_id is null or i.quantity <> (x->>'quantity')::integer
       ) then raise exception 'Request already used for another order'; end if;
  else
    insert into public.kiosk_transactions(request_id,method,total,paid,count)
    values(p_request_id,p_method,v_total,p_paid,v_count) returning * into v_transaction;
    insert into public.kiosk_transaction_items(transaction_id,product_id,name,quantity,price)
    select v_transaction.id,p.id,p.name,(x->>'quantity')::integer,p.price
    from jsonb_array_elements(p_items) x join public.kiosk_products p on p.id=x->>'id';
  end if;
  select jsonb_agg(jsonb_build_object('id',product_id,'name',name,'quantity',quantity,'price',price,'subtotal',subtotal) order by product_id)
  into v_lines from public.kiosk_transaction_items where transaction_id=v_transaction.id;
  return jsonb_build_object('reference','CC-'||upper(v_transaction.id::text),'date',v_transaction.created_at,
    'method',v_transaction.method,'total',v_transaction.total,'paid',v_transaction.paid,
    'change',v_transaction.change,'count',v_transaction.count,'lines',v_lines,'status','Payment Successful');
end;
$$;
revoke all on function public.kiosk_checkout(uuid,jsonb,text,integer) from public, anon, authenticated;
grant execute on function public.kiosk_checkout(uuid,jsonb,text,integer) to service_role;
