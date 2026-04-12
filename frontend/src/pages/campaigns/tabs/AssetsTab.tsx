import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { Upload, Star, Check, Plus, Loader2, Image as ImageIcon, Globe, Tag, X, Edit2, Trash2 } from 'lucide-react';

interface CampaignAsset {
    id: number;
    campaign_id: number;
    name: string;
    file_url: string;
    is_preselected: boolean;
    tags: string[];
}

interface UniverseAsset {
    id: number;
    universe_id: number;
    name: string;
    image_url: string;
    type: string;
    tags: string[];
}

interface AssetsTabProps {
    campaignId: number;
    is_gm: boolean;
}

export function AssetsTab({ campaignId, is_gm }: AssetsTabProps) {
    const { getToken } = useAuth();
    const [campaignAssets, setCampaignAssets] = useState<CampaignAsset[]>([]);
    const [universeAssets, setUniverseAssets] = useState<UniverseAsset[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Upload State
    const [uploading, setUploading] = useState(false);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadName, setUploadName] = useState('');
    const [uploadTags, setUploadTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState('');

    // Editing State
    const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editTagInput, setEditTagInput] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    const [copyingId, setCopyingId] = useState<number | null>(null);

    useEffect(() => {
        if (!is_gm) return;
        fetchAssets();
    }, [campaignId, is_gm]);

    const fetchAssets = async () => {
        try {
            const token = await getToken();
            const res = await axios.get(`http://localhost:8000/campaigns/${campaignId}/assets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaignAssets(res.data.campaign_assets);
            setUniverseAssets(res.data.universe_assets);
        } catch (error) {
            console.error("Failed to fetch assets", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Upload Handlers ---

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten archivos de imagen.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('El archivo es demasiado grande (Máx 5MB).');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        setUploadFile(file);
        setUploadName(file.name.split('.')[0]);
        setUploadTags([]);
    };

    const addUploadTag = () => {
        const tag = newTagInput.trim();
        if (!tag) return;
        if (uploadTags.includes(tag)) return;
        if (uploadTags.length >= 10) {
            alert("Máximo 10 etiquetas permitidas.");
            return;
        }
        setUploadTags([...uploadTags, tag]);
        setNewTagInput('');
    };

    const removeUploadTag = (tagToRemove: string) => {
        setUploadTags(uploadTags.filter(t => t !== tagToRemove));
    };

    const cancelUpload = () => {
        setUploadFile(null);
        setUploadPreview(null);
        setUploadName('');
        setUploadTags([]);
        setNewTagInput('');
    };

    const confirmUpload = async () => {
        if (!uploadFile) return;
        if (!uploadName.trim()) {
            alert("El nombre es obligatorio.");
            return;
        }

        setUploading(true);
        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append('file', uploadFile);
            formData.append('name', uploadName);
            formData.append('tags', JSON.stringify(uploadTags));

            const res = await axios.post(`http://localhost:8000/campaigns/${campaignId}/assets`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setCampaignAssets([...campaignAssets, res.data]);
            cancelUpload();
        } catch (error: any) {
            console.error("Upload failed", error);
            alert(error.response?.data?.detail || "Error al subir el archivo.");
        } finally {
            setUploading(false);
        }
    };

    // --- Edit Handlers ---

    const startEditing = (asset: CampaignAsset) => {
        setEditingAssetId(asset.id);
        setEditName(asset.name);
        setEditTags(asset.tags || []);
        setEditTagInput('');
    };

    const cancelEditing = () => {
        setEditingAssetId(null);
        setEditName('');
        setEditTags([]);
        setEditTagInput('');
    };

    const addEditTag = () => {
        const tag = editTagInput.trim();
        if (!tag) return;
        if (editTags.includes(tag)) return;
        if (editTags.length >= 10) {
            alert("Máximo 10 etiquetas permitidas.");
            return;
        }
        setEditTags([...editTags, tag]);
        setEditTagInput('');
    };

    const removeEditTag = (tagToRemove: string) => {
        setEditTags(editTags.filter(t => t !== tagToRemove));
    };

    const saveEdit = async () => {
        if (!editingAssetId) return;
        setSavingEdit(true);
        try {
            const token = await getToken();
            const res = await axios.patch(`http://localhost:8000/campaigns/${campaignId}/assets/${editingAssetId}`, {
                name: editName,
                tags: editTags
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setCampaignAssets(campaignAssets.map(a => a.id === editingAssetId ? res.data : a));
            cancelEditing();
        } catch (error: any) {
            console.error("Update failed", error);
            alert(error.response?.data?.detail || "Error al actualizar.");
        } finally {
            setSavingEdit(false);
        }
    };

    const deleteAsset = async (assetId: number) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este recurso? Esta acción no se puede deshacer.")) return;
        
        try {
            const token = await getToken();
            await axios.delete(`http://localhost:8000/campaigns/${campaignId}/assets/${assetId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaignAssets(campaignAssets.filter(a => a.id !== assetId));
        } catch (error) {
            console.error("Delete failed", error);
            alert("Error al eliminar.");
        }
    };

    // --- Other Actions ---

    const togglePreselect = async (asset: CampaignAsset) => {
        const updatedAssets = campaignAssets.map(a => 
            a.id === asset.id ? { ...a, is_preselected: !a.is_preselected } : a
        );
        setCampaignAssets(updatedAssets);

        try {
            const token = await getToken();
            await axios.patch(`http://localhost:8000/campaigns/${campaignId}/assets/${asset.id}/preselect`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Toggle failed", error);
            setCampaignAssets(campaignAssets);
            alert("Error al actualizar estado.");
        }
    };

    const copyFromUniverse = async (uAsset: UniverseAsset) => {
        setCopyingId(uAsset.id);
        try {
            const token = await getToken();
            const res = await axios.post(`http://localhost:8000/campaigns/${campaignId}/assets/copy-from-universe`, {
                universe_asset_url: uAsset.image_url,
                name: uAsset.name
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCampaignAssets([...campaignAssets, res.data]);
            // alert(`"${uAsset.name}" añadido a la campaña.`);
        } catch (error) {
            console.error("Copy failed", error);
            alert("Error al copiar el recurso.");
        } finally {
            setCopyingId(null);
        }
    };

    if (!is_gm) {
        return <div className="text-center text-red-500 py-10">Acceso Denegado: Solo el Game Master puede gestionar recursos.</div>;
    }

    if (loading) {
        return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
    }

    const preselectedAssets = campaignAssets.filter(a => a.is_preselected);

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-20">
            {/* --- UPLOAD MODAL / AREA --- */}
            {uploadFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-2xl w-full flex flex-col md:flex-row overflow-hidden">
                        <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-4">
                            {uploadPreview && <img src={uploadPreview} alt="Preview" className="max-h-64 md:max-h-80 object-contain" />}
                        </div>
                        <div className="w-full md:w-1/2 p-6 flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-4">Nuevo Recurso</h3>
                            
                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
                                    <input 
                                        type="text" 
                                        value={uploadName} 
                                        onChange={(e) => setUploadName(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                        <Tag size={12} /> Etiquetas
                                    </label>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {uploadTags.map(tag => (
                                            <span key={tag} className="text-xs bg-indigo-900 text-indigo-200 px-2 py-1 rounded flex items-center gap-1">
                                                {tag}
                                                <button onClick={() => removeUploadTag(tag)} className="hover:text-white"><X size={12}/></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newTagInput}
                                            onChange={(e) => setNewTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addUploadTag()}
                                            placeholder="Añadir etiqueta..."
                                            className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button onClick={addUploadTag} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{uploadTags.length}/10 etiquetas</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                                <button onClick={cancelUpload} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
                                <button 
                                    onClick={confirmUpload} 
                                    disabled={uploading}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-bold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {uploading && <Loader2 size={16} className="animate-spin" />}
                                    {uploading ? 'Subiendo...' : 'Confirmar Carga'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 1: PRESELECTED (Session Tray) */}
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                    <Star size={20} className="fill-indigo-400 text-indigo-400" /> Bandeja de la Sesión
                </h3>
                {preselectedAssets.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No hay recursos seleccionados para la próxima sesión.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {preselectedAssets.map(asset => (
                            <div key={asset.id} className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden border border-indigo-500/50 shadow-lg shadow-indigo-500/10">
                                <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => togglePreselect(asset)}
                                        className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full"
                                        title="Quitar de la sesión"
                                    >
                                        <Star size={16} className="fill-white" />
                                    </button>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-xs text-center truncate text-white">
                                    {asset.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 2: CAMPAIGN ASSETS */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                        <ImageIcon size={20} /> Recursos de la Campaña
                    </h3>
                    <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                        <Upload size={18} />
                        <span>Subir Archivo</span>
                        <input type="file" className="hidden" onChange={onFileSelect} accept="image/*" />
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {campaignAssets.map(asset => {
                        const isEditing = editingAssetId === asset.id;
                        
                        if (isEditing) {
                            return (
                                <div key={asset.id} className="bg-gray-800 rounded-lg border border-indigo-500 p-3 shadow-lg relative">
                                    <div className="aspect-video bg-black rounded mb-2 overflow-hidden">
                                        <img src={asset.file_url} alt={asset.name} className="w-full h-full object-contain opacity-50" />
                                    </div>
                                    <div className="space-y-2">
                                        <input 
                                            type="text" 
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-indigo-500"
                                        />
                                        <div className="flex flex-wrap gap-1">
                                            {editTags.map(tag => (
                                                <span key={tag} className="text-[10px] bg-indigo-900 text-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    {tag}
                                                    <button onClick={() => removeEditTag(tag)}><X size={10}/></button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-1">
                                            <input 
                                                type="text" 
                                                value={editTagInput}
                                                onChange={(e) => setEditTagInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addEditTag()}
                                                placeholder="Tag..."
                                                className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                                            />
                                            <button onClick={addEditTag} className="bg-gray-700 hover:bg-gray-600 p-1 rounded text-white"><Plus size={12}/></button>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                                            <button onClick={cancelEditing} className="p-1 text-gray-400 hover:bg-gray-700 rounded"><X size={16}/></button>
                                            <button onClick={saveEdit} disabled={savingEdit} className="p-1 text-green-500 hover:bg-gray-700 rounded">
                                                {savingEdit ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={asset.id} className={`group relative bg-gray-800 rounded-lg overflow-hidden border transition-all hover:shadow-lg ${asset.is_preselected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-700'}`}>
                                <div className="relative aspect-video bg-black/20 overflow-hidden">
                                    <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    
                                    {/* Action Buttons Overlay */}
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => startEditing(asset)}
                                            className="p-1.5 bg-gray-900/80 text-white rounded-full hover:bg-indigo-600 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => deleteAsset(asset.id)}
                                            className="p-1.5 bg-gray-900/80 text-white rounded-full hover:bg-red-600 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Preselect Toggle */}
                                    <div className="absolute top-2 left-2">
                                        <button 
                                            onClick={() => togglePreselect(asset)}
                                            className={`p-1.5 rounded-full shadow-lg transition-colors ${asset.is_preselected ? 'bg-indigo-600 text-white' : 'bg-gray-900/80 text-gray-400 hover:text-white'}`}
                                        >
                                            <Star size={14} className={asset.is_preselected ? 'fill-white' : ''} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-3">
                                    <h4 className="font-bold text-gray-200 text-sm truncate mb-1" title={asset.name}>{asset.name}</h4>
                                    <div className="flex flex-wrap gap-1 h-5 overflow-hidden">
                                        {asset.tags && asset.tags.length > 0 ? (
                                            asset.tags.map(tag => (
                                                <span key={tag} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded border border-gray-600">
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-gray-500 italic">Sin etiquetas</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SECTION 3: UNIVERSE ASSETS */}
            {universeAssets.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2 border-t border-gray-700 pt-8">
                        <Globe size={20} /> Recursos del Universo Base
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {universeAssets.map(asset => (
                            <div key={asset.id} className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 opacity-80 hover:opacity-100 transition-opacity hover:border-gray-500">
                                <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => copyFromUniverse(asset)}
                                        disabled={copyingId === asset.id}
                                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
                                    >
                                        {copyingId === asset.id ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                        Añadir a Campaña
                                    </button>
                                </div>
                                <div className="absolute bottom-0 inset-x-0 bg-black/70 p-2">
                                    <div className="text-xs text-center truncate text-gray-300 font-bold">{asset.name}</div>
                                    <div className="flex justify-center gap-1 mt-1 flex-wrap h-4 overflow-hidden">
                                        {asset.tags?.map(t => <span key={t} className="text-[9px] text-gray-400 bg-gray-900 px-1 rounded">{t}</span>)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
