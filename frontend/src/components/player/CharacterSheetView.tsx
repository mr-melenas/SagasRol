import React, { useCallback } from 'react';
import { SheetBlock } from '../../types';
import { useCharacterStore } from '../../store/useCharacterStore';
import { StatBlock, ResourceBlock, TextBlock, InlineFieldBlock, SimpleInputBlock, SkillBlock, CustomSkillBlock, GroupBlock } from '../builder/SheetBlocks';

interface CharacterSheetViewProps {
    templateData: SheetBlock[];
}

export const CharacterSheetView: React.FC<CharacterSheetViewProps> = ({ templateData }) => {
    const { characterValues, updateValue } = useCharacterStore();

    // Use useCallback to keep reference stable
    const onBlockChange = useCallback((id: string, value: any) => {
        updateValue(id, value);
    }, [updateValue]);

    // Helper to get value for a block
    const getValue = useCallback((id: string) => {
        return characterValues[id];
    }, [characterValues]);

    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white min-h-screen shadow-lg">
            <div className="grid gap-4 grid-cols-1">
                {templateData.map(block => (
                    <div key={block.id}>
                         {block.type === 'STAT' && <StatBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'RESOURCE' && <ResourceBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'TEXT' && <TextBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'INLINE_FIELD' && <InlineFieldBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'SIMPLE_INPUT' && <SimpleInputBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'SKILL' && <SkillBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'CUSTOM_SKILL' && <CustomSkillBlock block={block} mode="PLAYER" value={getValue(block.id)} onValueChange={(v) => onBlockChange(block.id, v)} />}
                        {block.type === 'GROUP' && <GroupBlock block={block} mode="PLAYER" getValue={getValue} onBlockChange={onBlockChange} />}
                    </div>
                ))}
            </div>
        </div>
    );
};
