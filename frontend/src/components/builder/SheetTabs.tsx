import React, { useState } from 'react';
import { useSheetStore } from '../../stores/useSheetStore';
import { Plus, X } from 'lucide-react';

export const SheetTabs: React.FC = () => {
    const { tabs, activeTabId, setActiveTab, addTab, updateTabName, deleteTab } = useSheetStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleAddTab = () => {
        addTab('New Tab');
    };

    const handleStartEdit = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const handleFinishEdit = () => {
        if (editingId && editName.trim()) {
            updateTabName(editingId, editName);
        }
        setEditingId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleFinishEdit();
        if (e.key === 'Escape') setEditingId(null);
    };

    return (
        <div className="flex items-center gap-1 border-b border-gray-200 px-4 bg-gray-50 overflow-x-auto">
            {tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                const isEditing = tab.id === editingId;

                return (
                    <div 
                        key={tab.id}
                        className={`
                            group relative flex items-center min-w-[120px] max-w-[200px] h-10 px-4 rounded-t-lg border-t border-l border-r cursor-pointer select-none transition-all
                            ${isActive ? 'bg-white border-gray-200 border-b-white translate-y-[1px] z-10' : 'bg-gray-100 border-transparent hover:bg-gray-200 text-gray-500'}
                        `}
                        onClick={() => !isEditing && setActiveTab(tab.id)}
                        onDoubleClick={() => handleStartEdit(tab.id, tab.name)}
                    >
                        {isEditing ? (
                            <input 
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onBlur={handleFinishEdit}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="w-full bg-transparent border-none focus:outline-none text-sm font-bold p-0"
                            />
                        ) : (
                            <span className={`text-sm font-bold truncate pr-4 ${isActive ? 'text-gray-800' : ''}`}>
                                {tab.name}
                            </span>
                        )}

                        {/* Delete Button (Show on hover, but not for the last tab) */}
                        {tabs.length > 1 && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete tab "${tab.name}" and all its contents?`)) {
                                        deleteTab(tab.id);
                                    }
                                }}
                                className={`
                                    absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full 
                                    opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all
                                    ${isActive ? 'text-gray-400' : 'text-gray-400'}
                                `}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                );
            })}

            <button 
                onClick={handleAddTab}
                className="ml-1 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Add Tab"
            >
                <Plus size={18} />
            </button>
        </div>
    );
};