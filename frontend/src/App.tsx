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
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl">Welcome, {user?.firstName || user?.username || "Traveler"}</h1>
        <UserButton />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 rounded hover:shadow cursor-pointer">
          <h3 className="font-bold">Campaigns</h3>
          <p>Join or continue a campaign</p>
          {/* List campaigns here */}
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
