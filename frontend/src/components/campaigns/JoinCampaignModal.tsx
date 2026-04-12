import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { X } from 'lucide-react';

interface JoinCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (campaignId: number) => void;
}

export const JoinCampaignModal: React.FC<JoinCampaignModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { getToken } = useAuth();
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const token = await getToken();
            const response = await axios.post('http://localhost:8000/campaigns/join', {
                inviteCode: inviteCode.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Success
            if (onSuccess && response.data.campaign_id) {
                onSuccess(response.data.campaign_id);
            }
            onClose();
            setInviteCode('');
        } catch (err: any) {
            console.error("Join error:", err);
            setError(err.response?.data?.detail || "Failed to join campaign. Please check the code.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>
                
                <h2 className="text-2xl font-bold mb-1 text-gray-900">Join Campaign</h2>
                <p className="text-sm text-gray-500 mb-6">Enter the invite code shared by your Game Master.</p>
                
                <form onSubmit={handleJoin}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none font-mono uppercase tracking-widest text-center text-lg"
                            value={inviteCode}
                            onChange={e => setInviteCode(e.target.value)}
                            placeholder="XYZ-123"
                            disabled={loading}
                        />
                        {error && <p className="text-red-500 text-sm mt-2 flex items-center gap-1">⚠️ {error}</p>}
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-8">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Joining...
                                </>
                            ) : (
                                "Join Adventure"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
