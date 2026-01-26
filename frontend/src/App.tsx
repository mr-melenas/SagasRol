import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { GameRoom } from './pages/GameRoom';
import { CharacterSheet } from './pages/CharacterSheet';
import { useStore } from './store/useStore';

function Dashboard() {
  const { user, logout } = useStore();
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl">Welcome, {user?.username}</h1>
        <button onClick={logout} className="text-red-500">Logout</button>
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

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = useStore(state => state.token);
  if (!token) return <Navigate to="/login" />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/game/:campaignId" element={<ProtectedRoute><GameRoom /></ProtectedRoute>} />
        <Route path="/character/:id" element={<ProtectedRoute><CharacterSheet /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
