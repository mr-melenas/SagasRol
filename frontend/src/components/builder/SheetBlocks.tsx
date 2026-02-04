import React from 'react';
import { SheetBlock } from '../../types';
import { useSheetStore } from '../../stores/useSheetStore';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical } from 'lucide-react';

interface BlockWrapperProps {
  block: SheetBlock;
  children: React.ReactNode;
}

const BlockWrapper: React.FC<BlockWrapperProps> = ({ block, children }) => {
    const { removeBlock, updateLabel } = useSheetStore();
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="relative group bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all"
        >
            {/* Controls */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 flex-1">
                    <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                        <GripVertical size={16} />
                    </button>
                    <input 
                        type="text" 
                        value={block.label} 
                        onChange={(e) => updateLabel(block.id, e.target.value)}
                        className="font-bold text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                    />
                </div>
                <button onClick={() => removeBlock(block.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                </button>
            </div>
            
            {/* Content */}
            <div className="pointer-events-none opacity-80">
                {children}
            </div>
        </div>
    );
};

export const StatBlock: React.FC<{ block: SheetBlock }> = ({ block }) => {
    return (
        <BlockWrapper block={block}>
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-2 border-gray-800 rounded flex items-center justify-center text-xl font-bold bg-gray-50 text-gray-400">
                    10
                </div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Modifier</div>
            </div>
        </BlockWrapper>
    );
};

export const ResourceBlock: React.FC<{ block: SheetBlock }> = ({ block }) => {
    return (
        <BlockWrapper block={block}>
            <div className="flex gap-2 items-center mb-1">
                <div className="bg-gray-100 rounded px-2 py-1 text-xs font-mono text-gray-500 w-12 text-center">CUR</div>
                <span className="text-gray-400">/</span>
                <div className="bg-gray-100 rounded px-2 py-1 text-xs font-mono text-gray-500 w-12 text-center">MAX</div>
            </div>
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full w-2/3" style={{ backgroundColor: block.config?.color || '#ef4444' }}></div>
            </div>
        </BlockWrapper>
    );
};

export const TextBlock: React.FC<{ block: SheetBlock }> = ({ block }) => {
    return (
        <BlockWrapper block={block}>
            <div className="h-16 w-full border border-gray-200 rounded bg-gray-50 p-2">
                <div className="h-2 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
        </BlockWrapper>
    );
};
