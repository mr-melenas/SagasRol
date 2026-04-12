import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { Plus, Users, Shield, User, ChevronRight, Swords, RefreshCw, AlertCircle } from 'lucide-react';
import { Campaign, CampaignList } from '../../types';
import { JoinCampaignModal } from '../campaigns/JoinCampaignModal';

export const ActiveCampaignsCard: React.FC = () => {
    const { getToken } = useAuth();
    const navigate = useNavigate();
    
    const [campaigns, setCampaigns] = useState<CampaignList>({ mastering: [], playing: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const fetchCampaigns = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getToken();
            const response = await axios.get('http://localhost:8000/campaigns/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaigns(response.data);
        } catch (err) {
            console.error("Failed to fetch campaigns", err);
            setError("Could not load your campaigns.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, [getToken]);

    const handleCreateClick = () => {
        // Navigate to campaigns page and open create modal
        navigate('/campaigns', { state: { openCreate: true } });
    };

    const handleCampaignClick = (id: number) => {
        navigate(`/campaigns/${id}/lobby`);
    };

    const allCampaigns = [
        ...campaigns.mastering.map(c => ({ ...c, role: 'GM' })),
        ...campaigns.playing.map(c => ({ ...c, role: 'PLAYER' }))
    ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return (
        <div className="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 p-5 rounded-xl flex flex-col gap-4 bg-white h-full relative overflow-hidden group">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <Swords className="text-indigo-600" size={20} />
                        Active Campaigns
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">Join or continue your adventures.</p>
                </div>
                {loading && <RefreshCw className="animate-spin text-gray-400" size={16} />}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-[160px] max-h-[300px] pr-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {loading ? (
                    <div className="space-y-3 mt-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-red-50 rounded-lg border border-red-100 text-red-600">
                        <AlertCircle size={24} className="mb-2" />
                        <p className="text-sm font-medium">{error}</p>
                        <button onClick={fetchCampaigns} className="text-xs underline mt-2 hover:text-red-800">Retry</button>
                    </div>
                ) : allCampaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                        <Swords size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-medium text-gray-500">No active campaigns</p>
                        <p className="text-xs mt-1">Start a new adventure or join one!</p>
                    </div>
                ) : (
                    <div className="space-y-2 mt-2">
                        {allCampaigns.map((camp) => (
                            <div 
                                key={camp.id}
                                onClick={() => handleCampaignClick(camp.id)}
                                className="group/item flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all duration-200 relative"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                                    camp.role === 'GM' 
                                        ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-50' 
                                        : 'bg-blue-100 text-blue-600 ring-2 ring-blue-50'
                                }`}>
                                    {camp.role === 'GM' ? <Shield size={18} /> : <User size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="font-bold text-gray-800 text-sm truncate pr-2">{camp.name}</h4>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                                            camp.role === 'GM' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {camp.role}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>ID: {camp.id}</span>
                                        {camp.next_session_at && (
                                            <>
                                                <span>•</span>
                                                <span className="text-green-600 font-medium">Next Session: {new Date(camp.next_session_at).toLocaleDateString()}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 group-hover/item:text-indigo-500 transition-colors" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                <button 
                    onClick={handleCreateClick}
                    className="bg-green-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-green-700 active:scale-95 transition-all flex-1 font-semibold shadow-sm hover:shadow-green-200 flex items-center justify-center gap-1.5"
                >
                    <Plus size={16} /> Create
                </button>
                <button 
                    onClick={() => setShowJoinModal(true)}
                    className="bg-blue-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-blue-700 active:scale-95 transition-all flex-1 font-semibold shadow-sm hover:shadow-blue-200 flex items-center justify-center gap-1.5"
                >
                    <Users size={16} /> Join
                </button>
            </div>

            {/* Modals */}
            <JoinCampaignModal 
                isOpen={showJoinModal} 
                onClose={() => setShowJoinModal(false)}
                onSuccess={(id) => {
                    fetchCampaigns();
                    navigate(`/campaigns/${id}/lobby`);
                }}
            />
        </div>
    );
};
