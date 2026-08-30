CREATE TABLE IF NOT EXISTS profiles (
    discord_id TEXT PRIMARY KEY,
    character_name TEXT NOT NULL UNIQUE,
    age TEXT,
    pronouns TEXT,
    height TEXT,
    profile TEXT,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    last_daily TEXT,
    house TEXT,
    birthday TEXT,
    picture TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_items (
    name TEXT PRIMARY KEY,
    price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
    owner TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (owner, item_name)
);

CREATE TABLE IF NOT EXISTS houses (
    name TEXT PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tuppers (
    tupper_name TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    player_character TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS shop_items_set_updated_at ON shop_items;
CREATE TRIGGER shop_items_set_updated_at
BEFORE UPDATE ON shop_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS inventory_set_updated_at ON inventory;
CREATE TRIGGER inventory_set_updated_at
BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS houses_set_updated_at ON houses;
CREATE TRIGGER houses_set_updated_at
BEFORE UPDATE ON houses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS tuppers_set_updated_at ON tuppers;
CREATE TRIGGER tuppers_set_updated_at
BEFORE UPDATE ON tuppers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
