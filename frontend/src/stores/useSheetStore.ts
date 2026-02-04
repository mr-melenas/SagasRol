import { create } from 'zustand';
import { SheetBlock, BlockType } from '../types';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

interface SheetState {
  blocks: SheetBlock[];
  setBlocks: (blocks: SheetBlock[]) => void;
  addBlock: (type: BlockType, parentId?: string) => void;
  removeBlock: (id: string) => void;
  updateLabel: (id: string, newLabel: string) => void;
  updateConfig: (id: string, config: any) => void;
  moveBlocks: (activeId: string, overId: string) => void;
}

// Helper to recursively find and update/remove blocks
const updateBlockRecursive = (blocks: SheetBlock[], id: string, updater: (b: SheetBlock) => SheetBlock | null): SheetBlock[] => {
    return blocks.map(block => {
        if (block.id === id) {
            return updater(block);
        }
        if (block.children) {
            return { ...block, children: updateBlockRecursive(block.children, id, updater) as SheetBlock[] };
        }
        return block;
    }).filter(Boolean) as SheetBlock[];
};

const findBlockParent = (blocks: SheetBlock[], id: string): SheetBlock | null => {
    for (const block of blocks) {
        if (block.children?.some(child => child.id === id)) return block;
        if (block.children) {
            const found = findBlockParent(block.children, id);
            if (found) return found;
        }
    }
    return null;
};

export const useSheetStore = create<SheetState>((set) => ({
  blocks: [],
  setBlocks: (blocks) => set({ blocks }),
  addBlock: (type, parentId) => set((state) => {
    const newBlock: SheetBlock = {
        id: uuidv4(),
        type,
        label: type === 'STAT' ? 'New Stat' : 
               type === 'RESOURCE' ? 'New Resource' : 
               type === 'SKILL' ? 'New Skill' :
               type === 'GROUP' ? 'New Group' : 'New Text',
        children: type === 'GROUP' ? [] : undefined,
        config: {
            color: type === 'RESOURCE' ? '#ef4444' : undefined,
            direction: 'col',
            columns: 1
        }
    };

    if (parentId) {
        return {
            blocks: updateBlockRecursive(state.blocks, parentId, (parent) => ({
                ...parent,
                children: [...(parent.children || []), newBlock]
            })) as SheetBlock[]
        };
    }
    
    return { blocks: [...state.blocks, newBlock] };
  }),
  
  removeBlock: (id) => set((state) => ({
    blocks: updateBlockRecursive(state.blocks, id, () => null) as SheetBlock[]
  })),

  updateLabel: (id, newLabel) => set((state) => ({
    blocks: updateBlockRecursive(state.blocks, id, (b) => ({ ...b, label: newLabel })) as SheetBlock[]
  })),

  updateConfig: (id, config) => set((state) => ({
    blocks: updateBlockRecursive(state.blocks, id, (b) => ({ ...b, config: { ...b.config, ...config } })) as SheetBlock[]
  })),

  moveBlocks: (activeId, overId) => set((state) => {
    // Simple flat sort for root level for now - improved DND logic needed for nested sort
    // This part is complex for nested lists with dnd-kit and might require a different approach 
    // or flat-data projection. For this step, we'll assume root level sorting or specific group sorting.
    
    // Check if both are at root level
    const rootActiveIndex = state.blocks.findIndex(b => b.id === activeId);
    const rootOverIndex = state.blocks.findIndex(b => b.id === overId);

    if (rootActiveIndex !== -1 && rootOverIndex !== -1) {
        return { blocks: arrayMove(state.blocks, rootActiveIndex, rootOverIndex) };
    }

    // TODO: Implement nested sorting logic
    return { blocks: state.blocks };
  }),
}));
