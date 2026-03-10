import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AssetCard } from '../components/assets/AssetCard';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Universe, Asset, AssetType, CharacterSheetTemplate } from '../types';
import { SheetBuilder } from '../components/builder/SheetBuilder';
import { FileText, ExternalLink, RefreshCw, Image as ImageIcon } from 'lucide-react';

export const UniverseSettings: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getToken } = useAuth();
    const { user } = useUser();
    
    const [universe, setUniverse] = useState<Universe | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'assets' | 'advanced'>('general');
    
    // Template States
    const [templates, setTemplates] = useState<CharacterSheetTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

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
                
                // Fetch Universe (Critical)
                try {
                    const uniRes = await axios.get(`http://localhost:8000/universes/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const uniData = uniRes.data;
                    setUniverse(uniData);
                    
                    if (uniData.sheetTemplateId) {
                        setSelectedTemplateId(uniData.sheetTemplateId);
                    }
                    
                    // Init Form
                    setFormData({
                        name: uniData.name,
                        description: uniData.description || '',
                        isPublic: uniData.isPublic ?? true,
                        tags: uniData.tags || []
                    });
                } catch (err) {
                    console.error("Critical: Failed to load universe data", err);
                    setLoading(false);
                    return; // Stop if universe can't be loaded
                }

                // Fetch Assets (Non-critical)
                try {
                    const assetRes = await axios.get(`http://localhost:8000/universes/${id}/assets`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setAssets(assetRes.data);
                } catch (err) {
                    console.error("Warning: Failed to load assets", err);
                }

                // Fetch Templates (Non-critical)
                try {
                    const templatesRes = await axios.get('http://localhost:8000/sheets/', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setTemplates(templatesRes.data);
                } catch (err) {
                    console.error("Warning: Failed to load templates", err);
                }
                
            } catch (err) {
                console.error("Unexpected error in fetchData", err);
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

    const handleTemplateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTemplateId = e.target.value;
        setSelectedTemplateId(newTemplateId);
        
        if (!id) return;

        // Auto-save selection
        try {
            const token = await getToken();
            await axios.patch(`http://localhost:8000/universes/${id}`, {
                sheetTemplateId: newTemplateId || null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Error updating universe template", err);
            alert("Failed to update template selection");
        }
    };

    const loadTemplates = async () => {
        try {
            const token = await getToken();
            const res = await axios.get('http://localhost:8000/sheets/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(res.data);
        } catch (err) {
            console.error("Error loading templates", err);
        }
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

    // Asset Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: AssetType) => {
        const file = e.target.files?.[0];
        if (!file || !id || !universe) return;

        // Security check: Only GM can upload
        if (universe.gm_id !== user?.id) {
            alert("Only the Game Master can upload assets.");
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert("Please upload an image file.");
            return;
        }

        // Max size check (e.g. 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large (Max 5MB).");
            return;
        }

        setLoading(true); // Show loading state for the whole section or handle locally

        try {
            const token = await getToken();
            
            // 1. Upload File to Supabase
            const uploadData = new FormData();
            uploadData.append('file', file);
            
            console.log("Starting upload...");
            const uploadRes = await axios.post('http://localhost:8000/assets/upload', uploadData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            const imageUrl = uploadRes.data;
            console.log("Upload successful, URL:", imageUrl);

            // 2. Create Asset Record in DB
            const assetPayload = {
                name: file.name.split('.')[0], // Default name from filename
                image_url: imageUrl,
                type: type,
                universe_id: parseInt(id),
                tags: [] // Init empty tags
            };
            
            const createRes = await axios.post('http://localhost:8000/assets/', assetPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Asset created:", createRes.data);
            setAssets(prev => [...prev, createRes.data]);
            alert(`${type} uploaded successfully!`);
        } catch (err: any) {
            console.error("Upload failed", err);
            const msg = err.response?.data?.detail || "Failed to upload asset. Please try again.";
            alert(msg);
        } finally {
            setLoading(false);
            // Reset input value to allow re-uploading same file if needed
            e.target.value = ''; 
        }
    };

    const handleAssetDelete = (assetId: number) => {
        setAssets(prev => prev.filter(a => a.id !== assetId));
    };

    const handleAssetUpdate = (updatedAsset: Asset) => {
        setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
    };


    const handleDeleteUniverse = async () => {
        if (!id || !universe) return;
        
        const confirmName = window.prompt(`To confirm deletion, please type "${universe.name}" below:`);
        
        if (confirmName !== universe.name) {
            if (confirmName !== null) alert("Universe name does not match. Deletion cancelled.");
            return;
        }

        try {
            const token = await getToken();
            await axios.delete(`http://localhost:8000/universes/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Universe deleted successfully.");
            navigate('/dashboard');
        } catch (err) {
            console.error("Failed to delete universe", err);
            alert("Failed to delete universe. Please try again.");
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
                {(['general', 'rules', 'assets', 'advanced'] as const).map(tab => (
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
                        <p className="text-gray-500 mb-6">Select the Character Sheet Template for this universe.</p>
                        
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                            <label className="block font-bold text-gray-700 mb-2">Active Character Sheet</label>
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <select 
                                        className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={selectedTemplateId}
                                        onChange={handleTemplateChange}
                                    >
                                        <option value="">-- Select a Template --</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                        <FileText size={18} />
                                    </div>
                                </div>
                                <button 
                                    onClick={loadTemplates}
                                    className="p-3 bg-white border border-gray-300 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                    title="Refresh Templates"
                                >
                                    <RefreshCw size={20} />
                                </button>
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between text-sm">
                                <p className="text-gray-500">
                                    {selectedTemplateId 
                                        ? "Players will use this template when creating characters." 
                                        : "No template selected. Players won't be able to create characters."}
                                </p>
                                <a 
                                    href="/sheets" 
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-blue-600 font-medium hover:underline"
                                >
                                    Manage Templates <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>

                        {selectedTemplateId && (
                            <div className="border rounded-lg overflow-hidden opacity-75 pointer-events-none bg-gray-50">
                                <div className="bg-gray-100 px-4 py-2 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Preview (Read Only)
                                </div>
                                <div className="p-4 transform scale-90 origin-top">
                                    <SheetBuilder /> 
                                </div>
                            </div>
                        )}
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
                                    {user?.id === universe.gm_id && (
                                        <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium">
                                            <span>+ Upload {type}</span>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                onChange={(e) => handleFileUpload(e, type)} 
                                                accept="image/*" 
                                            />
                                        </label>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {assets.filter(a => a.type === type).map(asset => (
                                        <AssetCard 
                                            key={asset.id} 
                                            asset={asset} 
                                            isOwner={user?.id === universe.gm_id}
                                            onDelete={handleAssetDelete}
                                            onUpdate={handleAssetUpdate}
                                        />
                                    ))}
                                    {assets.filter(a => a.type === type).length === 0 && (
                                        <div className="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                                            <ImageIcon size={32} className="mb-2 opacity-50" />
                                            <p className="text-sm">No {type.toLowerCase()}s uploaded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ADVANCED TAB */}
                {activeTab === 'advanced' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Advanced Settings</h3>
                            <p className="text-gray-500 mb-6">Danger zone and advanced configurations.</p>
                        </div>

                        <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                            <h4 className="text-lg font-bold text-red-700 mb-2">Danger Zone</h4>
                            <p className="text-red-600 mb-4 text-sm">
                                Deleting this universe will permanently remove it and all associated data (assets, campaigns, etc.).
                                This action cannot be undone.
                            </p>
                            
                            <button 
                                onClick={handleDeleteUniverse}
                                className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition-colors shadow-sm"
                            >
                                Delete Universe
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
