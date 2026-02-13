import React, { useEffect } from 'react';
import { CharacterSheetView } from '../components/player/CharacterSheetView';
import { SheetBlock } from '../types';
import { useCharacterStore } from '../store/useCharacterStore';

const DUMMY_TEMPLATE: SheetBlock[] = [
    {
        id: 'group-1',
        type: 'GROUP',
        label: 'Main Stats',
        config: { columns: 2 },
        children: [
            { id: 'stat-str', type: 'STAT', label: 'Strength' },
            { id: 'stat-dex', type: 'STAT', label: 'Dexterity' }
        ]
    },
    {
        id: 'group-2',
        type: 'GROUP',
        label: 'Details',
        config: { columns: 1 },
        children: [
            { id: 'name', type: 'INLINE_FIELD', label: 'Character Name' },
            { id: 'class', type: 'SIMPLE_INPUT', label: 'Class', config: { placeholder: 'Select Class' } },
            { id: 'bio', type: 'TEXT', label: 'Biography', config: { defaultValue: 'Enter bio...' } }
        ]
    },
    {
        id: 'group-skills',
        type: 'GROUP',
        label: 'Skills',
        config: { columns: 2 },
        children: [
             { id: 'skill-1', type: 'CUSTOM_SKILL', label: 'Swordsmanship' },
             { id: 'skill-2', type: 'CUSTOM_SKILL', label: 'Archery' }
        ]
    },
    {
        id: 'group-3',
        type: 'GROUP',
        label: 'Empty Group',
        children: []
    }
];

export const TestPlayerMode: React.FC = () => {
    const { reset } = useCharacterStore();
    
    // Reset store on mount
    useEffect(() => {
        reset();
    }, [reset]);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-2xl font-bold mb-6 text-center">Player Mode Test</h1>
            <CharacterSheetView templateData={DUMMY_TEMPLATE} />
        </div>
    );
};
