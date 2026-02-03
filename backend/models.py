from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Text, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
try:
    from .database import Base
except ImportError:
    from database import Base
import enum
import datetime

class UserRole(str, enum.Enum):
    GM = "GM"
    PLAYER = "PLAYER"

class InventoryLocation(str, enum.Enum):
    EQUIPPED = "EQUIPPED"
    BACKPACK = "BACKPACK"
    STASH = "STASH"

class DowntimeStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AssetType(str, enum.Enum):
    SCENE = "SCENE"
    NPC = "NPC"
    ENEMY = "ENEMY"
    ITEM = "ITEM"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True) # Clerk ID
    username = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True) # Mantener por compatibilidad
    role = Column(Enum(UserRole), default=UserRole.PLAYER)

    campaigns = relationship("Campaign", back_populates="gm")
    characters = relationship("Character", back_populates="player")
    universes = relationship("Universe", back_populates="gm")

class Universe(Base):
    __tablename__ = "universes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    cover_url = Column(String, nullable=True)
    gm_id = Column(String, ForeignKey("users.id"))
    
    # Configuration for character sheet and default dice
    rules_config = Column(JSON, nullable=True)

    # Relations
    gm = relationship("User", back_populates="universes")
    assets = relationship("Asset", back_populates="universe")
    campaigns = relationship("Campaign", back_populates="universe")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    image_url = Column(String)
    type = Column(Enum(AssetType))
    universe_id = Column(Integer, ForeignKey("universes.id"))

    # Relations
    universe = relationship("Universe", back_populates="assets")

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    gm_id = Column(String, ForeignKey("users.id")) # Changed to String
    universe_id = Column(Integer, ForeignKey("universes.id"), nullable=True) # Added optional relation

    gm = relationship("User", back_populates="campaigns")
    universe = relationship("Universe", back_populates="campaigns")
    characters = relationship("Character", back_populates="campaign")
    items = relationship("Item", back_populates="campaign")
    sessions = relationship("Session", back_populates="campaign")

class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    user_id = Column(String, ForeignKey("users.id")) # Changed to String
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    stats = Column(JSON) # e.g., {"strength": 10, "magic": 5}
    image_url = Column(String, nullable=True)
    
    player = relationship("User", back_populates="characters")
    campaign = relationship("Campaign", back_populates="characters")
    inventory = relationship("Inventory", back_populates="character")
    downtime_actions = relationship("DowntimeAction", back_populates="character")

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    stats_modifier = Column(JSON) # e.g., {"strength": +2}
    
    campaign = relationship("Campaign", back_populates="items")
    inventory_entries = relationship("Inventory", back_populates="item")

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    location = Column(Enum(InventoryLocation), default=InventoryLocation.BACKPACK)
    quantity = Column(Integer, default=1)

    character = relationship("Character", back_populates="inventory")
    item = relationship("Item", back_populates="inventory_entries")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    log = Column(Text)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    summary = Column(Text, nullable=True) # AI Generated summary

    campaign = relationship("Campaign", back_populates="sessions")

class DowntimeAction(Base):
    __tablename__ = "downtime_actions"
    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"))
    action_type = Column(String) # Study, Produce, Investigate
    input_data = Column(String) # "Fireball spell", "Iron Sword", etc.
    status = Column(Enum(DowntimeStatus), default=DowntimeStatus.PENDING)
    result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    character = relationship("Character", back_populates="downtime_actions")
