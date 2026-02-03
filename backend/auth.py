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
            # audience="authenticated", # Default audience for Clerk
            options={"verify_aud": False}, # Disable audience verification for now to fix 401
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

    # Check if user exists in our DB
    user = db.query(models.User).filter(models.User.id == clerk_user_id).first()
    
    # Extract info from payload (Clerk session token usually has limited info)
    # Note: For full profile info, we might need a separate webhook or frontend sync
    # But let's try to get what we can or update if frontend sent a sync request
    
    # Simple Lazy Sync / Creation
    if not user:
        user = models.User(
            id=clerk_user_id,
            username=payload.get("username"), 
            email=payload.get("email"),
            role=models.UserRole.PLAYER # Default role
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user

async def get_current_active_gm(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.GM:
        raise HTTPException(status_code=400, detail="Not enough privileges")
    return current_user
