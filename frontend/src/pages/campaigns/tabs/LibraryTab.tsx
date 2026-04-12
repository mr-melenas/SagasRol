import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Handout } from '../../../types';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { Plus, Eye, EyeOff, FileText, X, Save, BookOpen } from 'lucide-react';

interface LibraryTabProps {
    handouts: Handout[];
    campaignId: number;
    is_gm: boolean;
    onUpdate: () => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ handouts, campaignId, is_gm, onUpdate }) => {
    const { getToken } = useAuth();
    
    const [selectedHandout, setSelectedHandout] = useState<Handout | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // For editing existing
    
    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    // Handlers
    const handleView = (handout: Handout) => {
        setSelectedHandout(handout);
        setIsEditing(false);
    };

    const handleCreateStart = () => {
        setTitle('');
        setContent('');
        setIsVisible(false);
        setIsCreating(true);
    };

    const handleEditStart = (handout: Handout) => {
        setTitle(handout.name);
        setContent(handout.content);
        setIsVisible(handout.is_visible);
        setSelectedHandout(handout);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) return;
        setSaving(true);
        try {
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            if (isCreating) {
                // Since our backend expects multipart/form-data for 'file' if using the file upload endpoint,
                // but the prompt says "GM envía el título, el contenido (texto enriquecido)".
                // My backend implementation `create_handout` uses `UploadFile`. 
                // Wait, the prompt requirements changed or I missed it?
                // "Endpoints CRUD completos. El GM envía el título, el contenido (texto enriquecido) y el booleano is_visible."
                // My current backend `create_handout` expects a FILE upload. 
                // I need to adjust the backend to accept text content for rich text handouts, OR handle file uploads differently.
                // The prompt explicitly says "Texto enriquecido". So storing it as a text string in DB is better than a file URL.
                // Let's check `models.py`. `Handout` has `content = Column(Text)`.
                // My `backend/routers/campaigns.py` implementation of `create_handout` uploads a file and saves URL.
                // I SHOULD FIX THE BACKEND implementation of `create_handout` to accept JSON body for rich text instead of File.
                // Or support both?
                // Given the prompt "editor de texto enriquecido", I should change the backend endpoint to accept `HandoutCreate` schema (JSON) instead of File.
                
                // I will pause here and fix the Backend endpoint for `create_handout` first.
                // But let's finish the frontend code assuming I'll fix the backend to accept JSON.
                
                await axios.post(`http://localhost:8000/campaigns/${campaignId}/handouts/text`, {
                    name: title,
                    content: content,
                    is_visible: isVisible
                }, { headers });
            } else if (selectedHandout) {
                await axios.patch(`http://localhost:8000/campaigns/${campaignId}/handouts/${selectedHandout.id}`, {
                    name: title,
                    content: content,
                    is_visible: isVisible
                }, { headers });
            }

            setIsCreating(false);
            setIsEditing(false);
            setSelectedHandout(null);
            onUpdate();
        } catch (err) {
            console.error("Failed to save handout", err);
            alert("Failed to save handout");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleVisibility = async (e: React.MouseEvent, handout: Handout) => {
        e.stopPropagation();
        try {
            const token = await getToken();
            await axios.patch(`http://localhost:8000/campaigns/${campaignId}/handouts/${handout.id}/visibility`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onUpdate();
        } catch (err) {
            console.error("Failed to toggle visibility", err);
        }
    };

    const handleDelete = async () => {
        if (!selectedHandout || !confirm("Delete this handout?")) return;
        try {
            const token = await getToken();
            await axios.delete(`http://localhost:8000/campaigns/${campaignId}/handouts/${selectedHandout.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedHandout(null);
            setIsEditing(false);
            onUpdate();
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    return (
        <div className="h-full">
            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {is_gm && (
                    <button 
                        onClick={handleCreateStart}
                        className="aspect-[3/4] rounded-xl border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-gray-800/50 transition-all flex flex-col items-center justify-center text-gray-500 hover:text-indigo-400 group"
                    >
                        <Plus size={48} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="font-bold">Crear Documento</span>
                    </button>
                )}

                {handouts.map(handout => (
                    <div 
                        key={handout.id}
                        onClick={() => handleView(handout)}
                        className={`aspect-[3/4] bg-gray-800 rounded-xl border relative cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                            !handout.is_visible && is_gm ? 'border-red-900/50 opacity-75' : 'border-gray-700 hover:border-indigo-500'
                        }`}
                    >
                        {/* Cover / Preview */}
                        <div className="absolute inset-0 p-6 flex flex-col">
                            <h4 className="font-bold text-lg text-gray-200 line-clamp-2 text-center mb-4">{handout.name}</h4>
                            <div className="flex-1 overflow-hidden text-[10px] text-gray-500 opacity-50 select-none">
                                <div dangerouslySetInnerHTML={{ __html: handout.content }} />
                            </div>
                        </div>
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                        {/* GM Controls */}
                        {is_gm && (
                            <div className="absolute top-2 right-2 flex gap-1">
                                <button 
                                    onClick={(e) => handleToggleVisibility(e, handout)}
                                    className="p-1.5 bg-black/50 hover:bg-black/80 rounded text-white backdrop-blur-sm"
                                    title={handout.is_visible ? "Visible para jugadores" : "Oculto"}
                                >
                                    {handout.is_visible ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                                </button>
                            </div>
                        )}
                        
                        {/* Type Icon */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-600">
                            <BookOpen size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal (View / Create / Edit) */}
            {(selectedHandout || isCreating) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white text-gray-900 w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            {isCreating || isEditing ? (
                                <input 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Título del Documento"
                                    className="text-xl font-bold bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none w-full mr-4"
                                />
                            ) : (
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <BookOpen size={24} className="text-indigo-600" />
                                    {selectedHandout?.name}
                                </h2>
                            )}
                            
                            <div className="flex items-center gap-2">
                                {(isCreating || isEditing) && (
                                    <label className="flex items-center gap-2 text-sm text-gray-600 mr-4 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={isVisible} 
                                            onChange={(e) => setIsVisible(e.target.checked)}
                                            className="rounded text-indigo-600"
                                        />
                                        Visible para todos
                                    </label>
                                )}

                                {is_gm && !isCreating && !isEditing && (
                                    <button 
                                        onClick={() => selectedHandout && handleEditStart(selectedHandout)}
                                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold hover:bg-indigo-200"
                                    >
                                        Editar
                                    </button>
                                )}

                                {(isCreating || isEditing) && (
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <Save size={18} /> Guardar
                                    </button>
                                )}

                                <button 
                                    onClick={() => {
                                        setSelectedHandout(null);
                                        setIsCreating(false);
                                        setIsEditing(false);
                                    }}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-white p-8">
                            {isCreating || isEditing ? (
                                <ReactQuill 
                                    theme="snow" 
                                    value={content} 
                                    onChange={setContent}
                                    className="h-full"
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{'list': 'ordered'}, {'list': 'bullet'}],
                                            ['link', 'image'],
                                            ['clean']
                                        ],
                                    }}
                                />
                            ) : (
                                <div className="prose prose-lg max-w-none mx-auto" dangerouslySetInnerHTML={{ __html: selectedHandout?.content || '' }} />
                            )}
                        </div>
                        
                        {/* Footer if Viewing */}
                        {!isCreating && !isEditing && is_gm && (
                            <div className="p-4 border-t bg-gray-50 flex justify-between">
                                <button 
                                    onClick={handleDelete}
                                    className="text-red-600 hover:text-red-800 text-sm font-bold"
                                >
                                    Eliminar Documento
                                </button>
                                <span className="text-xs text-gray-500">
                                    Creado el {new Date(selectedHandout?.created_at || '').toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
