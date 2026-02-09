import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { Universe } from '../../types';
import { CharacterSheetView } from '../../components/player/CharacterSheetView';
import { useCharacterStore } from '../../store/useCharacterStore';
import { ArrowLeft, Save } from 'lucide-react';

export const CreateCharacter: React.FC = () => {
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { characterValues, reset } = useCharacterStore();
    
    const [universes, setUniverses] = useState<Universe[]>([]);
    const [selectedUniverseId, setSelectedUniverseId] = useState<string>('');
    const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
    const [characterName, setCharacterName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Reset store on mount
        reset();
        
        const fetchUniverses = async () => {
            try {
                const token = await getToken();
                const res = await axios.get('http://localhost:8000/universes/available', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUniverses(res.data);
            } catch (err) {
                console.error("Failed to fetch universes", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUniverses();
    }, [getToken, reset]);

    const handleUniverseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const universeId = e.target.value;
        setSelectedUniverseId(universeId);
        if (universeId) {
            const universe = universes.find(u => u.id.toString() === universeId);
            setSelectedUniverse(universe || null);
        } else {
            setSelectedUniverse(null);
        }
    };

    const handleSave = async () => {
        if (!characterName.trim()) {
            alert("Please enter a character name");
            return;
        }
        if (!selectedUniverseId) {
            alert("Please select a universe");
            return;
        }

        setSaving(true);
        try {
            const token = await getToken();
            await axios.post('http://localhost:8000/characters/', {
                name: characterName,
                universe_id: parseInt(selectedUniverseId),
                stats: characterValues // Mapping 'values' to 'stats' as per backend schema
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Redirect to dashboard or character sheet
            navigate('/dashboard');
        } catch (err) {
            console.error("Failed to create character", err);
            alert("Failed to create character");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800">Create New Character</h1>
                    </div>
                    <div className="flex items-center gap-4">
                         <div className="flex flex-col items-end">
                            <label className="text-xs text-gray-500 font-bold uppercase">Character Name</label>
                            <input 
                                type="text" 
                                value={characterName}
                                onChange={(e) => setCharacterName(e.target.value)}
                                placeholder="Enter Name..."
                                className="border-b border-gray-300 focus:border-indigo-600 outline-none px-1 py-1 text-right font-medium w-48 bg-transparent"
                            />
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Character'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
                {/* Step 1: Universe Selection */}
                <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Universe / Game System</label>
                    {loading ? (
                        <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
                    ) : (
                        <select 
                            value={selectedUniverseId} 
                            onChange={handleUniverseChange}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                        >
                            <option value="">-- Choose a Universe --</option>
                            {universes.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    )}
                    {selectedUniverse && (
                        <div className="mt-4 flex items-center gap-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                            {selectedUniverse.cover_url && (
                                <img src={`http://localhost:8000${selectedUniverse.cover_url}`} alt={selectedUniverse.name} className="w-16 h-16 object-cover rounded shadow-sm" />
                            )}
                            <div>
                                <h3 className="font-bold text-indigo-900">{selectedUniverse.name}</h3>
                                <p className="text-sm text-indigo-700 line-clamp-2">{selectedUniverse.description}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 2: Character Sheet */}
                {selectedUniverseId && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {selectedUniverse?.sheetTemplate ? (
                            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                                <div className="bg-gray-50 border-b px-6 py-3">
                                    <h2 className="font-bold text-gray-700">Character Sheet</h2>
                                </div>
                                <CharacterSheetView 
                                    templateData={selectedUniverse.sheetTemplate.structure} 
                                />
                            </div>
                        ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                                <span className="text-4xl mb-4 block">⚠️</span>
                                <h3 className="text-lg font-bold text-yellow-800 mb-2">No Rules Configured</h3>
                                <p className="text-yellow-700">This universe doesn't have a character sheet template yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
