import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { SheetBuilder } from '../components/builder/SheetBuilder';
import { CharacterSheetTemplate } from '../types';
import { Plus, Edit, FileText, Eye } from 'lucide-react';
import { useSheetStore } from '../stores/useSheetStore';
import { CharacterSheetView } from '../components/player/CharacterSheetView';

interface SheetManagerProps {
    mode?: 'list' | 'create' | 'edit';
}

export const SheetManager: React.FC<SheetManagerProps> = ({ mode = 'list' }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { getToken } = useAuth();
    const { setBlocks, blocks, tabs } = useSheetStore();
    
    const [templates, setTemplates] = useState<CharacterSheetTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [sheetName, setSheetName] = useState('New Character Sheet');
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        if (mode === 'list') {
            loadTemplates();
        } else if (mode === 'edit' && id) {
            loadTemplate(id);
        } else if (mode === 'create') {
            setBlocks([]); // Reset store
            setSheetName('New Character Sheet');
        }
    }, [mode, id]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await axios.get('http://localhost:8000/sheets/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(res.data);
        } catch (err) {
            console.error("Error loading templates", err);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplate = async (templateId: string) => {
        setLoading(true);
        try {
            const token = await getToken();
            const res = await axios.get(`http://localhost:8000/sheets/${templateId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSheetName(res.data.name);

            // Handle new structure (with tabs) vs old structure (array of blocks)
            const structure = res.data.structure;
            if (Array.isArray(structure)) {
                // Legacy format
                setBlocks(structure);
            } else if (structure && structure.blocks && structure.tabs) {
                // New format
                setBlocks(structure.blocks);
                useSheetStore.getState().setTabs(structure.tabs);
                
                // Set active tab to first one
                if (structure.tabs.length > 0) {
                    useSheetStore.getState().setActiveTab(structure.tabs[0].id);
                }
            }
        } catch (err) {
            console.error("Error loading template", err);
            alert("Failed to load template");
            navigate('/sheets');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!sheetName.trim()) {
            alert("Please enter a name for the sheet.");
            return;
        }

        setLoading(true);
        try {
            const token = await getToken();
            const payload = {
                name: sheetName,
                structure: {
                    tabs: tabs,
                    blocks: blocks
                }
            };

            if (mode === 'create') {
                await axios.post('http://localhost:8000/sheets/', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else if (mode === 'edit' && id) {
                await axios.put(`http://localhost:8000/sheets/${id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            alert("Template saved successfully!");
            navigate('/sheets');
        } catch (err) {
            console.error("Error saving template", err);
            alert("Failed to save template");
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'list') {
        return (
            <div className="max-w-5xl mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Character Sheet Templates</h1>
                        <p className="text-gray-500">Manage your custom character sheet designs.</p>
                    </div>
                    <button 
                        onClick={() => navigate('/sheets/new')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-md"
                    >
                        <Plus size={20} />
                        Create New Template
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.length === 0 ? (
                            <div className="col-span-full text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-600">No templates found</h3>
                                <p className="text-gray-400 mb-6">Create your first character sheet template to get started.</p>
                                <button 
                                    onClick={() => navigate('/sheets/new')}
                                    className="text-blue-600 font-medium hover:underline"
                                >
                                    Create Template
                                </button>
                            </div>
                        ) : (
                            templates.map(template => (
                                <div key={template.id} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <FileText size={24} className="text-blue-500" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">{template.name}</h3>
                                    <p className="text-sm text-gray-500 mb-6">
                                        {template.structure.length} blocks configured
                                    </p>
                                    <div className="mt-auto">
                                        <button 
                                            onClick={() => navigate(`/sheets/${template.id}/edit`)}
                                            className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium"
                                        >
                                            <Edit size={16} />
                                            Edit Template
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/sheets')} 
                        className="text-gray-500 hover:text-gray-800 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                        &larr; Back to List
                    </button>
                    <div className="h-6 w-px bg-gray-300"></div>
                    <input 
                        type="text" 
                        value={sheetName}
                        onChange={(e) => setSheetName(e.target.value)}
                        placeholder="Template Name"
                        className="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setPreviewMode(!previewMode)}
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors border ${
                            previewMode 
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Eye size={18} />
                        {previewMode ? 'Exit Preview' : 'Player Preview'}
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {loading ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </header>

            {/* Builder Area */}
            <div className={`flex-1 overflow-hidden ${previewMode ? 'overflow-y-auto bg-gray-100' : 'p-6'}`}>
                {previewMode ? (
                    <div className="max-w-4xl mx-auto py-8">
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                             <div className="bg-gray-50 border-b px-6 py-2 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Player View Preview</span>
                                <span className="text-xs text-gray-400 italic">This is how players will see the sheet</span>
                            </div>
                            <CharacterSheetView templateData={{ tabs, blocks }} />
                        </div>
                    </div>
                ) : (
                    <SheetBuilder />
                )}
            </div>
        </div>
    );
};
