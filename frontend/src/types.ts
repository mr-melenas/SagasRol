export enum UserRole {
  GM = "GM",
  PLAYER = "PLAYER"
}

export enum InventoryLocation {
  EQUIPPED = "EQUIPPED",
  BACKPACK = "BACKPACK",
  STASH = "STASH"
}

export interface User {
  id: string;
  username?: string;
  role: UserRole;
}

export interface Item {
  id: number;
  name: string;
  description?: string;
  stats_modifier: Record<string, number>;
}

export interface InventoryItem {
  id: number;
  item: Item;
  location: InventoryLocation;
  quantity: number;
}

export interface Character {
  id: number;
  name: string;
  stats: Record<string, any>;
  image_url?: string;
  inventory?: InventoryItem[];
}

export interface Universe {
    id: number;
    name: string;
    description?: string;
    cover_url?: string;
    gm_id: string;
    isPublic: boolean;
    tags: string[];
    rules_config?: Record<string, any>;
}

export enum AssetType {
    SCENE = "SCENE",
    NPC = "NPC",
    ENEMY = "ENEMY",
    ITEM = "ITEM"
}

export interface Asset {
    id: number;
    name: string;
    image_url: string;
    type: AssetType;
    universe_id: number;
}

