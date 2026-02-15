from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import nanoid

from backend.database import get_db
from backend.auth import get_current_user
from backend import models, schemas

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

@router.post("/", response_model=schemas.Campaign)
def create_campaign(
    campaign: schemas.CampaignCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Generate unique invite code
    invite_code = nanoid.generate(size=6)
    while db.query(models.Campaign).filter(models.Campaign.invite_code == invite_code).first():
        invite_code = nanoid.generate(size=6)

    new_campaign = models.Campaign(
        name=campaign.name,
        description=campaign.description,
        universe_id=campaign.universe_id,
        gm_id=current_user.id,
        invite_code=invite_code
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    return new_campaign

@router.get("/", response_model=Dict[str, List[schemas.Campaign]])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Campaigns where I am GM
    mastering = db.query(models.Campaign).filter(models.Campaign.gm_id == current_user.id).all()
    
    # Campaigns where I have a character (Playing)
    # Join Character table to find campaigns
    playing = db.query(models.Campaign).join(models.Character).filter(
        models.Character.user_id == current_user.id,
        models.Character.campaign_id == models.Campaign.id
    ).all()

    return {
        "mastering": mastering,
        "playing": playing
    }

@router.post("/join")
def join_campaign(
    join_data: schemas.CampaignJoin,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Find Campaign
    campaign = db.query(models.Campaign).filter(models.Campaign.invite_code == join_data.inviteCode).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # 2. Verify Character Ownership
    character = db.query(models.Character).filter(
        models.Character.id == join_data.characterId,
        models.Character.user_id == current_user.id
    ).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found or not owned by you")

    # 3. Verify Universe Match
    if character.universe_id != campaign.universe_id:
        raise HTTPException(status_code=400, detail="Character belongs to a different universe")

    # 4. Update Character
    character.campaign_id = campaign.id
    db.commit()
    
    return {"message": "Successfully joined campaign", "campaign": campaign}