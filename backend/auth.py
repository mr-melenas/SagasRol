import jwt
from jwt.algorithms import RSAAlgorithm
import requests
import json
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
try:
    from . import schemas, database, models
except ImportError:
    import schemas, database, models

# Configuration
CLERK_ISSUER = "https://fun-sloth-43.clerk.accounts.dev"  # Replace with your Clerk Issuer URL
JWKS_URL = f"{CLERK_ISSUER}/.well-known/jwks.json"

security = HTTPBearer()

def get_jwks():
    try:
        response = requests.get(JWKS_URL)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching JWKS: {e}")
        return None

def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Get Key ID from token header
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        
        jwks = get_jwks()
        if not jwks:
             raise HTTPException(status_code=500, detail="Could not verify token configuration")

        # Find the correct key
        key = None
        for k in jwks["keys"]:
            if k["kid"] == kid:
                key = k
                break
        
        if not key:
            raise HTTPException(status_code=401, detail="Invalid token key")

        # Construct public key
        public_key = RSAAlgorithm.from_jwk(json.dumps(key))
        
        # Verify token
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience="authenticated", # Default audience for Clerk
            issuer=CLERK_ISSUER
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def get_current_user(payload: dict = Depends(verify_clerk_token), db: Session = Depends(database.get_db)):
    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Check if user exists in our DB, if not create/sync
    user = db.query(models.User).filter(models.User.id == clerk_user_id).first()
    
    if not user:
        # Create new user mapped to Clerk ID
        # Extract additional info if available (though 'sub' is the only guaranteed claim in standard JWT)
        # We might need to fetch user details from Clerk API if we want email/username here, 
        # or rely on frontend to send it, but for Lazy Sync 'id' is enough to start.
        
        # NOTE: Clerk JWTs might not contain email/username by default unless customized. 
        # For this implementation, we initialize with what we have.
        
        user = models.User(
            id=clerk_user_id,
            username=payload.get("username"), # Might be None
            email=payload.get("email"), # Might be None
            avatar_url=payload.get("image_url"), # Might be None
            role=models.UserRole.PLAYER
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user

async def get_current_active_gm(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.GM:
        raise HTTPException(status_code=400, detail="Not enough privileges")
    return current_user
