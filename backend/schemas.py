from pydantic import BaseModel
from typing import List, Optional, Any, Dict
try:
    from .models import UserRole, InventoryLocation, DowntimeStatus
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
    role: UserRole = UserRole.PLAYER

class User(UserBase):
    id: int
    role: UserRole
    class Config:
        orm_mode = True

class CampaignBase(BaseModel):
    name: str

class CampaignCreate(CampaignBase):
    pass

class Campaign(CampaignBase):
    id: int
    gm_id: int
    class Config:
        orm_mode = True

class CharacterBase(BaseModel):
    name: str
    stats: Dict[str, Any]
    image_url: Optional[str] = None

class CharacterCreate(CharacterBase):
    campaign_id: int

class Character(CharacterBase):
    id: int
    user_id: int
    campaign_id: int
    class Config:
        orm_mode = True

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
        orm_mode = True

class InventoryItem(BaseModel):
    id: int
    item: Item
    location: InventoryLocation
    quantity: int
    class Config:
        orm_mode = True

class InventoryUpdate(BaseModel):
    location: InventoryLocation

class InventoryAdd(BaseModel):
    item_id: int
    quantity: int = 1
    location: InventoryLocation = InventoryLocation.BACKPACK
