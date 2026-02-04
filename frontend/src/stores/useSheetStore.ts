import { create } from 'zustand';
import { SheetBlock, BlockType } from '../types';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

interface SheetState {
  blocks: SheetBlock[];
  setBlocks: (blocks: SheetBlock[]) => void;
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  updateLabel: (id: string, newLabel: string) => void;
  moveBlocks: (activeId: string, overId: string) => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  blocks: [],
  setBlocks: (blocks) => set({ blocks }),
  addBlock: (type) => set((state) => {
    const newBlock: SheetBlock = {
        id: uuidv4(),
        type,
        label: type === 'STAT' ? 'New Stat' : type === 'RESOURCE' ? 'New Resource' : 'New Text',
        config: {
            color: type === 'RESOURCE' ? '#ef4444' : undefined
        }
    };
    return { blocks: [...state.blocks, newBlock] };
  }),
  removeBlock: (id) => set((state) => ({
    blocks: state.blocks.filter((b) => b.id !== id),
  })),
  updateLabel: (id, newLabel) => set((state) => ({
    blocks: state.blocks.map((b) => 
        b.id === id ? { ...b, label: newLabel } : b
    ),
  })),
  moveBlocks: (activeId, overId) => set((state) => {
    const oldIndex = state.blocks.findIndex((b) => b.id === activeId);
    const newIndex = state.blocks.findIndex((b) => b.id === overId);
    return { blocks: arrayMove(state.blocks, oldIndex, newIndex) };
  }),
}));
