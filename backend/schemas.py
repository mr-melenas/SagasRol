from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import enum
try:
    from backend.models import UserRole, InventoryLocation, DowntimeStatus
except ImportError:
    from models import UserRole, InventoryLocation, DowntimeStatus

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: Optional[str] = None # Username is now optional

class UserCreate(UserBase):
    password: str
    # role: UserRole = UserRole.PLAYER

class User(UserBase):
    id: str # Changed from int to str to match Clerk ID
    # role: UserRole
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    class Config:
        from_attributes = True

class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    universe_id: Optional[int] = None
    banner_url: Optional[str] = None # New field

class CampaignCreate(CampaignBase):
    universe_id: int # Required for creation

class CampaignUpdate(BaseModel):
    description: Optional[str] = None
    banner_url: Optional[str] = None

class Campaign(CampaignBase):
    id: int
    gm_id: str 
    invite_code: str = Field(..., serialization_alias="inviteCode")
    class Config:
        from_attributes = True
        populate_by_name = True

class CampaignJoin(BaseModel):
    inviteCode: str

class CampaignMember(BaseModel):
    user_id: str
    username: Optional[str]
    role: str
    joined_at: Any
    attendance_status: Optional[str] = None
    character: Optional[Dict[str, Any]] = None

class CampaignNoteCreate(BaseModel):
    content: str
    is_private: bool = True

class CampaignNoteUpdate(BaseModel):
    content: Optional[str] = None
    is_private: Optional[bool] = None

class HandoutCreate(BaseModel):
    name: str
    content: str
    is_visible: bool = False

class HandoutUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    is_visible: Optional[bool] = None

class CampaignNote(BaseModel):
    id: int
    content: str
    is_private: bool
    author_id: str
    created_at: Any

class Handout(BaseModel):
    id: int
    name: str
    content: str
    is_visible: bool
    created_at: Any

class LobbyResponse(BaseModel):
    campaign: Dict[str, Any]
    is_gm: bool
    party: List[CampaignMember]
    notes: List[CampaignNote]
    handouts: List[Handout]

class CharacterBase(BaseModel):
    name: str
    stats: Dict[str, Any]
    image_url: Optional[str] = None

class CharacterCreate(CharacterBase):
    campaign_id: Optional[int] = None
    universe_id: int

class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None

class Character(CharacterBase):
    id: int
    user_id: str # Changed from int to str
    campaign_id: Optional[int] = None
    universe_id: Optional[int] = None
    class Config:
        from_attributes = True

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    stats_modifier: Dict[str, Any]

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    campaign_id: int
    class Config:
        from_attributes = True

class InventoryItem(BaseModel):
    id: int
    item: Item
    location: InventoryLocation
    quantity: int
    class Config:
        from_attributes = True

class InventoryUpdate(BaseModel):
    location: InventoryLocation

class InventoryAdd(BaseModel):
    item_id: int
    quantity: int = 1
    location: InventoryLocation = InventoryLocation.BACKPACK

# Universe Schemas
class UniverseBase(BaseModel):
    name: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    rules_config: Optional[Dict[str, Any]] = None
    isPublic: bool = True
    tags: List[str] = []
    sheetTemplateId: Optional[str] = None

class UniverseCreate(UniverseBase):
    pass

class UniverseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    rules_config: Optional[Dict[str, Any]] = None
    isPublic: Optional[bool] = None
    tags: Optional[List[str]] = None
    sheetTemplateId: Optional[str] = None

class CharacterSheetTemplateBase(BaseModel):
    name: str
    structure: Any # JSON structure, can be List[Dict] (old) or Dict (new with tabs)
    
class CharacterSheetTemplateCreate(CharacterSheetTemplateBase):
    pass

class CharacterSheetTemplate(CharacterSheetTemplateBase):
    id: str
    ownerId: str
    class Config:
        from_attributes = True

class Universe(UniverseBase):
    id: int
    gm_id: str
    sheetTemplate: Optional[CharacterSheetTemplate] = None
    class Config:
        from_attributes = True

class AssetType(str, enum.Enum): # Should match database Enum
    SCENE = "SCENE"
    NPC = "NPC"
    ENEMY = "ENEMY"
    ITEM = "ITEM"

class AssetBase(BaseModel):
    name: str
    image_url: str
    type: AssetType
    tags: Optional[List[str]] = []

class AssetCreate(AssetBase):
    universe_id: int

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None

class Asset(AssetBase):
    id: int
    universe_id: int
    class Config:
        from_attributes = True

class CampaignAssetBase(BaseModel):
    name: str
    file_url: str
    is_preselected: bool = False
    tags: Optional[List[str]] = []

class CampaignAssetCreate(BaseModel):
    name: str
    file_url: str
    tags: Optional[List[str]] = []

class CampaignAssetUpdate(BaseModel):
    name: Optional[str] = None
    tags: Optional[List[str]] = None

class CampaignAsset(CampaignAssetBase):
    id: int
    campaign_id: int
    class Config:
        from_attributes = True

class AssetCopyFromUniverse(BaseModel):
    universe_asset_url: str
    name: str

class CampaignAssetsList(BaseModel):
    campaign_assets: List[CampaignAsset]
    universe_assets: List[Asset]
