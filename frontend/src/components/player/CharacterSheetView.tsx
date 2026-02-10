import React, { useCallback, useState } from 'react';
import { SheetBlock, SheetTab, SheetTemplateData } from '../../types';
import { useCharacterStore } from '../../store/useCharacterStore';
import { StatBlock, ResourceBlock, TextBlock, InlineFieldBlock, SimpleInputBlock, SkillBlock, CustomSkillBlock, GroupBlock, AvatarBlock } from '../builder/SheetBlocks';

interface CharacterSheetViewProps {
    templateData: SheetBlock[] | SheetTemplateData;
}

export const CharacterSheetView: React.FC<CharacterSheetViewProps> = ({ templateData }) => {
    const { characterValues, updateValue } = useCharacterStore();
    
    // Normalize Data
    // Check if templateData is the new format (object with tabs) or old format (array of blocks)
    const isNewFormat = !Array.isArray(templateData) && 'tabs' in templateData;
    
    const blocks: SheetBlock[] = isNewFormat ? (templateData as SheetTemplateData).blocks : (templateData as SheetBlock[]);
    const tabs: SheetTab[] = isNewFormat ? (templateData as SheetTemplateData).tabs : [];

    // Derive tabs if not present (legacy support)
    const finalTabs: SheetTab[] = tabs.length > 0 ? tabs : (() => {
        const uniqueTabIds = Array.from(new Set(blocks.map(b => b.tabId || 'tab-main')));
        const inferred = uniqueTabIds.map(id => ({
            id,
            name: id === 'tab-main' ? 'Principal' : 
                  id === 'tab-combat' ? 'Combate' : 
                  id === 'tab-bio' ? 'Biografía' : 'Tab'
        }));
        // Sort: Principal first
        inferred.sort((a, b) => {
            if (a.id === 'tab-main') return -1;
            if (b.id === 'tab-main') return 1;
            return 0;
        });
        return inferred;
    })();

    const [activeTabId, setActiveTabId] = useState<string>(finalTabs[0]?.id || 'tab-main');

    // Use useCallback to keep reference stable
    const onBlockChange = useCallback((id: string, value: any) => {
        updateValue(id, value);
    }, [updateValue]);

    // Helper to get value for a block
    const getValue = useCallback((id: string) => {
        return characterValues[id];
    }, [characterValues]);

    const currentBlocks = blocks.filter(b => (b.tabId || 'tab-main') === activeTabId);

    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white min-h-screen shadow-lg">
            {/* Player Tabs */}
            {finalTabs.length > 1 && (
                <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
                    {finalTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`
                                px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
                                ${activeTabId === tab.id 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid gap-4 grid-cols-1">
                {currentBlocks.map(block => (
                    <div key={block.id}>
                         {block.type === 'STAT' && <StatBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'RESOURCE' && <ResourceBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'TEXT' && <TextBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'INLINE_FIELD' && <InlineFieldBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'SIMPLE_INPUT' && <SimpleInputBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'SKILL' && <SkillBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'CUSTOM_SKILL' && <CustomSkillBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'CHARACTER_IMAGE' && <AvatarBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'GROUP' && <GroupBlock block={block} mode="PLAYER" getValue={getValue} onBlockChange={onBlockChange} />}
                    </div>
                ))}
            </div>
        </div>
    );
};
