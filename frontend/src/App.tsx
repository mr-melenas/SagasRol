import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GameRoom } from './pages/GameRoom';
import { CharacterSheet } from './pages/CharacterSheet';
import { CreateUniverse } from './pages/CreateUniverse';
import { UniverseSettings } from './pages/UniverseSettings';
import { SheetManager } from './pages/SheetManager';
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton,
  RedirectToSignIn,
  useUser,
  useAuth
} from "@clerk/clerk-react";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Universe } from './types';

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
  const navigate = useNavigate();
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [loadingUniverses, setLoadingUniverses] = useState(true);

  useEffect(() => {
      const fetchUniverses = async () => {
          try {
              const token = await getToken();
              const res = await axios.get('http://localhost:8000/universes/', {
                  headers: { Authorization: `Bearer ${token}` }
              });
              setUniverses(res.data);
          } catch (err) {
              console.error("Failed to fetch universes", err);
          } finally {
              setLoadingUniverses(false);
          }
      };
      if (user) fetchUniverses();
  }, [user, getToken]);
  
  const handleCreateCampaign = () => {
    // Logic to open create campaign modal or navigate to create campaign page
    console.log("Create campaign clicked");
  };

  const handleJoinCampaign = () => {
    // Logic to open join campaign modal
    console.log("Join campaign clicked");
  };

  const handleCreateUniverse = () => {
    navigate('/create-universe');
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl">Welcome, {user?.firstName || user?.username || "Traveler"}</h1>
        <div className="flex gap-4 items-center">
             {/* UserButton removed from here as it is already in the header */}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Campaigns Column */}
        <div className="border p-4 rounded hover:shadow flex flex-col gap-4 bg-white">
          <div>
              <h3 className="font-bold text-lg mb-2">Active Campaigns</h3>
              <p className="text-gray-600 text-sm">Join or continue your adventures.</p>
          </div>
          <div className="flex gap-2 mt-auto">
            <button 
                onClick={handleCreateCampaign}
                className="bg-green-600 text-white px-3 py-2 text-sm rounded hover:bg-green-700 transition-colors flex-1 font-semibold"
            >
                Create Campaign
            </button>
            <button 
                onClick={handleJoinCampaign}
                className="bg-blue-600 text-white px-3 py-2 text-sm rounded hover:bg-blue-700 transition-colors flex-1 font-semibold"
            >
                Join Campaign
            </button>
          </div>
        </div>

        {/* Universes Column (Spans 2 columns on large screens) */}
        <div className="lg:col-span-2 border p-6 rounded bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-xl">Your Universes</h3>
                    <p className="text-gray-500 text-sm">Manage the worlds you have created.</p>
                </div>
                <button 
                    onClick={handleCreateUniverse}
                    className="bg-purple-600 text-white px-4 py-2 text-sm rounded hover:bg-purple-700 transition-colors font-bold flex items-center gap-2"
                >
                    <span>+</span> Create Universe
                </button>
            </div>

            {loadingUniverses ? (
                <div className="flex justify-center py-8">
                    <span className="text-gray-400 animate-pulse">Loading worlds...</span>
                </div>
            ) : universes.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 mb-2">You haven't created any universe yet.</p>
                    <button onClick={handleCreateUniverse} className="text-purple-600 font-semibold hover:underline">Start your first world</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {universes.map(universe => (
                        <div key={universe.id} className="bg-white rounded-lg shadow overflow-hidden border hover:border-purple-300 transition-all group">
                            <div className="h-32 bg-gray-200 relative">
                                {universe.cover_url ? (
                                    <img 
                                        src={`http://localhost:8000${universe.cover_url}`} 
                                        alt={universe.name} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                                        No Cover
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">Private</span>
                                </div>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-lg mb-1 truncate">{universe.name}</h4>
                                <p className="text-gray-500 text-xs mb-4 line-clamp-2 h-8">
                                    {universe.description || "No description provided."}
                                </p>
                                <button 
                                    className="w-full border border-gray-300 text-gray-600 text-sm py-1 rounded hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    onClick={() => navigate(`/universe/${universe.id}/edit`)}
                                >
                                    Manage
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
          path="/create-universe" 
          element={
            <>
              <SignedOut><RedirectToSignIn /></SignedOut>
              <SignedIn><CreateUniverse /></SignedIn>
            </>
          } 
        />

        <Route 
          path="/universe/:id/edit" 
          element={
            <>
              <SignedOut><RedirectToSignIn /></SignedOut>
              <SignedIn><UniverseSettings /></SignedIn>
            </>
          } 
        />
        
        <Route 
          path="/sheets" 
          element={
            <>
              <SignedOut><RedirectToSignIn /></SignedOut>
              <SignedIn><SheetManager /></SignedIn>
            </>
          } 
        />

        <Route 
          path="/sheets/new" 
          element={
            <>
              <SignedOut><RedirectToSignIn /></SignedOut>
              <SignedIn><SheetManager mode="create" /></SignedIn>
            </>
          } 
        />

        <Route 
          path="/sheets/:id/edit" 
          element={
            <>
              <SignedOut><RedirectToSignIn /></SignedOut>
              <SignedIn><SheetManager mode="edit" /></SignedIn>
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
