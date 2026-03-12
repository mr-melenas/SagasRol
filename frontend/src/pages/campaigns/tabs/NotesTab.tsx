import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { CampaignNote } from '../../../types';
import { useAuth, useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { Plus, Trash2, Save, FileText, Lock, Globe } from 'lucide-react';

interface NotesTabProps {
    notes: CampaignNote[];
    campaignId: number;
    is_gm: boolean;
    hasCharacter: boolean;
    onUpdate: () => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({ notes, campaignId, is_gm, hasCharacter, onUpdate }) => {
    const { getToken } = useAuth();
    const { user } = useUser();
    
    // Sort notes by date descending
    const sortedNotes = [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Ref to track previous note ID to detect switches
    const prevNoteIdRef = React.useRef<number | null>(null);

    // Effect to load selected note into editor
    useEffect(() => {
        if (selectedNoteId) {
            const note = notes.find(n => n.id === selectedNoteId);
            
            // Detect if we just switched notes
            const isSwitching = prevNoteIdRef.current !== selectedNoteId;
            
            if (note) {
                // If switching, ALWAYS load content and reset edit mode
                if (isSwitching) {
                    setEditorContent(note.content);
                    setIsPrivate(note.is_private);
                    setIsEditing(false); 
                    setIsCreating(false);
                } 
                // If NOT switching (e.g. background update), ONLY update if NOT editing
                else if (!isEditing) {
                    setEditorContent(note.content);
                    setIsPrivate(note.is_private);
                }
            }
            prevNoteIdRef.current = selectedNoteId;
        } else {
            // Only reset if we are NOT creating a new note
            if (!isCreating) {
                setEditorContent('');
                setIsEditing(false);
                prevNoteIdRef.current = null;
            }
        }
    }, [selectedNoteId, notes, isEditing, isCreating]);

    // Auto-save Effect
    useEffect(() => {
        const interval = setInterval(() => {
            if (isEditing && (selectedNoteId || isCreating)) {
                // Only save if content is not empty
                if (editorContent.trim()) {
                    handleSave(true); // silent = true
                }
            }
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [isEditing, selectedNoteId, isCreating, editorContent, isPrivate]); // Dependencies for auto-save

    const handleCreateNew = () => {
        setSelectedNoteId(null);
        setEditorContent('');
        setIsPrivate(true);
        setIsCreating(true);
        setIsEditing(true);
    };

    const handleSave = async (silent = false) => {
        // Prevent saving empty content
        if (!editorContent || !editorContent.trim() || editorContent === '<p><br></p>') return;
        
        if (!silent) setSaving(true);
        
        try {
            console.log(`[NotesTab] Saving note... (Silent: ${silent}, Creating: ${isCreating})`);
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            if (isCreating) {
                const res = await axios.post(`http://localhost:8000/campaigns/${campaignId}/notes`, {
                    content: editorContent,
                    is_private: true // Force private
                }, { headers });
                
                console.log("[NotesTab] Note created:", res.data.id);

                // If creating, we need to switch to "edit existing" mode with the new ID
                if (!silent) {
                    setSelectedNoteId(res.data.id);
                    setIsCreating(false);
                } else {
                    // For silent auto-save during creation, we must handle the state transition carefully
                    // to avoid creating duplicates. 
                    // Best strategy: Switch to "Update" mode immediately after first auto-save.
                    setSelectedNoteId(res.data.id);
                    setIsCreating(false);
                    // Note: This might trigger the useEffect above, but since isEditing is true, 
                    // and selectedNoteId changes, it might be tricky.
                    // Actually, if selectedNoteId changes, 'isSwitching' becomes true in useEffect,
                    // which resets isEditing to false. This is BAD for auto-save.
                    // FIX: We need to update prevNoteIdRef manually here to avoid "switch" detection?
                    prevNoteIdRef.current = res.data.id; 
                }
            } else if (selectedNoteId) {
                console.log("[NotesTab] Updating note:", selectedNoteId);
                // Ensure we are in editing mode for existing notes before saving
                await axios.patch(`http://localhost:8000/campaigns/${campaignId}/notes/${selectedNoteId}`, {
                    content: editorContent,
                    is_private: true // Force private
                }, { headers });
            }
            
            if (!silent) {
                setIsEditing(false);
                onUpdate();
            } else {
                // Show a small toast or indicator?
                // For now, maybe just log or rely on UI not breaking
                console.log("Auto-saved");
            }
        } catch (err) {
            console.error("Failed to save note", err);
            if (!silent) alert("Error al guardar la nota. Inténtalo de nuevo.");
        } finally {
            if (!silent) setSaving(false);
        }
    };

    const handleDelete = async (noteId: number) => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        try {
            const token = await getToken();
            await axios.delete(`http://localhost:8000/campaigns/${campaignId}/notes/${noteId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (selectedNoteId === noteId) {
                setSelectedNoteId(null);
            }
            onUpdate();
        } catch (err) {
            console.error("Failed to delete note", err);
        }
    };

    // Access Control Check
    if (!is_gm && !hasCharacter) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-800/50 rounded-xl border border-gray-700">
                <FileText size={48} className="mb-4 opacity-50" />
                <h3 className="text-lg font-semibold">{is_gm ? 'Cuaderno del Director' : 'Diario de Personaje'}</h3>
                <p className="text-sm mt-2">Necesitas crear un personaje para escribir en su diario.</p>
            </div>
        );
    }

    const selectedNote = notes.find(n => n.id === selectedNoteId);
    const canEdit = isCreating || (selectedNote && selectedNote.author_id === user?.id);

    return (
        <div className="flex h-[600px] gap-4">
            {/* Sidebar List */}
            <div className="w-1/3 bg-gray-800 rounded-lg border border-gray-700 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <h3 className="font-bold text-gray-300">{is_gm ? 'Notas de Master' : 'Entradas'}</h3>
                    <button 
                        onClick={handleCreateNew}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                        title="Nueva Entrada"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {sortedNotes.length === 0 && !isCreating && (
                        <p className="text-center text-gray-500 text-sm mt-10">No hay notas aún.</p>
                    )}
                    
                    {isCreating && (
                        <div className="p-3 rounded-lg bg-indigo-900/30 border border-indigo-500/50 mb-2">
                            <span className="text-indigo-300 text-sm font-bold italic">Nueva Entrada...</span>
                        </div>
                    )}

                    {sortedNotes.map(note => (
                        <div 
                            key={note.id}
                            onClick={() => setSelectedNoteId(note.id)}
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                selectedNoteId === note.id 
                                    ? 'bg-gray-700 border-indigo-500' 
                                    : 'bg-gray-800/50 border-transparent hover:bg-gray-700 hover:border-gray-600'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs text-gray-500">
                                    {new Date(note.created_at).toLocaleDateString()}
                                </span>
                                {note.is_private ? <Lock size={12} className="text-gray-600" /> : <Globe size={12} className="text-green-600" />}
                            </div>
                            <div className="text-sm text-gray-300 line-clamp-2 h-10 overflow-hidden" 
                                 dangerouslySetInnerHTML={{ __html: note.content.replace(/<[^>]+>/g, ' ').substring(0, 100) }} 
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 flex flex-col overflow-hidden relative">
                {/* Auto-save Indicator */}
                {isEditing && (
                    <div className="absolute top-2 right-1/2 translate-x-1/2 bg-black/50 text-xs text-gray-300 px-2 py-1 rounded-full pointer-events-none z-10 transition-opacity">
                         {saving ? 'Guardando...' : 'Auto-guardado activo'}
                    </div>
                )}
                {(selectedNoteId || isCreating) ? (
                    <>
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-400 text-sm">
                                    {isCreating ? 'Creando nueva entrada' : `Editando entrada del ${new Date(selectedNote?.created_at || '').toLocaleDateString()}`}
                                </span>
                                <div className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-600 text-gray-400">
                                    <Lock size={12} /> Privado
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {canEdit && !isEditing && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium px-3"
                                    >
                                        Editar
                                    </button>
                                )}
                                {isEditing && (
                                    <button 
                                        onClick={() => handleSave(false)}
                                        disabled={saving}
                                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} /> Guardar
                                            </>
                                        )}
                                    </button>
                                )}
                                {!isCreating && canEdit && (
                                    <button 
                                        onClick={() => selectedNoteId && handleDelete(selectedNoteId)}
                                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 bg-white text-black overflow-y-auto">
                            {isEditing ? (
                                <ReactQuill 
                                    theme="snow" 
                                    value={editorContent} 
                                    onChange={setEditorContent}
                                    className="h-full"
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{'list': 'ordered'}, {'list': 'bullet'}],
                                            ['link', 'image'],
                                            ['clean']
                                        ],
                                    }}
                                />
                            ) : (
                                <div className="prose max-w-none p-8 ql-editor" dangerouslySetInnerHTML={{ __html: editorContent }} />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FileText size={64} className="mb-4 opacity-20" />
                        <p>Selecciona una nota para leer o crea una nueva.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
