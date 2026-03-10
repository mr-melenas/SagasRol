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
    structure: SheetBlock[] | SheetTemplateData; // Support new structure
    ownerId: string;
}

export interface SheetTemplateData {
    tabs: SheetTab[];
    blocks: SheetBlock[];
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
    tags?: string[];
}

export interface CampaignMember {
    user_id: string;
    username: string;
    role: string;
    joined_at: string;
    character?: {
        id: number;
        name: string;
        image_url?: string;
    };
}

export interface CampaignNote {
    id: number;
    content: string;
    is_private: boolean;
    author_id: string;
    created_at: string;
}

export interface Handout {
    id: number;
    name: string;
    content: string;
    is_visible: boolean;
    created_at: string;
}

export interface Campaign {
    id: number;
    name: string;
    description?: string;
    banner_url?: string; // New field
    invite_code?: string; // Only if GM
    universe_id: number;
    gm_id: string;
    next_session_at?: string;
    created_at?: string;
}

export interface CampaignList {
    mastering: Campaign[];
    playing: Campaign[];
}

export interface LobbyData {
    campaign: {
        id: number;
        name: string;
        description: string;
        banner_url?: string; // New field
        invite_code?: string;
        next_session_at?: string;
    };
    is_gm: boolean;
    party: CampaignMember[];
    notes: CampaignNote[];
    handouts: Handout[];
}

export interface SheetTab {
  id: string;
  name: string;
}

export type BlockType = 'STAT' | 'RESOURCE' | 'TEXT' | 'SKILL' | 'GROUP' | 'INLINE_FIELD' | 'SIMPLE_INPUT' | 'CUSTOM_SKILL' | 'CHARACTER_IMAGE' | 'PLAYER_NOTE';

export interface SheetBlock {
  id: string;
  type: BlockType;
  label: string;
  tabId?: string; // New property for pagination
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
    avatarShape?: 'square' | 'circle'; // For CHARACTER_IMAGE
  };
}

