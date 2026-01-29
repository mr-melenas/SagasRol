import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameRoom } from './pages/GameRoom';
import { CharacterSheet } from './pages/CharacterSheet';
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton,
  RedirectToSignIn,
  useUser,
  useAuth
} from "@clerk/clerk-react";
import { useEffect } from 'react';
import axios from 'axios';

// Component to sync Clerk user with Backend
function AuthSync() {
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const syncUser = async () => {
      if (user) {
        try {
          const token = await getToken();
          // Call a protected endpoint to trigger Lazy Sync in backend
          await axios.get('http://localhost:8000/users/me/', {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log("User synced with backend");
        } catch (err) {
          console.error("Failed to sync user with backend", err);
        }
      }
    };
    syncUser();
  }, [user, getToken]);

  return null;
}

function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  const handleCreateCampaign = () => {
    // Logic to open create campaign modal or navigate to create campaign page
    console.log("Create campaign clicked");
  };

  const handleJoinCampaign = () => {
    // Logic to open join campaign modal
    console.log("Join campaign clicked");
  };

  const handleCreateUniverse = () => {
    // Logic to open create universe modal
    console.log("Create universe clicked");
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl">Welcome, {user?.firstName || user?.username || "Traveler"}</h1>
        <div className="flex gap-4 items-center">
             {/* UserButton removed from here as it is already in the header */}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4"> {/* Changed from grid-cols-2 to grid-cols-3 */}
        <div className="border p-4 rounded hover:shadow cursor-pointer flex flex-col gap-4">
          <div>
              <h3 className="font-bold">Campaigns</h3>
              <p>Join or continue a campaign</p>
          </div>
          <div className="flex gap-2 mt-auto">
            <button 
                onClick={handleCreateCampaign}
                className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700 transition-colors flex-1"
            >
                Create
            </button>
            <button 
                onClick={handleJoinCampaign}
                className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700 transition-colors flex-1"
            >
                Join
            </button>
          </div>
        </div>

        <div className="border p-4 rounded hover:shadow cursor-pointer flex flex-col gap-4">
          <div>
              <h3 className="font-bold">Universe</h3>
              <p>Create and manage your worlds</p>
          </div>
          <div className="flex gap-2 mt-auto">
            <button 
                onClick={handleCreateUniverse}
                className="bg-purple-600 text-white px-3 py-1 text-sm rounded hover:bg-purple-700 transition-colors flex-1"
            >
                Create Universe
            </button>
          </div>
        </div>

        <div className="border p-4 rounded hover:shadow cursor-pointer">
          <h3 className="font-bold">My Characters</h3>
          <p>Manage your heroes</p>
          {/* List characters here */}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <header className="p-4 bg-slate-800 text-white flex justify-between items-center">
        <div className="font-bold text-xl">ROL-Sagas</div>
        <div>
           <SignedOut>
             <SignInButton />
           </SignedOut>
           <SignedIn>
             <UserButton />
           </SignedIn>
        </div>
      </header>
      
      {/* AuthSync will only run when user is signed in */}
      <SignedIn>
        <AuthSync />
      </SignedIn>

      <Routes>
        <Route 
          path="/" 
          element={
            <>
              <SignedOut>
                <div className="flex flex-col items-center justify-center h-[80vh]">
                   <h1 className="text-4xl font-bold mb-8">Welcome to the Adventure</h1>
                   <SignInButton mode="modal">
                     <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                       Start Journey
                     </button>
                   </SignInButton>
                </div>
              </SignedOut>
              <SignedIn>
                <Navigate to="/dashboard" />
              </SignedIn>
            </>
          } 
        />
        
        <Route 
          path="/dashboard" 
          element={
            <>
              <SignedOut><RedirectToSignIn /></SignedOut>
              <SignedIn><Dashboard /></SignedIn>
            </>
          } 
        />
        
        <Route 
          path="/game/:campaignId" 
          element={
            <>
              <SignedOut><RedirectToSignIn /></SignedOut>
              <SignedIn><GameRoom /></SignedIn>
            </>
          } 
        />
        
        <Route 
          path="/character/:id" 
          element={
            <>
              <SignedOut><RedirectToSignIn /></SignedOut>
              <SignedIn><CharacterSheet /></SignedIn>
            </>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
