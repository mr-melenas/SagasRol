import React, { useState } from 'react';
import { useSheetStore } from '../../stores/useSheetStore';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { StatBlock, ResourceBlock, TextBlock, SkillBlock, GroupBlock } from './SheetBlocks';
import { PlusSquare, LayoutTemplate, Type, Save, List, Layers } from 'lucide-react';
import { SheetBlock } from '../../types';

export const SheetBuilder: React.FC = () => {
    const { blocks, addBlock, moveBlocks } = useSheetStore();
    const [jsonPreview, setJsonPreview] = useState<string | null>(null);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            moveBlocks(active.id as string, over.id as string);
        }
    };

    const renderBlock = (block: SheetBlock) => {
        const isStat = block.type === 'STAT';
        const isGroup = block.type === 'GROUP';
        // Stats are small in main grid, groups full width, others adapt
        const className = isStat ? 'col-span-1' : 'col-span-2 md:col-span-4';
        
        return (
            <div key={block.id} className={className}>
                {block.type === 'STAT' && <StatBlock block={block} />}
                {block.type === 'RESOURCE' && <ResourceBlock block={block} />}
                {block.type === 'TEXT' && <TextBlock block={block} />}
                {block.type === 'SKILL' && <SkillBlock block={block} />}
                {block.type === 'GROUP' && <GroupBlock block={block} />}
            </div>
        );
    };

    return (
        <div className="flex h-[700px] border rounded-lg overflow-hidden bg-gray-50">
            {/* Toolbar */}
            <div className="w-64 bg-white border-r p-4 flex flex-col gap-3 overflow-y-auto">
                <h3 className="font-bold text-gray-700 mb-2">Toolbox</h3>
                
                <div className="space-y-3">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Basic</div>
                    <button 
                        onClick={() => addBlock('STAT')}
                        className="w-full flex items-center gap-3 p-3 border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                    >
                        <PlusSquare size={20} className="text-blue-500" />
                        <div>
                            <div className="font-bold text-sm">Stat Block</div>
                            <div className="text-xs text-gray-500">For Attributes</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => addBlock('RESOURCE')}
                        className="w-full flex items-center gap-3 p-3 border rounded hover:bg-red-50 hover:border-red-300 transition-colors text-left"
                    >
                        <LayoutTemplate size={20} className="text-red-500" />
                        <div>
                            <div className="font-bold text-sm">Resource Bar</div>
                            <div className="text-xs text-gray-500">HP, MP, Stamina</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => addBlock('TEXT')}
                        className="w-full flex items-center gap-3 p-3 border rounded hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                    >
                        <Type size={20} className="text-gray-500" />
                        <div>
                            <div className="font-bold text-sm">Text Area</div>
                            <div className="text-xs text-gray-500">Descriptions</div>
                        </div>
                    </button>
                </div>

                <div className="space-y-3 mt-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Advanced</div>
                    <button 
                        onClick={() => addBlock('SKILL')}
                        className="w-full flex items-center gap-3 p-3 border rounded hover:bg-green-50 hover:border-green-300 transition-colors text-left"
                    >
                        <List size={20} className="text-green-500" />
                        <div>
                            <div className="font-bold text-sm">Skill Item</div>
                            <div className="text-xs text-gray-500">Compact row</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => addBlock('GROUP')}
                        className="w-full flex items-center gap-3 p-3 border rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-left"
                    >
                        <Layers size={20} className="text-indigo-500" />
                        <div>
                            <div className="font-bold text-sm">Group Section</div>
                            <div className="text-xs text-gray-500">Container for items</div>
                        </div>
                    </button>
                </div>

                <div className="mt-auto pt-4 border-t">
                    <button 
                        onClick={() => setJsonPreview(JSON.stringify(blocks, null, 2))}
                        className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2 rounded hover:bg-gray-900 shadow-lg"
                    >
                        <Save size={16} />
                        Generate JSON
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-8 overflow-y-auto bg-gray-100/50">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto bg-white min-h-[600px] p-8 shadow-sm rounded-xl border border-dashed border-gray-300">
                            {blocks.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-32">
                                    <LayoutTemplate size={48} className="mb-4 opacity-20" />
                                    <p className="text-lg font-medium">Your character sheet is empty</p>
                                    <p className="text-sm opacity-70">Add blocks from the toolbox to start designing</p>
                                </div>
                            )}
                            
                            {blocks.map(renderBlock)}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Debug Modal */}
            {jsonPreview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Save size={20} className="text-blue-600" />
                            Template JSON Structure
                        </h3>
                        <div className="flex-1 overflow-hidden border rounded-lg bg-gray-50">
                            <pre className="p-4 overflow-auto h-full text-xs font-mono text-gray-700">
                                {jsonPreview}
                            </pre>
                        </div>
                        <div className="flex justify-end mt-4 gap-2">
                            <button 
                                onClick={() => navigator.clipboard.writeText(jsonPreview)}
                                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded font-medium transition-colors"
                            >
                                Copy to Clipboard
                            </button>
                            <button 
                                onClick={() => setJsonPreview(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
