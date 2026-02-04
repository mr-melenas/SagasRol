import React, { useState } from 'react';
import { useSheetStore } from '../../stores/useSheetStore';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { StatBlock, ResourceBlock, TextBlock } from './SheetBlocks';
import { PlusSquare, LayoutTemplate, Type, Save } from 'lucide-react';

export const SheetBuilder: React.FC = () => {
    const { blocks, addBlock, moveBlocks } = useSheetStore();
    const [jsonPreview, setJsonPreview] = useState<string | null>(null);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            moveBlocks(active.id as string, over.id as string);
        }
    };

    return (
        <div className="flex h-[600px] border rounded-lg overflow-hidden bg-gray-50">
            {/* Toolbar */}
            <div className="w-64 bg-white border-r p-4 flex flex-col gap-4">
                <h3 className="font-bold text-gray-700 mb-2">Toolbox</h3>
                
                <button 
                    onClick={() => addBlock('STAT')}
                    className="flex items-center gap-3 p-3 border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                >
                    <PlusSquare size={20} className="text-blue-500" />
                    <div>
                        <div className="font-bold text-sm">Stat Block</div>
                        <div className="text-xs text-gray-500">For Attributes (Str, Dex...)</div>
                    </div>
                </button>

                <button 
                    onClick={() => addBlock('RESOURCE')}
                    className="flex items-center gap-3 p-3 border rounded hover:bg-red-50 hover:border-red-300 transition-colors text-left"
                >
                    <LayoutTemplate size={20} className="text-red-500" />
                    <div>
                        <div className="font-bold text-sm">Resource Bar</div>
                        <div className="text-xs text-gray-500">HP, MP, Stamina...</div>
                    </div>
                </button>

                <button 
                    onClick={() => addBlock('TEXT')}
                    className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                >
                    <Type size={20} className="text-gray-500" />
                    <div>
                        <div className="font-bold text-sm">Text Area</div>
                        <div className="text-xs text-gray-500">Traits, Description...</div>
                    </div>
                </button>

                <div className="mt-auto pt-4 border-t">
                    <button 
                        onClick={() => setJsonPreview(JSON.stringify(blocks, null, 2))}
                        className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2 rounded hover:bg-gray-900"
                    >
                        <Save size={16} />
                        Generate JSON
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-8 overflow-y-auto">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto bg-white min-h-full p-8 shadow-sm rounded-lg border border-dashed border-gray-300">
                            {blocks.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-20">
                                    <LayoutTemplate size={48} className="mb-4 opacity-20" />
                                    <p>Your character sheet is empty.</p>
                                    <p className="text-sm">Add blocks from the toolbox to start designing.</p>
                                </div>
                            )}
                            
                            {blocks.map((block) => {
                                const className = block.type === 'STAT' ? 'col-span-1' : 'col-span-2 md:col-span-4';
                                return (
                                    <div key={block.id} className={className}>
                                        {block.type === 'STAT' && <StatBlock block={block} />}
                                        {block.type === 'RESOURCE' && <ResourceBlock block={block} />}
                                        {block.type === 'TEXT' && <TextBlock block={block} />}
                                    </div>
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Debug Modal */}
            {jsonPreview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <h3 className="text-xl font-bold mb-4">Sheet Template JSON</h3>
                        <pre className="bg-gray-100 p-4 rounded overflow-auto flex-1 text-xs font-mono border">
                            {jsonPreview}
                        </pre>
                        <div className="flex justify-end mt-4 gap-2">
                            <button 
                                onClick={() => navigator.clipboard.writeText(jsonPreview)}
                                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                                Copy to Clipboard
                            </button>
                            <button 
                                onClick={() => setJsonPreview(null)}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
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
