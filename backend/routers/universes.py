from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import uuid

try:
    from backend import models, database, schemas, auth
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
    print(f"DEBUG: Fetching universes for user: {current_user.id}")
    universes = db.query(models.Universe).filter(models.Universe.gm_id == current_user.id).all()
    print(f"DEBUG: Found {len(universes)} universes")
    return universes

@router.get("/universes/available", response_model=List[schemas.Universe])
def read_available_universes(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Return public universes OR universes owned by user
    # Note: In SQLAlchemy OR, use | for OR operator
    universes = db.query(models.Universe).filter(
        (models.Universe.isPublic == True) | (models.Universe.gm_id == current_user.id)
    ).all()
    return universes

@router.get("/universes/{universe_id}", response_model=schemas.Universe)
def read_universe(universe_id: int, db: Session = Depends(database.get_db)):
    universe = db.query(models.Universe).filter(models.Universe.id == universe_id).first()
    if not universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    return universe

@router.patch("/universes/{universe_id}", response_model=schemas.Universe)
def update_universe(universe_id: int, universe_update: schemas.UniverseUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_universe = db.query(models.Universe).filter(models.Universe.id == universe_id).first()
    if not db_universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    
    if db_universe.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this universe")

    update_data = universe_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_universe, key, value)

    db.add(db_universe)
    db.commit()
    db.refresh(db_universe)
    return db_universe

@router.delete("/universes/{universe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_universe(universe_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_universe = db.query(models.Universe).filter(models.Universe.id == universe_id).first()
    if not db_universe:
        raise HTTPException(status_code=404, detail="Universe not found")
    
    if db_universe.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this universe")

    # Optional: Delete related assets, characters, campaigns manually if cascade is not set up
    # Assuming cascade delete is configured in DB or SQLAlchemy models for simplicity, 
    # but strictly speaking we should clean up if needed.
    
    db.delete(db_universe)
    db.commit()
    return None

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

# --- Character Sheet Templates ---

@router.post("/templates/", response_model=schemas.CharacterSheetTemplate)
def create_template(template: schemas.CharacterSheetTemplateCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_template = models.CharacterSheetTemplate(**template.dict(), id=str(uuid.uuid4()), ownerId=current_user.id)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/templates/{template_id}", response_model=schemas.CharacterSheetTemplate)
def read_template(template_id: str, db: Session = Depends(database.get_db)):
    template = db.query(models.CharacterSheetTemplate).filter(models.CharacterSheetTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.patch("/templates/{template_id}", response_model=schemas.CharacterSheetTemplate)
def update_template(template_id: str, template_update: schemas.CharacterSheetTemplateCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_template = db.query(models.CharacterSheetTemplate).filter(models.CharacterSheetTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if db_template.ownerId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this template")

    # Update fields
    db_template.name = template_update.name
    db_template.structure = template_update.structure
    
    db.commit()
    db.refresh(db_template)
    return db_template
