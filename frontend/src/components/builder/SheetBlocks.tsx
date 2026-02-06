import React from 'react';
import { SheetBlock } from '../../types';
import { useSheetStore } from '../../stores/useSheetStore';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical } from 'lucide-react';

interface BlockWrapperProps {
  block: SheetBlock;
  children: React.ReactNode;
  isOverlay?: boolean;
}

const BlockWrapper: React.FC<BlockWrapperProps> = ({ block, children, isOverlay }) => {
    const { removeBlock, updateLabel } = useSheetStore();
    
    // Conditional hook usage: hooks must be called unconditionally in the same order.
    // But we can't conditionally call useSortable. 
    // We should separate the sortable logic from the presentation or use a dummy implementation.
    // However, dnd-kit hooks are robust. 
    // Better pattern: Split into SortableBlockWrapper and StaticBlockWrapper (for overlay).
    // Or just always call it but disable it? useSortable has 'disabled' option.
    
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: block.id,
        disabled: isOverlay 
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1, // Visual effect for original item
    };

    const isGroup = block.type === 'GROUP';
    const borderColor = isGroup ? 'border-indigo-200' : 'border-gray-200';
    const bgColor = isGroup ? 'bg-indigo-50/10' : 'bg-white';
    
    // If overlay, we override styles to look "lifted"
    const overlayStyle = isOverlay ? "shadow-xl ring-2 ring-blue-500 rotate-2 scale-105 z-50 bg-white opacity-100 cursor-grabbing" : "";

    // Determine if we should show the generic header input
    // Hide header input for these types as they have inline editing
    const hideHeaderInput = ['CUSTOM_SKILL', 'INLINE_FIELD'].includes(block.type);

    return (
        <div 
            ref={isOverlay ? null : setNodeRef} 
            style={isOverlay ? {} : style} 
            className={`relative group ${bgColor} border ${borderColor} rounded-lg p-3 shadow-sm hover:shadow-md transition-all ${overlayStyle}`}
        >
            {/* Controls - Hide some controls in overlay if desired, or keep them static */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 flex-1">
                    <button 
                        {...(!isOverlay ? attributes : {})} 
                        {...(!isOverlay ? listeners : {})} 
                        className={`text-gray-400 hover:text-gray-600 ${isOverlay ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
                    >
                        <GripVertical size={16} />
                    </button>
                    {!hideHeaderInput && (
                        <input 
                            type="text" 
                            value={block.label} 
                            readOnly={isOverlay} // ReadOnly in overlay
                            onChange={(e) => updateLabel(block.id, e.target.value)}
                            data-no-dnd="true"
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`font-bold text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full ${isGroup ? 'text-indigo-700' : 'text-gray-700'}`}
                        />
                    )}
                </div>
                {!isOverlay && (
                    <button onClick={() => removeBlock(block.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
            
            {/* Content */}
            <div className="">
                {children}
            </div>
        </div>
    );
};

// Update component props to include isOverlay
export const StatBlock: React.FC<{ block: SheetBlock, isOverlay?: boolean }> = ({ block, isOverlay }) => {
    return (
        <BlockWrapper block={block} isOverlay={isOverlay}>
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-2 border-gray-800 rounded flex items-center justify-center text-xl font-bold bg-gray-50 text-gray-400">
                    10
                </div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Modifier</div>
            </div>
        </BlockWrapper>
    );
};

export const ResourceBlock: React.FC<{ block: SheetBlock, isOverlay?: boolean }> = ({ block, isOverlay }) => {
    return (
        <BlockWrapper block={block} isOverlay={isOverlay}>
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

export const SkillBlock: React.FC<{ block: SheetBlock, isOverlay?: boolean }> = ({ block, isOverlay }) => {
    return (
        <BlockWrapper block={block} isOverlay={isOverlay}>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-sm">
                    0
                </div>
                <div className="flex-1 h-6 bg-gray-100 rounded border border-gray-200"></div>
            </div>
        </BlockWrapper>
    );
};

export const GroupBlock: React.FC<{ block: SheetBlock, isOverlay?: boolean }> = ({ block, isOverlay }) => {
    const { updateConfig } = useSheetStore();
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `${block.id}-placeholder`,
        data: {
            type: 'group-placeholder',
            groupId: block.id
        },
        disabled: isOverlay // Disable droppable in overlay
    });
    
    const handleColumnsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateConfig(block.id, { columns: parseInt(e.target.value) });
    };

    const childIds = block.children?.map(c => c.id) || [];

    return (
        <BlockWrapper block={block} isOverlay={isOverlay}>
            <div className={`min-h-[100px] border-2 border-dashed rounded-lg p-2 mt-2 transition-colors ${
                isOver ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-200' : 'border-indigo-200 bg-indigo-50/30'
            }`}>
                <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Group Container</span>
                    <select 
                        className="text-xs border rounded p-1 bg-white text-gray-600"
                        value={block.config?.columns || 1}
                        onChange={handleColumnsChange}
                    >
                        <option value="1">1 Col</option>
                        <option value="2">2 Cols</option>
                        <option value="3">3 Cols</option>
                        <option value="4">4 Cols</option>
                    </select>
                </div>
                
                <SortableContext items={childIds} strategy={rectSortingStrategy}>
                    <div 
                        ref={setDroppableRef} // Make the whole grid area droppable via the placeholder ID mechanism
                        className="grid gap-2 min-h-[120px] p-4 content-start"
                        style={{ gridTemplateColumns: `repeat(${block.config?.columns || 1}, 1fr)` }}
                    >
                        {block.children && block.children.length > 0 ? (
                            block.children.map(child => (
                                <div key={child.id} className="relative">
                                    {/* Recursively render children */}
                                    {child.type === 'STAT' && <StatBlock block={child} />}
                                    {child.type === 'RESOURCE' && <ResourceBlock block={child} />}
                                    {child.type === 'TEXT' && <TextBlock block={child} />}
                                    {child.type === 'INLINE_FIELD' && <InlineFieldBlock block={child} />}
                                    {child.type === 'SIMPLE_INPUT' && <SimpleInputBlock block={child} />}
                                    {child.type === 'SKILL' && <SkillBlock block={child} />}
                                    {child.type === 'CUSTOM_SKILL' && <CustomSkillBlock block={child} />}
                                    {child.type === 'GROUP' && <GroupBlock block={child} />}
                                </div>
                            ))
                        ) : (
                            <div 
                                className="col-span-full py-8 border-2 border-dashed border-indigo-200 rounded-lg flex items-center justify-center text-indigo-300 bg-white/50 pointer-events-none"
                            >
                                <span className="text-sm font-medium">Drop items here</span>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </BlockWrapper>
    );
};

export const TextBlock: React.FC<{ block: SheetBlock, isOverlay?: boolean }> = ({ block, isOverlay }) => {
    const { updateConfig } = useSheetStore();
    
    return (
        <BlockWrapper block={block} isOverlay={isOverlay}>
            <textarea 
                className="w-full h-24 border border-gray-200 rounded bg-gray-50 p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Write default text or instructions here..."
                value={block.config?.defaultValue || ''}
                readOnly={isOverlay}
                data-no-dnd="true"
                onChange={(e) => updateConfig(block.id, { defaultValue: e.target.value })}
            />
        </BlockWrapper>
    );
};

export const InlineFieldBlock: React.FC<{ block: SheetBlock, isOverlay?: boolean }> = ({ block, isOverlay }) => {
    const { updateLabel } = useSheetStore();

    // Ensure we have a string value, fallback to "Label" if empty or undefined
    const labelValue = block.label || "Label";

    // Helper to ensure minimum content width for 4 chars
    const displayLabel = labelValue.length < 4 
        ? labelValue.padEnd(4, '\u00A0') // Pad with non-breaking spaces if too short
        : labelValue;

    return (
        <BlockWrapper block={block} isOverlay={isOverlay}>
            <div className="flex items-end gap-2 w-full">
                {/* Auto-resizing input container */}
                <div className="grid items-center max-w-[80%] relative">
                    {/* Hidden span for width measurement - matches input style exactly */}
                    <span 
                        className="col-start-1 row-start-1 font-bold text-gray-700 mb-1 px-0 invisible whitespace-pre overflow-hidden pointer-events-none"
                        aria-hidden="true"
                    >
                        {displayLabel}
                    </span>
                    
                    {/* Actual Input */}
                    <input 
                        type="text"
                        value={block.label}
                        readOnly={isOverlay}
                        onChange={(e) => updateLabel(block.id, e.target.value)}
                        data-no-dnd="true"
                        onPointerDown={(e) => e.stopPropagation()}
                        className="col-start-1 row-start-1 w-full h-full font-bold text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none mb-1 px-0 placeholder-gray-400 min-w-[2rem]"
                        placeholder="Label"
                    />
                </div>
                
                {/* Line fills remaining space */}
                <div className="flex-1 border-b-2 border-gray-300 bg-gray-50 h-8"></div>
            </div>
        </BlockWrapper>
    );
};

export const SimpleInputBlock: React.FC<{ block: SheetBlock, isOverlay?: boolean }> = ({ block, isOverlay }) => {
    const { updateConfig } = useSheetStore();

    return (
        <BlockWrapper block={block} isOverlay={isOverlay}>
             <input 
                type="text" 
                placeholder={block.config?.placeholder || "Placeholder..."}
                value={block.config?.placeholder || ''}
                readOnly={isOverlay}
                data-no-dnd="true"
                onChange={(e) => updateConfig(block.id, { placeholder: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-500 italic"
            />
            <div className="text-[10px] text-gray-400 mt-1 text-right">Edit placeholder text above</div>
        </BlockWrapper>
    );
};

export const CustomSkillBlock: React.FC<{ block: SheetBlock, isOverlay?: boolean }> = ({ block, isOverlay }) => {
    const { updateLabel } = useSheetStore();

    return (
        <BlockWrapper block={block} isOverlay={isOverlay}>
            <div className="flex items-center gap-2">
                {/* Number Field Placeholder */}
                <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-sm shrink-0">
                    0
                </div>
                
                {/* Editable Text Field */}
                <div className="flex-1 h-8 bg-white flex items-center border border-gray-300 rounded focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                    <input 
                        type="text"
                        value={block.label}
                        readOnly={isOverlay}
                        onChange={(e) => updateLabel(block.id, e.target.value)}
                        data-no-dnd="true"
                        onPointerDown={(e) => e.stopPropagation()}
                        className="w-full h-full bg-transparent border-none focus:outline-none px-3 text-gray-700 font-medium text-sm placeholder-gray-400 rounded"
                        placeholder="Skill Name..."
                    />
                </div>
            </div>
        </BlockWrapper>
    );
};
