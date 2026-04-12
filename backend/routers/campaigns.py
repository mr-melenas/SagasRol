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
            # "attending_next_session": m.attending_next_session, # Deprecated
            "attendance_status": m.attendance_status,
            "character": {
                "id": character.id, 
                "name": character.name, 
                "image_url": character.image_url,
                "stats": character.stats
            } if character else None
        })

    # Filter Notes and Handouts based on Role
    if is_gm:
        # GM: Only sees their own notes ("Notas de Master")
        # User requested restriction: GM cannot see player diaries.
        notes = db.query(models.CampaignNote).filter(
            models.CampaignNote.campaign_id == campaign_id,
            models.CampaignNote.author_id == current_user.id
        ).all()
        
        # GM sees all handouts
        handouts = db.query(models.Handout).filter(models.Handout.campaign_id == campaign_id).all()
    else:
        # Player: Public notes OR own private notes
        # Maintaining existing logic for players, but ensuring they can't see GM's private notes (already covered by is_private check or author check)
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
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    is_gm = campaign.gm_id == current_user.id

    # Verify membership (or ownership)
    member = db.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign_id,
        models.CampaignMember.user_id == current_user.id
    ).first()
    
    if not member and not is_gm:
         raise HTTPException(status_code=403, detail="Not a member of this campaign")

    new_note = models.CampaignNote(
        campaign_id=campaign_id,
        author_id=current_user.id,
        content=note.content,
        is_private=True # Always private per user requirement
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.post("/{campaign_id}/handouts/text", response_model=schemas.Handout)
def create_handout_text(
    campaign_id: int,
    handout: schemas.HandoutCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign or campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can create handouts")

    new_handout = models.Handout(
        campaign_id=campaign_id,
        name=handout.name,
        content=handout.content,
        is_visible=handout.is_visible
    )
    db.add(new_handout)
    db.commit()
    db.refresh(new_handout)
    return new_handout

@router.patch("/{campaign_id}/notes/{note_id}", response_model=schemas.CampaignNote)
def update_campaign_note(
    campaign_id: int,
    note_id: int,
    note_update: schemas.CampaignNoteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    note = db.query(models.CampaignNote).filter(models.CampaignNote.id == note_id, models.CampaignNote.campaign_id == campaign_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this note")

    if note_update.content is not None:
        note.content = note_update.content
    # Always enforce private
    note.is_private = True

    db.commit()
    db.refresh(note)
    return note

@router.delete("/{campaign_id}/notes/{note_id}")
def delete_campaign_note(
    campaign_id: int,
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    note = db.query(models.CampaignNote).filter(models.CampaignNote.id == note_id, models.CampaignNote.campaign_id == campaign_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    if note.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this note")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}

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

@router.patch("/{campaign_id}/handouts/{handout_id}/visibility", response_model=schemas.Handout)
def toggle_handout_visibility(
    campaign_id: int,
    handout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign or campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can toggle visibility")

    handout = db.query(models.Handout).filter(models.Handout.id == handout_id, models.Handout.campaign_id == campaign_id).first()
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    handout.is_visible = not handout.is_visible
    db.commit()
    db.refresh(handout)
    return handout

@router.delete("/{campaign_id}/handouts/{handout_id}")
def delete_handout(
    campaign_id: int,
    handout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign or campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can delete handouts")

    handout = db.query(models.Handout).filter(models.Handout.id == handout_id, models.Handout.campaign_id == campaign_id).first()
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    db.delete(handout)
    db.commit()
    return {"message": "Handout deleted"}

class AttendanceRequest(schemas.BaseModel):
    is_attending: bool

@router.patch("/{campaign_id}/members/{user_id}/attendance")
def request_attendance(
    campaign_id: int,
    user_id: str,
    attendance: AttendanceRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Permissions
    is_gm = campaign.gm_id == current_user.id
    is_self = current_user.id == user_id
    
    if not (is_gm or is_self):
        raise HTTPException(status_code=403, detail="Not authorized")

    member = db.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign_id,
        models.CampaignMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # LOGIC:
    # If GM: Can set to anything (but using this endpoint, likely just toggling)
    # If Player: 
    #   - If currently CONFIRMED or REJECTED: "Cannot modify after processed" (unless GM allows it?)
    #     The prompt says: "Validation to avoid player modifying response after being processed by master".
    #   - So if status is CONFIRMED or REJECTED, Player cannot change it.
    
    if is_self and not is_gm:
        if member.attendance_status == models.AttendanceStatus.REJECTED:
             raise HTTPException(status_code=400, detail="Attendance rejected by GM. Contact GM to change.")

    # Determine new status
    previous_status = member.attendance_status
    new_status = models.AttendanceStatus.UNKNOWN

    if attendance.is_attending:
        if is_gm:
            new_status = models.AttendanceStatus.CONFIRMED
        else:
            # If already confirmed, stay confirmed (user re-clicking yes)
            if previous_status == models.AttendanceStatus.CONFIRMED:
                new_status = models.AttendanceStatus.CONFIRMED
            else:
                new_status = models.AttendanceStatus.PENDING
    else:
        new_status = models.AttendanceStatus.DECLINED

    member.attendance_status = new_status
    db.add(member)
    
    # Audit Log
    log = models.AttendanceLog(
        campaign_id=campaign_id,
        actor_id=current_user.id,
        target_id=user_id,
        action="REQUEST_ATTENDANCE" if is_self else "GM_UPDATE_ATTENDANCE",
        previous_status=previous_status,
        new_status=new_status
    )
    db.add(log)
    
    db.commit()
    db.refresh(member)
    
    return {"message": "Attendance updated", "status": new_status}

class AttendanceResolution(schemas.BaseModel):
    status: models.AttendanceStatus

@router.post("/{campaign_id}/members/{user_id}/attendance/resolve")
def resolve_attendance(
    campaign_id: int,
    user_id: str,
    resolution: AttendanceResolution,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can resolve attendance")

    member = db.query(models.CampaignMember).filter(
        models.CampaignMember.campaign_id == campaign_id,
        models.CampaignMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if resolution.status not in [models.AttendanceStatus.CONFIRMED, models.AttendanceStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="Invalid resolution status. Must be CONFIRMED or REJECTED.")

    previous_status = member.attendance_status
    member.attendance_status = resolution.status
    db.add(member)

    # Audit Log
    log = models.AttendanceLog(
        campaign_id=campaign_id,
        actor_id=current_user.id,
        target_id=user_id,
        action="RESOLVE_ATTENDANCE",
        previous_status=previous_status,
        new_status=resolution.status
    )
    db.add(log)

    db.commit()
    db.refresh(member)
    
    return {"message": "Attendance resolved", "status": member.attendance_status}

# --- Asset Management Endpoints ---

@router.get("/{campaign_id}/assets", response_model=schemas.CampaignAssetsList)
def list_campaign_assets(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can access assets")

    campaign_assets = db.query(models.CampaignAsset).filter(models.CampaignAsset.campaign_id == campaign_id).all()
    
    universe_assets = []
    if campaign.universe_id:
        universe_assets = db.query(models.Asset).filter(models.Asset.universe_id == campaign.universe_id).all()

    return {"campaign_assets": campaign_assets, "universe_assets": universe_assets}

@router.post("/{campaign_id}/assets", response_model=schemas.CampaignAsset)
async def upload_campaign_asset(
    campaign_id: int,
    name: str = Form(...),
    file: UploadFile = File(...),
    tags: str = Form("[]"), # JSON string for list of tags
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    import json
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can upload assets")

    # Validate name unique in campaign
    if db.query(models.CampaignAsset).filter(models.CampaignAsset.campaign_id == campaign_id, models.CampaignAsset.name == name).first():
        raise HTTPException(status_code=400, detail="Asset name already exists in this campaign")

    try:
        parsed_tags = json.loads(tags)
        if not isinstance(parsed_tags, list):
             parsed_tags = []
        if len(parsed_tags) > 10:
             raise HTTPException(status_code=400, detail="Maximum 10 tags allowed")
    except:
        parsed_tags = []

    try:
        folder_path = f"campaigns/{campaign_id}/assets"
        public_url = await upload_image_to_supabase(file, folder_path)
        
        # Ensure string
        if not isinstance(public_url, str):
             if hasattr(public_url, 'publicUrl'):
                  public_url = public_url.publicUrl
             elif isinstance(public_url, dict) and 'publicUrl' in public_url:
                  public_url = public_url['publicUrl']
             else:
                  public_url = str(public_url)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Asset upload failed: {str(e)}")

    new_asset = models.CampaignAsset(
        campaign_id=campaign_id,
        name=name,
        file_url=public_url,
        is_preselected=False,
        tags=parsed_tags
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset

@router.patch("/{campaign_id}/assets/{asset_id}", response_model=schemas.CampaignAsset)
def update_campaign_asset(
    campaign_id: int,
    asset_id: int,
    asset_update: schemas.CampaignAssetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can update assets")

    asset = db.query(models.CampaignAsset).filter(models.CampaignAsset.id == asset_id, models.CampaignAsset.campaign_id == campaign_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset_update.name is not None:
        # Check uniqueness if name changed
        if asset_update.name != asset.name:
             if db.query(models.CampaignAsset).filter(models.CampaignAsset.campaign_id == campaign_id, models.CampaignAsset.name == asset_update.name).first():
                  raise HTTPException(status_code=400, detail="Asset name already exists")
        asset.name = asset_update.name

    if asset_update.tags is not None:
        if len(asset_update.tags) > 10:
             raise HTTPException(status_code=400, detail="Maximum 10 tags allowed")
        asset.tags = asset_update.tags

    db.commit()
    db.refresh(asset)
    return asset

@router.delete("/{campaign_id}/assets/{asset_id}")
def delete_campaign_asset(
    campaign_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can delete assets")

    asset = db.query(models.CampaignAsset).filter(models.CampaignAsset.id == asset_id, models.CampaignAsset.campaign_id == campaign_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted"}

@router.patch("/{campaign_id}/assets/{asset_id}/preselect", response_model=schemas.CampaignAsset)
def toggle_asset_preselect(
    campaign_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can manage assets")

    asset = db.query(models.CampaignAsset).filter(models.CampaignAsset.id == asset_id, models.CampaignAsset.campaign_id == campaign_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.is_preselected = not asset.is_preselected
    db.commit()
    db.refresh(asset)
    return asset

@router.post("/{campaign_id}/assets/copy-from-universe", response_model=schemas.CampaignAsset)
def copy_asset_from_universe(
    campaign_id: int,
    data: schemas.AssetCopyFromUniverse,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.gm_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only GM can copy assets")

    # Check for name duplication
    final_name = data.name
    counter = 1
    while db.query(models.CampaignAsset).filter(models.CampaignAsset.campaign_id == campaign_id, models.CampaignAsset.name == final_name).first():
        final_name = f"{data.name} ({counter})"
        counter += 1

    new_asset = models.CampaignAsset(
        campaign_id=campaign_id,
        name=final_name,
        file_url=data.universe_asset_url,
        is_preselected=True,
        tags=[] # Copy tags? Maybe later.
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset
