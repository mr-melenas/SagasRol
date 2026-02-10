import React from 'react';
import { SheetBlock } from '../../types';
import { useSheetStore } from '../../stores/useSheetStore';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Palette, Image as ImageIcon, Upload } from 'lucide-react';

export type SheetMode = 'BUILDER' | 'PLAYER';

interface BlockWrapperProps {
  block: SheetBlock;
  children: React.ReactNode;
  isOverlay?: boolean;
  mode?: SheetMode;
  onContextMenu?: (e: React.MouseEvent, block: SheetBlock) => void;
}

const BlockWrapper: React.FC<BlockWrapperProps> = ({ block, children, isOverlay, mode = 'BUILDER', onContextMenu }) => {
    const { removeBlock, updateLabel } = useSheetStore();
    
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
        id: block.id,
        disabled: isOverlay || mode === 'PLAYER'
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const isGroup = block.type === 'GROUP';
    const borderColor = mode === 'PLAYER' 
        ? 'border-transparent' 
        : (isGroup ? 'border-indigo-200' : 'border-gray-200');
    
    const bgColor = mode === 'PLAYER'
        ? 'bg-transparent'
        : (isGroup ? 'bg-indigo-50/10' : 'bg-white');
    
    const overlayStyle = isOverlay ? "shadow-xl ring-2 ring-blue-500 rotate-2 scale-105 z-50 bg-white opacity-100 cursor-grabbing" : "";

    const hideHeaderInput = ['CUSTOM_SKILL', 'INLINE_FIELD'].includes(block.type);

    return (
        <div 
            ref={isOverlay || mode === 'PLAYER' ? null : setNodeRef} 
            style={isOverlay || mode === 'PLAYER' ? {} : style} 
            className={`relative group ${bgColor} border ${borderColor} rounded-lg ${mode === 'PLAYER' ? 'p-1' : 'p-3 shadow-sm hover:shadow-md'} transition-all ${overlayStyle}`}
            onContextMenu={(e) => {
                if (mode === 'BUILDER' && onContextMenu) {
                    e.stopPropagation(); // CRITICAL: Stop bubbling to parent group
                    onContextMenu(e, block);
                }
            }}
        >
            {/* Controls - Hide in PLAYER mode */}
            {mode === 'BUILDER' && (
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
                                readOnly={isOverlay}
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
            )}

            {/* In PLAYER mode, show label as static text if it's not hidden */}
            {mode === 'PLAYER' && !hideHeaderInput && (
                 <div className={`font-bold text-sm mb-2 ${isGroup ? 'text-indigo-700' : 'text-gray-700'}`}>
                    {block.label}
                 </div>
            )}
            
            {/* Content */}
            <div className="">
                {children}
            </div>
        </div>
    );
};

export interface BlockProps {
    block: SheetBlock;
    isOverlay?: boolean;
    mode?: SheetMode;
    value?: any;
    onValueChange?: (val: any) => void;
    // For GroupBlock recursion
    getValue?: (id: string) => any;
    onBlockChange?: (id: string, val: any) => void;
    onContextMenu?: (e: React.MouseEvent, block: SheetBlock) => void;
}

const StatBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange, onContextMenu }) => {
    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
            <div className="flex flex-col items-center">
                {mode === 'PLAYER' ? (
                    <input 
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => onValueChange && onValueChange(e.target.value)}
                        className="w-12 h-12 border-2 border-gray-800 rounded text-center text-xl font-bold bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                ) : (
                    <div className="w-12 h-12 border-2 border-gray-800 rounded flex items-center justify-center text-xl font-bold bg-gray-50 text-gray-400">
                        10
                    </div>
                )}
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{block.label || "Modifier"}</div>
            </div>
        </BlockWrapper>
    );
};
export const StatBlock = React.memo(StatBlockBase);

const ResourceBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange, onContextMenu }) => {
    const { updateConfig } = useSheetStore();

    // Parse values safely
    const safeValue = typeof value === 'object' && value !== null ? value : { current: 0, max: 0 };
    const current = mode === 'PLAYER' ? safeValue.current : (block.config?.defaultCurrent ?? 10);
    const max = mode === 'PLAYER' ? safeValue.max : (block.config?.defaultMax ?? 20);

    const barColor = block.config?.color || '#ef4444'; 

    const handleValueChange = (field: 'current' | 'max', val: string) => {
        const numVal = parseInt(val) || 0;
        if (mode === 'PLAYER') {
            onValueChange && onValueChange({ ...safeValue, [field]: numVal });
        } else {
            updateConfig(block.id, { [field === 'current' ? 'defaultCurrent' : 'defaultMax']: numVal });
        }
    };

    const percentage = Math.min(100, Math.max(0, ((current || 0) / (max || 1)) * 100));

    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
            <div className="flex flex-col w-full">
                <div className="flex justify-between items-center mb-1">
                     <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-700">{block.label || "Resource"}</span>
                        {mode === 'BUILDER' && (
                            <label className="cursor-pointer text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors flex items-center justify-center" title="Change Bar Color">
                                <Palette size={14} />
                                <input 
                                    type="color" 
                                    className="opacity-0 w-0 h-0 absolute" 
                                    value={barColor}
                                    onChange={(e) => updateConfig(block.id, { color: e.target.value })}
                                />
                            </label>
                        )}
                     </div>
                     <div className="flex items-center gap-1">
                        <input 
                            type="number"
                            value={current}
                            disabled={mode === 'BUILDER'}
                            onChange={(e) => handleValueChange('current', e.target.value)}
                            className={`w-12 text-right border-b font-mono text-sm bg-transparent focus:outline-none ${mode === 'BUILDER' ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500 text-gray-900'}`}
                            placeholder="Cur"
                        />
                        <span className="text-gray-400 text-xs">/</span>
                        <input 
                            type="number"
                            value={max}
                            disabled={mode === 'BUILDER'}
                            onChange={(e) => handleValueChange('max', e.target.value)}
                            className={`w-12 text-left border-b font-mono text-sm bg-transparent focus:outline-none ${mode === 'BUILDER' ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500 text-gray-900'}`}
                            placeholder="Max"
                        />
                     </div>
                </div>
                
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200 relative">
                    <div 
                        className="h-full transition-all duration-500 ease-out" 
                        style={{ 
                            width: `${percentage}%`,
                            backgroundColor: barColor 
                        }}
                    ></div>
                </div>
            </div>
        </BlockWrapper>
    );
};
export const ResourceBlock = React.memo(ResourceBlockBase);

const SkillBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange, onContextMenu }) => {
    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
            <div className="flex items-center gap-2">
                {mode === 'PLAYER' ? (
                    <input 
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => onValueChange && onValueChange(e.target.value)}
                        className="w-8 h-8 border border-gray-300 rounded text-center font-bold text-sm bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                ) : (
                    <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-sm">
                        0
                    </div>
                )}
                <div className="flex-1 h-6 bg-gray-100 rounded border border-gray-200 flex items-center px-2">
                     <span className="text-sm font-medium text-gray-700">{block.label}</span>
                </div>
            </div>
        </BlockWrapper>
    );
};
export const SkillBlock = React.memo(SkillBlockBase);

const TextBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange, onContextMenu }) => {
    const { updateConfig } = useSheetStore();
    
    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
            <textarea 
                className="w-full h-24 border border-gray-200 rounded bg-gray-50 p-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Write default text or instructions here..."
                value={mode === 'PLAYER' ? (value ?? block.config?.defaultValue ?? '') : (block.config?.defaultValue ?? '')}
                readOnly={isOverlay}
                data-no-dnd="true"
                onChange={(e) => {
                    if (mode === 'PLAYER') {
                        onValueChange && onValueChange(e.target.value);
                    } else {
                        updateConfig(block.id, { defaultValue: e.target.value });
                    }
                }}
            />
        </BlockWrapper>
    );
};
export const TextBlock = React.memo(TextBlockBase);

const InlineFieldBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange, onContextMenu }) => {
    const { updateLabel } = useSheetStore();

    const labelValue = block.label || "Label";
    const displayLabel = labelValue.length < 4 
        ? labelValue.padEnd(4, '\u00A0') 
        : labelValue;

    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
            <div className="flex items-end gap-2 w-full">
                <div className="grid items-center max-w-[80%] relative">
                    <span 
                        className="col-start-1 row-start-1 font-bold text-gray-700 mb-1 px-0 invisible whitespace-pre overflow-hidden pointer-events-none"
                        aria-hidden="true"
                    >
                        {displayLabel}
                    </span>
                    
                    {mode === 'PLAYER' ? (
                        <div className="col-start-1 row-start-1 w-full h-full font-bold text-gray-700 mb-1 px-0 min-w-[2rem]">
                            {labelValue}
                        </div>
                    ) : (
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
                    )}
                </div>
                
                {mode === 'PLAYER' ? (
                     <input 
                        type="text"
                        value={value ?? ''}
                        onChange={(e) => onValueChange && onValueChange(e.target.value)}
                        className="flex-1 border-b-2 border-gray-300 bg-white h-8 focus:border-blue-500 focus:outline-none px-1"
                    />
                ) : (
                    <div className="flex-1 border-b-2 border-gray-300 bg-gray-50 h-8"></div>
                )}
            </div>
        </BlockWrapper>
    );
};
export const InlineFieldBlock = React.memo(InlineFieldBlockBase);

const SimpleInputBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange, onContextMenu }) => {
    const { updateConfig } = useSheetStore();

    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
             {mode === 'PLAYER' ? (
                <input 
                    type="text" 
                    placeholder={block.config?.placeholder || "..."}
                    value={value ?? ''}
                    onChange={(e) => onValueChange && onValueChange(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
             ) : (
                <>
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
                </>
             )}
        </BlockWrapper>
    );
};
export const SimpleInputBlock = React.memo(SimpleInputBlockBase);

const CustomSkillBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange, onContextMenu }) => {
    const { updateLabel } = useSheetStore();

    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
            <div className="flex items-center gap-2">
                {mode === 'PLAYER' ? (
                     <input 
                        type="number"
                        value={value ?? ''}
                        onChange={(e) => onValueChange && onValueChange(e.target.value)}
                        className="w-12 h-8 border border-gray-300 rounded text-center font-bold text-sm shrink-0 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="0"
                    />
                ) : (
                    <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-sm shrink-0">
                        0
                    </div>
                )}
                
                {/* Name */}
                <div className="flex-1 h-8 bg-white flex items-center border border-gray-300 rounded focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                    {mode === 'PLAYER' ? (
                        <div className="w-full h-full flex items-center px-3 text-gray-700 font-medium text-sm">
                            {block.label}
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>
        </BlockWrapper>
    );
};
export const CustomSkillBlock = React.memo(CustomSkillBlockBase);

const GroupBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', getValue, onBlockChange, onContextMenu }) => {
    const { updateConfig } = useSheetStore();
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `${block.id}-placeholder`,
        data: {
            type: 'group-placeholder',
            groupId: block.id
        },
        disabled: isOverlay || mode === 'PLAYER'
    });
    
    const handleColumnsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateConfig(block.id, { columns: parseInt(e.target.value) });
    };

    const childIds = block.children?.map(c => c.id) || [];
    const isEmpty = !block.children || block.children.length === 0;

    if (mode === 'PLAYER' && isEmpty) {
        return null; 
    }

    const columns = block.config?.columns || 1;
    const gridColsClass = 
        columns === 1 ? 'grid-cols-1' :
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' :
        columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

    const content = (
        <div 
            ref={mode === 'PLAYER' ? null : setDroppableRef}
            className={`grid ${mode === 'PLAYER' ? 'gap-2 p-2' : 'gap-2 min-h-[120px] p-4'} content-start w-full ${mode === 'PLAYER' ? gridColsClass : ''}`}
            style={mode === 'PLAYER' ? {} : { 
                gridTemplateColumns: `repeat(${columns}, 1fr)` 
            }}
        >
            {block.children && block.children.length > 0 ? (
                block.children.map(child => (
                    <div key={child.id} className="relative w-full min-w-0">
                        {child.type === 'STAT' && <StatBlock block={child} mode={mode} value={getValue?.(child.id)} onValueChange={(v) => onBlockChange?.(child.id, v)} onContextMenu={onContextMenu} />}
                        {child.type === 'RESOURCE' && <ResourceBlock block={child} mode={mode} value={getValue?.(child.id)} onValueChange={(v) => onBlockChange?.(child.id, v)} onContextMenu={onContextMenu} />}
                        {child.type === 'TEXT' && <TextBlock block={child} mode={mode} onContextMenu={onContextMenu} />}
                        {child.type === 'INLINE_FIELD' && <InlineFieldBlock block={child} mode={mode} value={getValue?.(child.id)} onValueChange={(v) => onBlockChange?.(child.id, v)} onContextMenu={onContextMenu} />}
                        {child.type === 'SIMPLE_INPUT' && <SimpleInputBlock block={child} mode={mode} value={getValue?.(child.id)} onValueChange={(v) => onBlockChange?.(child.id, v)} onContextMenu={onContextMenu} />}
                        {child.type === 'SKILL' && <SkillBlock block={child} mode={mode} value={getValue?.(child.id)} onValueChange={(v) => onBlockChange?.(child.id, v)} onContextMenu={onContextMenu} />}
                        {child.type === 'CUSTOM_SKILL' && <CustomSkillBlock block={child} mode={mode} value={getValue?.(child.id)} onValueChange={(v) => onBlockChange?.(child.id, v)} onContextMenu={onContextMenu} />}
                        {child.type === 'PLAYER_NOTE' && <PlayerNoteBlock block={child} mode={mode} value={getValue?.(child.id)} onValueChange={(v) => onBlockChange?.(child.id, v)} onContextMenu={onContextMenu} />}
                        {child.type === 'GROUP' && <GroupBlock block={child} mode={mode} getValue={getValue} onBlockChange={onBlockChange} onContextMenu={onContextMenu} />}
                    </div>
                ))
            ) : (
                mode === 'BUILDER' && (
                    <div 
                        className="col-span-full py-8 border-2 border-dashed border-indigo-200 rounded-lg flex items-center justify-center text-indigo-300 bg-white/50 pointer-events-none"
                    >
                        <span className="text-sm font-medium">Drop items here</span>
                    </div>
                )
            )}
        </div>
    );

    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
            <div className={`min-h-[100px] border-2 border-dashed rounded-lg p-2 mt-2 transition-colors ${
                isOver && mode === 'BUILDER' ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-200' : 'border-indigo-200 bg-indigo-50/30'
            }`}>
                {mode === 'BUILDER' && (
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
                )}
                
                {mode === 'BUILDER' ? (
                    <SortableContext items={childIds} strategy={rectSortingStrategy}>
                        {content}
                    </SortableContext>
                ) : (
                    content
                )}
            </div>
        </BlockWrapper>
    );
};
export const GroupBlock = React.memo(GroupBlockBase);

const AvatarBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange }) => {
    const { updateConfig } = useSheetStore();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onValueChange) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onValueChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const isCircle = block.config?.avatarShape === 'circle';

    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode}>
            <div className="flex flex-col items-center justify-center">
                {mode === 'BUILDER' && (
                    <div className="flex gap-2 mb-2">
                        <button 
                            onClick={() => updateConfig(block.id, { avatarShape: 'square' })}
                            className={`p-1 rounded border ${!isCircle ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}`}
                            title="Square"
                        >
                            <div className="w-4 h-4 bg-gray-400 rounded-sm"></div>
                        </button>
                        <button 
                            onClick={() => updateConfig(block.id, { avatarShape: 'circle' })}
                            className={`p-1 rounded border ${isCircle ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200'}`}
                            title="Circle"
                        >
                            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                        </button>
                    </div>
                )}

                <div className={`
                    relative bg-gray-100 border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center
                    ${isCircle ? 'rounded-full' : 'rounded-lg'}
                    aspect-square w-full max-w-[200px]
                `}>
                    {value ? (
                        <img src={value} alt="Character Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center text-center p-4">
                            {mode === 'PLAYER' ? (
                                <>
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-xs">Click to upload</span>
                                </>
                            ) : (
                                <>
                                    <ImageIcon size={32} className="mb-2" />
                                    <span className="text-xs">Avatar Placeholder</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Input for Player Mode */}
                    {mode === 'PLAYER' && (
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    )}
                </div>
            </div>
        </BlockWrapper>
    );
};
export const AvatarBlock = React.memo(AvatarBlockBase);

const PlayerNoteBlockBase: React.FC<BlockProps> = ({ block, isOverlay, mode = 'BUILDER', value, onValueChange, onContextMenu }) => {
    const { updateLabel, updateConfig } = useSheetStore();

    return (
        <BlockWrapper block={block} isOverlay={isOverlay} mode={mode} onContextMenu={onContextMenu}>
            <div className="flex items-center gap-2">
                {/* Fixed "0" box style placeholder (visual only, not editable here) or maybe editable? 
                    User asked for "like this item" -> Custom Skill has a number box. 
                    If it's purely a note, maybe no number box? 
                    "create an item like this, but the difference is that the player will be able to write in it."
                    The reference image is a Custom Skill (Number + Text).
                    So we want a Number + Text input where BOTH are editable by player?
                    Or just the text is editable by player (which Custom Skill already does)?
                    
                    Wait, Custom Skill:
                    - Builder: Edit Label (Skill Name).
                    - Player: Edit Value (Number). Label is static.

                    User wants: "Player will be able to write in it".
                    Likely means Player can write the LABEL (Text) too.
                    Like an "Inventory Item" or "Custom Note".
                */}
                
                {mode === 'PLAYER' ? (
                     <input 
                        type="number"
                        value={value?.value ?? ''}
                        onChange={(e) => onValueChange && onValueChange({ ...value, value: e.target.value })}
                        className="w-8 h-8 border border-gray-300 rounded text-center font-bold text-sm shrink-0 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="0"
                    />
                ) : (
                    <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-sm shrink-0">
                        #
                    </div>
                )}
                
                {/* Name Input - Editable by Player too! */}
                <div className="flex-1 h-8 bg-white flex items-center border border-gray-300 rounded focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                    {mode === 'PLAYER' ? (
                        <input 
                            type="text"
                            value={value?.text ?? ''}
                            onChange={(e) => onValueChange && onValueChange({ ...value, text: e.target.value })}
                            className="w-full h-full bg-transparent border-none focus:outline-none px-3 text-gray-700 font-medium text-sm placeholder-gray-400 rounded"
                            placeholder={block.label || "Item Name..."}
                        />
                    ) : (
                        <input 
                            type="text"
                            value={block.label}
                            readOnly={isOverlay}
                            onChange={(e) => updateLabel(block.id, e.target.value)}
                            data-no-dnd="true"
                            onPointerDown={(e) => e.stopPropagation()}
                            className="w-full h-full bg-transparent border-none focus:outline-none px-3 text-gray-700 font-medium text-sm placeholder-gray-400 rounded"
                            placeholder="Default Label..."
                        />
                    )}
                </div>
            </div>
        </BlockWrapper>
    );
};
export const PlayerNoteBlock = React.memo(PlayerNoteBlockBase);
