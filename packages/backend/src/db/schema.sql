-- Coral Island Tracker Database Schema
-- Run with: bun run db:setup

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS save_slots CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Items table (fish, bugs, crops, etc.)
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  image_url TEXT,
  rarity VARCHAR(20), -- common, uncommon, rare, epic, legendary
  seasons TEXT[] DEFAULT '{}', -- spring, summer, fall, winter
  time_of_day TEXT[] DEFAULT '{}', -- morning, afternoon, evening, night
  weather TEXT[] DEFAULT '{}', -- sunny, windy, rain, storm, snow, blizzard
  locations TEXT[] DEFAULT '{}',
  base_price INT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- Save slots for different playthroughs
CREATE TABLE save_slots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Progress tracking per save slot
CREATE TABLE progress (
  id SERIAL PRIMARY KEY,
  save_slot_id INT NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(save_slot_id, item_id)
);

-- Indexes for common queries
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_rarity ON items(rarity);
CREATE INDEX idx_items_seasons ON items USING GIN(seasons);
CREATE INDEX idx_progress_save_slot ON progress(save_slot_id);
CREATE INDEX idx_progress_completed ON progress(save_slot_id, completed);

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, display_order) VALUES
  ('Fish', 'fish', 'All catchable fish in the ocean, rivers, and lakes', 'fish', 1),
  ('Insects', 'insects', 'Bugs and insects to catch with a net', 'bug', 2),
  ('Critters', 'critters', 'Small animals that can be caught', 'rabbit', 3),
  ('Crops', 'crops', 'Plantable crops by season', 'carrot', 4),
  ('Artifacts', 'artifacts', 'Museum donation artifacts', 'scroll', 5),
  ('Gems', 'gems', 'Minerals and gems from mining', 'gem', 6),
  ('Cooking', 'cooking', 'Recipes and cooked dishes', 'utensils', 7),
  ('NPCs', 'npcs', 'Town residents and relationship tracking', 'users', 8);

-- Create a default save slot
INSERT INTO save_slots (name) VALUES ('My First Playthrough');
