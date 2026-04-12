import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { Asset } from '../../types';
import { Trash2, Edit2, Check, X, Tag, Image as ImageIcon } from 'lucide-react';

interface AssetCardProps {
    asset: Asset;
    onDelete: (id: number) => void;
    onUpdate: (updatedAsset: Asset) => void;
    isOwner: boolean;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onDelete, onUpdate, isOwner }) => {
    const { getToken } = useAuth();
    
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(asset.name);
    const [newTags, setNewTags] = useState<string[]>(asset.tags || []);
    const [tagInput, setTagInput] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // Helpers to handle image URLs (local vs remote)
    const getImageUrl = (url: string) => {
        if (!url) return 'https://via.placeholder.com/300x200?text=No+Image';
        if (url.startsWith('http')) return url;
        return `http://localhost:8000${url}`;
    };

    const handleSave = async () => {
        if (!newName.trim()) return alert("Name cannot be empty");
        
        setLoading(true);
        try {
            const token = await getToken();
            const res = await axios.patch(`http://localhost:8000/assets/${asset.id}`, {
                name: newName,
                tags: newTags
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            onUpdate(res.data);
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to update asset", err);
            alert("Failed to update asset");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            await axios.delete(`http://localhost:8000/assets/${asset.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onDelete(asset.id);
        } catch (err) {
            console.error("Failed to delete asset", err);
            alert("Failed to delete asset");
            setLoading(false);
            setDeleteConfirm(false);
        }
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!newTags.includes(tagInput.trim())) {
                setNewTags([...newTags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setNewTags(newTags.filter(t => t !== tag));
    };

    return (
        <div className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow">
            {/* Image Area */}
            <div className="relative aspect-video bg-gray-100 overflow-hidden">
                <img 
                    src={getImageUrl(asset.image_url)} 
                    alt={asset.name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Error+Loading+Image';
                    }}
                />
                
                {/* Actions Overlay */}
                {isOwner && !isEditing && !deleteConfirm && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 bg-white text-gray-700 rounded-full shadow hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit details"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button 
                            onClick={() => setDeleteConfirm(true)}
                            className="p-1.5 bg-white text-red-600 rounded-full shadow hover:bg-red-50 hover:text-red-700"
                            title="Delete asset"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-3">
                {isEditing ? (
                    <div className="space-y-3">
                        {/* Edit Mode */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                            <input 
                                type="text" 
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full text-sm border rounded px-2 py-1 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                <Tag size={10} /> Tags
                            </label>
                            <div className="flex flex-wrap gap-1 my-1">
                                {newTags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-indigo-100">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-indigo-900">&times;</button>
                                    </span>
                                ))}
                            </div>
                            <input 
                                type="text"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={addTag}
                                placeholder="Add tag..."
                                className="w-full text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-1 border-t mt-1">
                            <button 
                                onClick={() => {
                                    setIsEditing(false);
                                    setNewName(asset.name);
                                    setNewTags(asset.tags || []);
                                }}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                disabled={loading}
                            >
                                <X size={16} />
                            </button>
                            <button 
                                onClick={handleSave}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                disabled={loading}
                            >
                                {loading ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                            </button>
                        </div>
                    </div>
                ) : deleteConfirm ? (
                    <div className="text-center py-2 animate-in fade-in zoom-in duration-200">
                        <p className="text-xs text-red-600 font-bold mb-2">Delete this asset?</p>
                        <div className="flex justify-center gap-2">
                            <button 
                                onClick={() => setDeleteConfirm(false)}
                                className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                                disabled={loading}
                            >
                                {loading ? "..." : "Delete"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Display Mode */}
                        <h4 className="font-bold text-gray-800 text-sm truncate mb-1" title={asset.name}>
                            {asset.name}
                        </h4>
                        
                        <div className="flex flex-wrap gap-1 h-5 overflow-hidden">
                            {asset.tags && asset.tags.length > 0 ? (
                                asset.tags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                        {tag}
                                    </span>
                                ))
                            ) : (
                                <span className="text-[10px] text-gray-400 italic">No tags</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
