from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta
import socketio
from typing import List
import os

import sys
import os

# Ensure root is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from backend import models, database, schemas, auth
from backend.routers import universes, sheets

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="ROL-Sagas")

# Mount Static Files for Uploads
os.makedirs("uploads/assets", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO Setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# Include Routers
app.include_router(universes.router, tags=["universes"])
app.include_router(sheets.router, tags=["sheets"])

@app.get("/")
def read_root():
    return {"message": "Welcome to ROL-Sagas API"}

@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# ... (Rest of endpoints using Depends(auth.get_current_user) will now use Clerk)

# Campaign Endpoints
@app.post("/campaigns/", response_model=schemas.Campaign)
def create_campaign(campaign: schemas.CampaignCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Role logic removed
    # if current_user.role != models.UserRole.GM:
    #    raise HTTPException(status_code=403, detail="Only GMs can create campaigns")
    db_campaign = models.Campaign(name=campaign.name, gm_id=current_user.id)
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@app.get("/campaigns/", response_model=List[schemas.Campaign])
def read_campaigns(db: Session = Depends(database.get_db)):
    return db.query(models.Campaign).all()

# Character Endpoints
@app.post("/characters/", response_model=schemas.Character)
def create_character(character: schemas.CharacterCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_character = models.Character(**character.dict(), user_id=current_user.id)
    db.add(db_character)
    db.commit()
    db.refresh(db_character)
    return db_character

@app.get("/my-characters/", response_model=List[schemas.Character])
def read_my_characters(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Character).filter(models.Character.user_id == current_user.id).all()

def recalculate_stats(character: models.Character, db: Session):
    base_stats = character.stats.copy() if character.stats else {}
    equipped_items = db.query(models.Inventory).filter(
        models.Inventory.character_id == character.id,
        models.Inventory.location == models.InventoryLocation.EQUIPPED
    ).all()

    for entry in equipped_items:
        item = entry.item
        if item.stats_modifier:
            for stat, value in item.stats_modifier.items():
                if stat in base_stats:
                    base_stats[stat] += value
                else:
                    base_stats[stat] = value
    return base_stats

@app.get("/characters/{character_id}", response_model=schemas.Character)
def read_character(character_id: int, db: Session = Depends(database.get_db)):
    character = db.query(models.Character).filter(models.Character.id == character_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    # Calculate effective stats
    effective_stats = recalculate_stats(character, db)
    # We return the character object but patch the stats for response
    # Note: This doesn't save to DB, just for display. 
    # To properly return this via Pydantic, we might need a separate schema or just override the dict
    character.stats = effective_stats 
    return character

@app.put("/characters/{character_id}", response_model=schemas.Character)
def update_character(character_id: int, character_update: schemas.CharacterUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_character = db.query(models.Character).filter(models.Character.id == character_id).first()
    if not db_character:
        raise HTTPException(status_code=404, detail="Character not found")
    
    if db_character.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if character_update.name is not None:
        db_character.name = character_update.name
    if character_update.stats is not None:
        db_character.stats = character_update.stats
    if character_update.image_url is not None:
        db_character.image_url = character_update.image_url

    db.commit()
    db.refresh(db_character)
    return db_character

# Inventory Endpoints
@app.post("/characters/{character_id}/inventory/", response_model=schemas.InventoryItem)
def add_item_to_inventory(character_id: int, item_data: schemas.InventoryAdd, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    character = db.query(models.Character).filter(models.Character.id == character_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    # if character.user_id != current_user.id and current_user.role != models.UserRole.GM:
    if character.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db_inventory = models.Inventory(
        character_id=character_id,
        item_id=item_data.item_id,
        location=item_data.location,
        quantity=item_data.quantity
    )
    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)
    return db_inventory

@app.put("/inventory/{inventory_id}/move", response_model=schemas.InventoryItem)
def move_inventory_item(inventory_id: int, update: schemas.InventoryUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    inventory_item = db.query(models.Inventory).filter(models.Inventory.id == inventory_id).first()
    if not inventory_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    # Check permission
    character = inventory_item.character
    # if character.user_id != current_user.id and current_user.role != models.UserRole.GM:
    if character.user_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized")

    inventory_item.location = update.location
    db.commit()
    db.refresh(inventory_item)
    return inventory_item

@app.get("/characters/{character_id}/inventory", response_model=List[schemas.InventoryItem])
def read_inventory(character_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.Inventory).filter(models.Inventory.character_id == character_id).all()

# Items (for testing)
@app.post("/items/", response_model=schemas.Item)
def create_item(item: schemas.ItemCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Role logic removed
    # if current_user.role != models.UserRole.GM:
    #    raise HTTPException(status_code=403, detail="Only GMs can create items")
    db_item = models.Item(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    print(f"connect {sid}")

@sio.event
async def disconnect(sid):
    print(f"disconnect {sid}")

@sio.event
async def join_room(sid, data):
    # data: {'room': 'campaign_id'}
    room = data.get('room')
    if room:
        sio.enter_room(sid, room)
        await sio.emit('message', {'data': f'User {sid} joined room {room}'}, room=room)

@sio.event
async def roll_dice(sid, data):
    # data: {'room': 'campaign_id', 'dice': '1d20'}
    import random
    room = data.get('room')
    dice_str = data.get('dice', '1d20')
    try:
        count, sides = map(int, dice_str.split('d'))
        result = sum(random.randint(1, sides) for _ in range(count))
        await sio.emit('dice_result', {'user': sid, 'roll': result, 'formula': dice_str}, room=room)
    except Exception as e:
        await sio.emit('error', {'message': 'Invalid dice format'}, room=sid)
