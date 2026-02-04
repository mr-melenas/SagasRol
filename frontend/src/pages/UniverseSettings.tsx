import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Universe, Asset, AssetType } from '../types';
import { SheetBuilder } from '../components/builder/SheetBuilder';

export const UniverseSettings: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { user } = useUser();
    
    const [universe, setUniverse] = useState<Universe | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'assets'>('general');
    
    // Form States
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPublic: true,
        tags: [] as string[]
    });
    const [newTag, setNewTag] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const token = await getToken();
                const [uniRes, assetRes] = await Promise.all([
                    axios.get(`http://localhost:8000/universes/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`http://localhost:8000/universes/${id}/assets`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                
                const uniData = uniRes.data;
                setUniverse(uniData);
                setAssets(assetRes.data);
                
                // Init Form
                setFormData({
                    name: uniData.name,
                    description: uniData.description || '',
                    isPublic: uniData.isPublic ?? true,
                    tags: uniData.tags || []
                });
                
            } catch (err) {
                console.error("Failed to load universe", err);
                // Handle 403 or 404
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, getToken]);

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
    };

    const handleSwitchChange = (val: boolean) => {
        if (!val) {
            if (!window.confirm("Are you sure? A private universe cannot be seen by players until invited.")) return;
        }
        setFormData(prev => ({ ...prev, isPublic: val }));
        setIsDirty(true);
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newTag.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(newTag.trim())) {
                setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
                setIsDirty(true);
            }
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!window.confirm(`Update universe "${formData.name}"?`)) return;
        
        try {
            const token = await getToken();
            const res = await axios.patch(`http://localhost:8000/universes/${id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUniverse(res.data);
            setIsDirty(false);
            alert("Universe updated successfully!");
        } catch (err) {
            console.error("Failed to update", err);
            alert("Failed to save changes.");
        }
    };

    // Asset Upload Handler (Mock for now or reuse existing logic)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: AssetType) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        try {
            const token = await getToken();
            // 1. Upload File
            const uploadData = new FormData();
            uploadData.append('file', file);
            const uploadRes = await axios.post('http://localhost:8000/assets/upload', uploadData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            const imageUrl = uploadRes.data;

            // 2. Create Asset Record
            const assetPayload = {
                name: file.name.split('.')[0],
                image_url: imageUrl,
                type: type,
                universe_id: parseInt(id)
            };
            
            const createRes = await axios.post('http://localhost:8000/assets/', assetPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAssets(prev => [...prev, createRes.data]);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload asset");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;
    if (!universe) return <div className="p-8 text-center">Universe not found</div>;

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <span className="text-gray-400 cursor-pointer hover:text-gray-800" onClick={() => navigate('/dashboard')}>&larr;</span>
                    {universe.name} Settings
                </h1>
                {isDirty && (
                    <button 
                        onClick={handleSave}
                        className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 animate-pulse font-bold"
                    >
                        Save Changes
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6">
                {(['general', 'rules', 'assets'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 capitalize font-medium ${activeTab === tab ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
                
                {/* GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="space-y-6 max-w-2xl">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Universe Name</label>
                            <input 
                                type="text" 
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full border rounded p-2"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea 
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full border rounded p-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (Press Enter)</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.tags.map(tag => (
                                    <span key={tag} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm flex items-center gap-1">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-red-600">&times;</button>
                                    </span>
                                ))}
                            </div>
                            <input 
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder="Add a genre tag..."
                                className="w-full border rounded p-2"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded border">
                            <div>
                                <h4 className="font-bold">Visibility</h4>
                                <p className="text-sm text-gray-500">{formData.isPublic ? "Public: Visible to everyone" : "Private: Only invited players"}</p>
                            </div>
                            <button 
                                onClick={() => handleSwitchChange(!formData.isPublic)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${formData.isPublic ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isPublic ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                )}

                {/* RULES TAB */}
                {activeTab === 'rules' && (
                    <div>
                        <h3 className="text-xl font-bold mb-4">Game System Rules</h3>
                        <p className="text-gray-500 mb-6">Design the character sheet for your universe. Players will use this template to create their characters.</p>
                        
                        <SheetBuilder />
                    </div>
                )}

                {/* ASSETS TAB */}
                {activeTab === 'assets' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Universe Assets</h3>
                            {/* Filter Logic could go here */}
                        </div>

                        {Object.values(AssetType).map(type => (
                            <div key={type} className="mb-8">
                                <div className="flex justify-between items-center mb-2 border-b pb-1">
                                    <h4 className="font-bold text-gray-700">{type}s</h4>
                                    <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-100">
                                        + Upload {type}
                                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, type)} accept="image/*" />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {assets.filter(a => a.type === type).map(asset => (
                                        <div key={asset.id} className="relative group border rounded overflow-hidden">
                                            <img src={`http://localhost:8000${asset.image_url}`} alt={asset.name} className="w-full h-32 object-cover" />
                                            <div className="p-2 bg-white">
                                                <p className="text-sm truncate font-medium">{asset.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {assets.filter(a => a.type === type).length === 0 && (
                                        <div className="text-sm text-gray-400 italic p-4">No {type.toLowerCase()}s uploaded yet.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
