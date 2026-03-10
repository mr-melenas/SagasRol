from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import nanoid
import datetime

from backend.database import get_db
from backend.auth import get_current_user
from backend import models, schemas
from backend.utils.storage import upload_image_to_supabase

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
        banner_url=campaign.banner_url,
        universe_id=campaign.universe_id,
        gm_id=current_user.id,
        invite_code=invite_code
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    # Automatically add GM as a member
    gm_member = models.CampaignMember(
        campaign_id=new_campaign.id,
        user_id=current_user.id,
        role="GM"
    )
    db.add(gm_member)
    db.commit()

    return new_campaign

@router.get("/", response_model=Dict[str, List[schemas.Campaign]])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Campaigns where I am GM
    mastering = db.query(models.Campaign).filter(models.Campaign.gm_id == current_user.id).all()
    
    # Campaigns where I am a PLAYER member
    playing = db.query(models.Campaign).join(models.CampaignMember).filter(
        models.CampaignMember.user_id == current_user.id,
        models.CampaignMember.campaign_id == models.Campaign.id,
        models.CampaignMember.role == "PLAYER"
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
    # 1. Find Campaign by invite code
    campaign = db.query(models.Campaign).filter(models.Campaign.invite_code == join_data.inviteCode).first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")
    
    # 2. Check if User is GM
    if campaign.gm_id == current_user.id:
        return {"message": "You are the GM of this campaign", "campaign_id": campaign.id}

    # 3. Check if already a member
    existing_member = db.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign.id,
        models.CampaignMember.user_id == current_user.id
    ).first()
    
    if existing_member:
        return {"message": "Already joined", "campaign_id": campaign.id}
    
    # 4. Add to party as PLAYER
    new_member = models.CampaignMember(
        campaign_id=campaign.id,
        user_id=current_user.id,
        role="PLAYER"
    )
    db.add(new_member)
    db.commit()
    
    return {"message": "Joined campaign successfully", "campaign_id": campaign.id}

@router.patch("/{campaign_id}", response_model=schemas.Campaign)
def update_campaign(
    campaign_id: int,
    campaign_update: schemas.CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can update campaign")

    if campaign_update.description is not None:
        campaign.description = campaign_update.description
    if campaign_update.banner_url is not None:
        campaign.banner_url = campaign_update.banner_url

    db.commit()
    db.refresh(campaign)
    return campaign

@router.post("/{campaign_id}/banner", response_model=schemas.Campaign)
async def upload_campaign_banner(
    campaign_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can upload banner")

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        folder_path = f"campaigns/{campaign_id}/banner"
        # Using existing utility
        public_url = await upload_image_to_supabase(file, folder_path)
        
        # Ensure we get a string URL
        if not isinstance(public_url, str):
             if hasattr(public_url, 'publicUrl'):
                  public_url = public_url.publicUrl
             elif isinstance(public_url, dict) and 'publicUrl' in public_url:
                  public_url = public_url['publicUrl']
             else:
                  public_url = str(public_url)

        campaign.banner_url = public_url
        db.commit()
        db.refresh(campaign)
        return campaign
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Banner upload failed: {str(e)}")

@router.get("/{campaign_id}/lobby", response_model=schemas.LobbyResponse)
def get_campaign_lobby(
    campaign_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    is_gm = campaign.gm_id == current_user.id
    
    # Verify access if not GM
    member_info = None
    if not is_gm:
        member_info = db.query(models.CampaignMember).filter(
            models.CampaignMember.campaign_id == campaign_id,
            models.CampaignMember.user_id == current_user.id
        ).first()
        if not member_info:
            raise HTTPException(status_code=403, detail="You are not a member of this campaign")

    # Gather Party Data (Members + Characters)
    members = db.query(models.CampaignMember).filter(models.CampaignMember.campaign_id == campaign_id).all()
    party_data = []
    for m in members:
        # Find character for this user in this campaign
        character = db.query(models.Character).filter(
            models.Character.campaign_id == campaign_id,
            models.Character.user_id == m.user_id
        ).first()
        
        party_data.append({
            "user_id": m.user_id,
            "username": m.user.username or m.user.first_name,
            "role": m.role,
            "joined_at": m.joined_at,
            "character": {
                "id": character.id, 
                "name": character.name, 
                "image_url": character.image_url,
                "stats": character.stats
            } if character else None
        })

    # Filter Notes and Handouts based on Role
    if is_gm:
        notes = db.query(models.CampaignNote).filter(models.CampaignNote.campaign_id == campaign_id).all()
        handouts = db.query(models.Handout).filter(models.Handout.campaign_id == campaign_id).all()
    else:
        # Player: Public notes OR own private notes
        notes = db.query(models.CampaignNote).filter(
            models.CampaignNote.campaign_id == campaign_id,
            (models.CampaignNote.is_private == False) | (models.CampaignNote.author_id == current_user.id)
        ).all()
        # Player: Only visible handouts
        handouts = db.query(models.Handout).filter(
            models.Handout.campaign_id == campaign_id,
            models.Handout.is_visible == True
        ).all()

    return {
        "campaign": {
            "id": campaign.id,
            "name": campaign.name,
            "description": campaign.description,
            "universe_id": campaign.universe_id,
            "next_session_at": campaign.next_session_at,
            "banner_url": campaign.banner_url,
            "invite_code": campaign.invite_code if is_gm else None
        },
        "is_gm": is_gm,
        "party": party_data,
        "notes": notes,
        "handouts": handouts
    }

# --- Content Management Endpoints ---

@router.post("/{campaign_id}/notes", response_model=schemas.CampaignNote)
def create_campaign_note(
    campaign_id: int,
    note: schemas.CampaignNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify membership
    member = db.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign_id,
        models.CampaignMember.user_id == current_user.id
    ).first()
    
    if not member:
         raise HTTPException(status_code=403, detail="Not a member of this campaign")

    new_note = models.CampaignNote(
        campaign_id=campaign_id,
        author_id=current_user.id,
        content=note.content,
        is_private=note.is_private
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.post("/{campaign_id}/handouts", response_model=schemas.Handout)
async def create_handout(
    campaign_id: int,
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify GM
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign or campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can create handouts")

    # Upload to Supabase
    try:
        folder_path = f"campaigns/{campaign_id}/handouts"
        public_url = await upload_image_to_supabase(file, folder_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    new_handout = models.Handout(
        campaign_id=campaign_id,
        name=name,
        content=public_url, # Store the URL as content
        is_visible=False
    )
    db.add(new_handout)
    db.commit()
    db.refresh(new_handout)
    return new_handout

@router.patch("/{campaign_id}/handouts/{handout_id}", response_model=schemas.Handout)
def update_handout(
    campaign_id: int,
    handout_id: int,
    handout_update: schemas.HandoutUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify GM
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign or campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can update handouts")

    handout = db.query(models.Handout).filter(models.Handout.id == handout_id, models.Handout.campaign_id == campaign_id).first()
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    if handout_update.name is not None:
        handout.name = handout_update.name
    if handout_update.content is not None:
        handout.content = handout_update.content
    if handout_update.is_visible is not None:
        handout.is_visible = handout_update.is_visible

    db.commit()
    db.refresh(handout)
    return handout
