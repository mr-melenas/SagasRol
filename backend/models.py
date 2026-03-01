from sqlalchemy import Column, Integer, String, ForeignKey, JSON, Text, DateTime, Boolean, Enum, ARRAY
from sqlalchemy.orm import relationship
try:
    from backend.database import Base
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

    campaigns = relationship("Campaign", back_populates="gm")
    characters = relationship("Character", back_populates="player")
    universes = relationship("Universe", back_populates="gm")
    campaign_memberships = relationship("CampaignMember", back_populates="user")

class Universe(Base):
    __tablename__ = "universes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    cover_url = Column(String, nullable=True)
    gm_id = Column(String, ForeignKey("users.id"))
    
    isPublic = Column(Boolean, default=True)
    tags = Column(ARRAY(String), default=list) # Use ARRAY for PostgreSQL

    # Configuration for character sheet and default dice
    rules_config = Column(JSON, nullable=True)

    sheetTemplateId = Column(String, ForeignKey("character_sheet_templates.id"), nullable=True)

    # Relations
    gm = relationship("User", back_populates="universes")
    assets = relationship("Asset", back_populates="universe")
    campaigns = relationship("Campaign", back_populates="universe")
    characters = relationship("Character", back_populates="universe")
    sheetTemplate = relationship("CharacterSheetTemplate", back_populates="universes")

class CharacterSheetTemplate(Base):
    __tablename__ = "character_sheet_templates"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    structure = Column(JSON) # The array of blocks
    ownerId = Column(String)

    universes = relationship("Universe", back_populates="sheetTemplate")

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
    description = Column(String, nullable=True)
    invite_code = Column("inviteCode", String, unique=True, index=True)
    gm_id = Column(String, ForeignKey("users.id"))
    universe_id = Column(Integer, ForeignKey("universes.id"), nullable=True)
    created_at = Column("createdAt", DateTime, default=datetime.datetime.utcnow)
    updated_at = Column("updatedAt", DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    next_session_at = Column("nextSessionAt", DateTime, nullable=True)

    gm = relationship("User", back_populates="campaigns")
    universe = relationship("Universe", back_populates="campaigns")
    characters = relationship("Character", back_populates="campaign")
    items = relationship("Item", back_populates="campaign")
    sessions = relationship("Session", back_populates="campaign")
    members = relationship("CampaignMember", back_populates="campaign")
    notes = relationship("CampaignNote", back_populates="campaign")
    handouts = relationship("Handout", back_populates="campaign")

class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    user_id = Column(String, ForeignKey("users.id")) # Changed to String
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    universe_id = Column(Integer, ForeignKey("universes.id"), nullable=True)
    stats = Column(JSON) # e.g., {"strength": 10, "magic": 5}
    image_url = Column(String, nullable=True)
    
    player = relationship("User", back_populates="characters")
    campaign = relationship("Campaign", back_populates="characters")
    universe = relationship("Universe", back_populates="characters")
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

class CampaignMember(Base):
    __tablename__ = "campaign_members"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column("campaignId", Integer, ForeignKey("campaigns.id"))
    user_id = Column("userId", String, ForeignKey("users.id"))
    role = Column(String, default="PLAYER")
    joined_at = Column("joinedAt", DateTime, default=datetime.datetime.utcnow)

    campaign = relationship("Campaign", back_populates="members")
    user = relationship("User", back_populates="campaign_memberships")

class CampaignNote(Base):
    __tablename__ = "campaign_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column("campaignId", Integer, ForeignKey("campaigns.id"))
    author_id = Column("authorId", String, ForeignKey("users.id"))
    content = Column(Text)
    is_private = Column("isPrivate", Boolean, default=True)
    created_at = Column("createdAt", DateTime, default=datetime.datetime.utcnow)
    updated_at = Column("updatedAt", DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    campaign = relationship("Campaign", back_populates="notes")
    author = relationship("User")

class Handout(Base):
    __tablename__ = "handouts"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column("campaignId", Integer, ForeignKey("campaigns.id"))
    name = Column(String)
    content = Column(Text)
    is_visible = Column("isVisible", Boolean, default=False)
    created_at = Column("createdAt", DateTime, default=datetime.datetime.utcnow)

    campaign = relationship("Campaign", back_populates="handouts")
