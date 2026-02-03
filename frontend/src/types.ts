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
}

