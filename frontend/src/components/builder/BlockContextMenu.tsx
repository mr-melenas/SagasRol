import React, { useEffect, useRef } from 'react';
import { useSheetStore } from '../../stores/useSheetStore';
import { SheetBlock } from '../../types';
import { Trash2, Edit, ArrowRight } from 'lucide-react';

interface BlockContextMenuProps {
    block: SheetBlock;
    position: { x: number; y: number };
    onClose: () => void;
    onRename?: () => void;
}

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({ block, position, onClose, onRename }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { removeBlock, moveBlockToTab, tabs, activeTabId } = useSheetStore();

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [onClose]);

    // Handle Rename
    const handleRename = () => {
        onRename?.();
        onClose();
    };

    // Handle Delete
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this block?')) {
            removeBlock(block.id);
        }
        onClose();
    };

    // Handle Move
    const handleMove = (targetTabId: string) => {
        moveBlockToTab(block.id, targetTabId);
        onClose();
    };

    const otherTabs = tabs.filter(t => t.id !== activeTabId);

    return (
        <div 
            ref={menuRef}
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.y, left: position.x }}
        >
            {/* Rename */}
            {onRename && (
                <button 
                    onClick={handleRename}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                    <Edit size={14} />
                    Rename
                </button>
            )}

            {/* Move To Submenu */}
            {otherTabs.length > 0 && (
                <div className="relative group/submenu">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <ArrowRight size={14} />
                            Move to...
                        </span>
                    </button>
                    
                    {/* Submenu Content */}
                    <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[150px] hidden group-hover/submenu:block">
                        {otherTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleMove(tab.id)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="border-t my-1"></div>

            {/* Delete */}
            <button 
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
                <Trash2 size={14} />
                Delete
            </button>
        </div>
    );
};