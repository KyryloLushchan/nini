-- Режим «Общие расходы» в tg-webhook (mode='expense') не привязан к ингредиенту.
alter table public.tg_input_state alter column ingredient_id drop not null;
