-- NFT minting is gone: Legendary figures are sold for shards like every other rarity
-- (Economy.FigurePrice: Common 300, Rare 800, Epic 2000, Legendary 5000). Shelves the publisher
-- already wrote carry Legendaries as SOL-only; reprice them so buy_figure_shards accepts them.
-- Data-only and idempotent. The price_lamports columns stay for history and SOL raid entry.

update public.shop_shelf
   set price_shards = 5000, price_lamports = null
 where rarity = 'Legendary' and price_shards is null;

update public.shop_items
   set price_shards = 5000, price_lamports = null
 where kind = 'figure' and rarity = 'Legendary';

comment on table public.shop_items is
  'Price catalogue (PLAN 6): figure prices by rarity (all in shards) and boss entry. The figures on sale each day are in shop_shelf.';
comment on column public.shop_shelf.price_shards is 'Shard price (Economy.FigurePrice). Rows written before 2026-11-02 may have used price_lamports for Legendaries.';
