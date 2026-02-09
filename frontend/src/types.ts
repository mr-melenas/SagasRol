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
  universe_id?: number;
  campaign_id?: number;
}

export interface CharacterSheetTemplate {
    id: string;
    name: string;
    structure: SheetBlock[];
    ownerId: string;
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
    sheetTemplateId?: string;
    sheetTemplate?: CharacterSheetTemplate;
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

export type BlockType = 'STAT' | 'RESOURCE' | 'TEXT' | 'SKILL' | 'GROUP' | 'INLINE_FIELD' | 'SIMPLE_INPUT' | 'CUSTOM_SKILL';

export interface SheetBlock {
  id: string;
  type: BlockType;
  label: string;
  value?: string | number; // Default Value
  children?: SheetBlock[]; // For GROUP
  config?: {
    placeholder?: string;
    color?: string; // For resource bars
    min?: number;
    max?: number;
    direction?: 'row' | 'col'; // For GROUP layout
    columns?: number; // For GROUP grid
    defaultValue?: string; // For TEXT_AREA
  };
}

