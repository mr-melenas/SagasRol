from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import uuid

try:
    from . import models, database, schemas, auth
except ImportError:
    import models, database, schemas, auth

router = APIRouter()

# --- Universes ---

@router.post("/universes/", response_model=schemas.Universe)
def create_universe(universe: schemas.UniverseCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_universe = models.Universe(**universe.dict(), gm_id=current_user.id)
    db.add(db_universe)
    db.commit()
    db.refresh(db_universe)
    return db_universe

@router.get("/universes/", response_model=List[schemas.Universe])
def read_universes(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Return universes created by the current user (where they are the GM/Creator)
    return db.query(models.Universe).filter(models.Universe.gm_id == current_user.id).all()

@router.get("/universes/{universe_id}", response_model=schemas.Universe)
def read_universe(universe_id: int, db: Session = Depends(database.get_db)):
    universe = db.query(models.Universe).filter(models.Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    return universe

# --- Assets ---

UPLOAD_DIR = "uploads/assets"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/assets/upload", response_model=str)
async def upload_asset_file(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return URL (relative path for now, should be served via StaticFiles)
    # In production this would be an S3/Cloud Storage URL
    return f"/static/assets/{unique_filename}"

@router.post("/assets/", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_active_gm)):
    # Verify universe ownership
    universe = db.query(models.Universe).filter(models.Universe.id == asset.universe_id).first()
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    if universe.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add assets to this universe")

    db_asset = models.Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.get("/universes/{universe_id}/assets", response_model=List[schemas.Asset])
def read_universe_assets(universe_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.Asset).filter(models.Asset.universe_id == universe_id).all()
