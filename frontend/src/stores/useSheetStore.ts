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
  moveBlockToGroup: (activeId: string, groupId: string) => void;
}

// Helper to find the path to a block: [rootIndex, childIndex, childIndex...]
// This helps in precise location finding for deep nesting
const findBlockPath = (blocks: SheetBlock[], id: string, currentPath: number[] = []): number[] | null => {
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === id) {
            return [...currentPath, i];
        }
        if (blocks[i].children) {
            const path = findBlockPath(blocks[i].children!, id, [...currentPath, i]);
            if (path) return path;
        }
    }
    return null;
};

// Helper to get block at path
const getBlockAtPath = (blocks: SheetBlock[], path: number[]): SheetBlock | null => {
    let current = blocks;
    let block: SheetBlock | null = null;
    
    for (let i = 0; i < path.length; i++) {
        const index = path[i];
        if (!current || !current[index]) return null;
        block = current[index];
        current = block.children || [];
    }
    return block;
};

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
    const activePath = findBlockPath(state.blocks, activeId);
    const overPath = findBlockPath(state.blocks, overId);

    if (!activePath || !overPath) return { blocks: state.blocks };

    // Deep clone to avoid mutation issues
    const newBlocks = JSON.parse(JSON.stringify(state.blocks));
    
    // Find parent arrays
    const getParentArray = (root: SheetBlock[], path: number[]) => {
        let current = root;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]].children!;
        }
        return current;
    };

    const activeParentArray = getParentArray(newBlocks, activePath);
    const activeIndex = activePath[activePath.length - 1];
    const activeBlock = activeParentArray[activeIndex];

    // Remove active block
    activeParentArray.splice(activeIndex, 1);

    // If we are moving to a position that was affected by the removal (same parent and overIndex > activeIndex)
    // we need to adjust the over path or index.
    // Re-calculate overPath in the modified tree?
    // It's safer to find the overBlock and its parent in the modified tree, 
    // BUT since we just removed an item, indices might have shifted.
    
    // Strategy: 
    // 1. Find active block and remove it.
    // 2. Find over block (re-search by ID because indices might have changed).
    // 3. Insert active block relative to over block.

    // Let's restart with this safer strategy
    const cleanBlocks = JSON.parse(JSON.stringify(state.blocks));
    
    // 1. Locate and extract Active Block
    const pathA = findBlockPath(cleanBlocks, activeId);
    if (!pathA) return { blocks: state.blocks }; // Should not happen
    
    const parentListA = getParentArray(cleanBlocks, pathA);
    const indexA = pathA[pathA.length - 1];
    const [extractedBlock] = parentListA.splice(indexA, 1);

    // 2. Locate Over Block (after removal)
    const pathO = findBlockPath(cleanBlocks, overId);
    if (!pathO) {
        // Fallback: if overId is gone? shouldn't happen unless activeId == overId
        return { blocks: state.blocks }; 
    }

    const parentListO = getParentArray(cleanBlocks, pathO);
    const indexO = pathO[pathO.length - 1];

    // 3. Insert
    // dnd-kit usually expects "swap" or "insert before/after". 
    // arrayMove logic: if same container, move to new index.
    // if different container, insert at indexO.
    
    // If we are just reordering in the same list, we want to mimic arrayMove behavior
    // But since we already removed it, we just insert at indexO.
    // HOWEVER, if indexA < indexO in the same list, indexO has shifted down by 1.
    // But we re-searched pathO, so indexO is correct in the *current* state (without A).
    
    parentListO.splice(indexO, 0, extractedBlock);

    return { blocks: cleanBlocks };
  }),

  moveBlockToGroup: (activeId, groupId) => set((state) => {
    const activePath = findBlockPath(state.blocks, activeId);
    if (!activePath) return { blocks: state.blocks };

    const newBlocks = JSON.parse(JSON.stringify(state.blocks));

    // Get parent array of active block
    let current = newBlocks;
    for (let i = 0; i < activePath.length - 1; i++) {
        current = current[activePath[i]].children!;
    }
    const activeParentArray = current;
    const activeIndex = activePath[activePath.length - 1];
    
    // Extract block
    const [activeBlock] = activeParentArray.splice(activeIndex, 1);

    // Find target group to insert into
    const groupPath = findBlockPath(newBlocks, groupId);
    if (!groupPath) return { blocks: state.blocks };

    // Get group block
    let groupBlock = newBlocks[groupPath[0]];
    for (let i = 1; i < groupPath.length; i++) {
        groupBlock = groupBlock.children![groupPath[i]];
    }

    // Initialize children if undefined
    if (!groupBlock.children) groupBlock.children = [];
    
    // Push to children
    groupBlock.children.push(activeBlock);

    return { blocks: newBlocks };
  }),
}));
