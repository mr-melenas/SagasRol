-- Create Enums
CREATE TYPE user_role AS ENUM ('GM', 'PLAYER');
CREATE TYPE inventory_location AS ENUM ('EQUIPPED', 'BACKPACK', 'STASH');
CREATE TYPE downtime_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    role user_role DEFAULT 'PLAYER'
);

CREATE INDEX idx_users_username ON users(username);

-- Create Campaigns Table
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    gm_id INTEGER REFERENCES users(id)
);

CREATE INDEX idx_campaigns_name ON campaigns(name);

-- Create Characters Table
CREATE TABLE characters (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    user_id INTEGER REFERENCES users(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    stats JSONB,
    image_url VARCHAR
);

CREATE INDEX idx_characters_name ON characters(name);

-- Create Items Table
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    campaign_id INTEGER REFERENCES campaigns(id),
    stats_modifier JSONB
);

CREATE INDEX idx_items_name ON items(name);

-- Create Inventory Table
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id),
    item_id INTEGER REFERENCES items(id),
    location inventory_location DEFAULT 'BACKPACK',
    quantity INTEGER DEFAULT 1
);

-- Create Sessions Table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    log TEXT,
    date TIMESTAMP DEFAULT NOW(),
    summary TEXT
);

-- Create Downtime Actions Table
CREATE TABLE downtime_actions (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id),
    action_type VARCHAR,
    input_data VARCHAR,
    status downtime_status DEFAULT 'PENDING',
    result TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
