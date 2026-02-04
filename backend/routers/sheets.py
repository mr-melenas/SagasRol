from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

try:
    from backend import models, database, schemas, auth
except ImportError:
    import models, database, schemas, auth

router = APIRouter()

@router.post("/sheets/", response_model=schemas.CharacterSheetTemplate)
def create_sheet_template(template: schemas.CharacterSheetTemplateCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_template = models.CharacterSheetTemplate(**template.dict(), id=str(uuid.uuid4()), ownerId=current_user.id)
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/sheets/", response_model=List[schemas.CharacterSheetTemplate])
def read_sheet_templates(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Return templates created by the current user
    return db.query(models.CharacterSheetTemplate).filter(models.CharacterSheetTemplate.ownerId == current_user.id).all()

@router.get("/sheets/{template_id}", response_model=schemas.CharacterSheetTemplate)
def read_sheet_template(template_id: str, db: Session = Depends(database.get_db)):
    template = db.query(models.CharacterSheetTemplate).filter(models.CharacterSheetTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/sheets/{template_id}", response_model=schemas.CharacterSheetTemplate)
def update_sheet_template(template_id: str, template_update: schemas.CharacterSheetTemplateCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
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
