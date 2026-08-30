-- LUMÉRA — consolidated migration. Run this ONE file in the Supabase SQL
-- Editor now — it supersedes the earlier supabase-setup.sql / lumera-schema.sql
-- / lumera-fix.sql files. Fully idempotent: safe to run even if you already
-- ran some of those earlier ones.

-- Extended product fields
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS sale_price NUMERIC;
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS wax_type TEXT NOT NULL DEFAULT 'Soy & Coconut Wax Blend';
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT '220g';
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS rating NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE candle_products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Link orders to a registered customer (nullable — guest checkout still allowed)
ALTER TABLE candle_orders ADD COLUMN IF NOT EXISTS user_id UUID;

-- Review moderation + purchase-verification
ALTER TABLE candle_reviews ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE candle_reviews ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE candle_reviews ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

-- Customer accounts — named lumera_users (NOT "users") because this Supabase
-- project already has an unrelated "users" table from a different app of
-- yours. That table is untouched by any of this.
CREATE TABLE IF NOT EXISTS lumera_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved shipping addresses (recreated to point at lumera_users — safe, still empty)
DROP TABLE IF EXISTS addresses;
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES lumera_users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  full_name TEXT NOT NULL,
  phone TEXT,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wishlist (recreated to point at lumera_users — safe, still empty)
DROP TABLE IF EXISTS wishlist_items;
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES lumera_users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES candle_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- Discount codes (admin-managed)
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL,
  expires_at TIMESTAMPTZ,
  usage_limit INT,
  used_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO discounts (code, type, value, active)
VALUES ('WELCOME10', 'percentage', 10, true)
ON CONFLICT (code) DO NOTHING;
