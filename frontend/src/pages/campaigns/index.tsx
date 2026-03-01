import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Copy, ArrowRight, User as UserIcon, Shield } from 'lucide-react';
// import { useUniverseStore } from '../../stores/useUniverseStore';

interface Campaign {
    id: number;
    name: string;
    description: string;
    inviteCode: string;
    universe_id: number;
    gm_id: string;
}

interface CampaignList {
    mastering: Campaign[];
    playing: Campaign[];
}

interface Character {
    id: number;
    name: string;
    universe_id: number;
}

export const CampaignsDashboard: React.FC = () => {
    const { getToken, userId } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<CampaignList>({ mastering: [], playing: [] });
    const [universes, setUniverses] = useState<any[]>([]);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCampaignName, setNewCampaignName] = useState('');
    const [newCampaignDesc, setNewCampaignDesc] = useState('');
    const [selectedUniverseId, setSelectedUniverseId] = useState<number | ''>('');

    // Join Modal State
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [inviteCode, setInviteCode] = useState('');

    useEffect(() => {
        fetchData();
        if (location.state && (location.state as any).openCreate) {
            setShowCreateModal(true);
            // Optional: Clear state so it doesn't reopen on refresh
            // navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Campaigns
            const campRes = await axios.get('http://localhost:8000/campaigns/', { headers });
            setCampaigns(campRes.data);

            // Fetch Universes (for creating campaign)
            const univRes = await axios.get('http://localhost:8000/universes/available', { headers });
            setUniverses(univRes.data);

        } catch (error: any) {
            console.error("Error fetching data", error);
            if (error.code === 'ERR_NETWORK') {
                alert("Cannot connect to server. Please check if backend is running.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCampaignName || !selectedUniverseId) return;

        try {
            const token = await getToken();
            await axios.post('http://localhost:8000/campaigns/', {
                name: newCampaignName,
                description: newCampaignDesc,
                universe_id: Number(selectedUniverseId)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCreateModal(false);
            setNewCampaignName('');
            setNewCampaignDesc('');
            setSelectedUniverseId('');
            fetchData();
        } catch (error) {
            console.error("Error creating campaign", error);
            alert("Failed to create campaign");
        }
    };

    const handleJoinCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode) return;

        try {
            const token = await getToken();
            const response = await axios.post('http://localhost:8000/campaigns/join', {
                inviteCode
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowJoinModal(false);
            setInviteCode('');
            
            // Redirect to the lobby of the newly joined campaign
            if (response.data.campaign_id) {
                navigate(`/campaigns/${response.data.campaign_id}/lobby`);
            } else {
                fetchData();
                alert("Joined campaign successfully!");
            }
        } catch (error: any) {
            console.error("Error joining campaign", error);
            alert(error.response?.data?.detail || "Failed to join campaign");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Code copied to clipboard!");
    };

    if (loading) return <div className="p-8 text-center">Loading campaigns...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowJoinModal(true)}
                        className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 font-medium"
                    >
                        Join with Code
                    </button>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
                    >
                        <Plus size={20} /> New Campaign
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* GM Section */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Shield className="text-orange-600" />
                        <h2 className="text-xl font-bold text-gray-800">Gamemastering</h2>
                    </div>
                    
                    {campaigns.mastering.length === 0 ? (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
                            You are not running any campaigns yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.mastering.map(camp => (
                                <div key={camp.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">{camp.name}</h3>
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">GM</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{camp.description || "No description provided."}</p>
                                    
                                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded text-sm font-mono text-gray-700">
                                            <span>Code:</span>
                                            <span className="font-bold select-all">{camp.inviteCode}</span>
                                            <button onClick={() => copyToClipboard(camp.inviteCode)} className="text-gray-400 hover:text-indigo-600">
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => navigate(`/campaigns/${camp.id}/lobby`)}
                                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
                                        >
                                            Manage <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Player Section */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <UserIcon className="text-blue-600" />
                        <h2 className="text-xl font-bold text-gray-800">Playing</h2>
                    </div>

                    {campaigns.playing.length === 0 ? (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
                            You are not playing in any campaigns yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.playing.map(camp => (
                                <div key={camp.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">{camp.name}</h3>
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">Player</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{camp.description || "No description provided."}</p>
                                    
                                    <div className="flex justify-end pt-4 border-t border-gray-100">
                                        <button 
                                            onClick={() => navigate(`/campaigns/${camp.id}/lobby`)}
                                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium transition-colors"
                                        >
                                            Enter Campaign
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-4">Create New Campaign</h2>
                        <form onSubmit={handleCreateCampaign}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    value={newCampaignName}
                                    onChange={e => setNewCampaignName(e.target.value)}
                                    placeholder="The Legend of..."
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Universe (Ruleset)</label>
                                <select 
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    value={selectedUniverseId}
                                    onChange={e => setSelectedUniverseId(Number(e.target.value))}
                                >
                                    <option value="">Select a Universe...</option>
                                    {universes.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                                <textarea 
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24 resize-none"
                                    value={newCampaignDesc}
                                    onChange={e => setNewCampaignDesc(e.target.value)}
                                    placeholder="A brief summary of the adventure..."
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                >
                                    Create Campaign
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Join Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold mb-4">Join Campaign</h2>
                        <form onSubmit={handleJoinCampaign}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono uppercase"
                                    value={inviteCode}
                                    onChange={e => setInviteCode(e.target.value)}
                                    placeholder="XYZ123"
                                />
                                <p className="text-xs text-gray-500 mt-1">Ask your GM for this code.</p>
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setShowJoinModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                >
                                    Join Campaign
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};