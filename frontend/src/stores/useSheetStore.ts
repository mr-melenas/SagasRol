import { create } from 'zustand';
import { SheetBlock, BlockType, SheetTab } from '../types';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

interface SheetState {
  blocks: SheetBlock[];
  tabs: SheetTab[];
  activeTabId: string;
  setBlocks: (blocks: SheetBlock[]) => void;
  addBlock: (type: BlockType, parentId?: string) => void;
  removeBlock: (id: string) => void;
  updateLabel: (id: string, newLabel: string) => void;
  updateConfig: (id: string, config: any) => void;
  moveBlocks: (activeId: string, overId: string) => void;
  moveBlockToGroup: (activeId: string, groupId: string) => void;
  moveBlockToTab: (blockId: string, targetTabId: string) => void;
  duplicateBlock: (blockId: string, targetTabId?: string) => void;
  
  // Tab Actions
  addTab: (name: string) => void;
  setActiveTab: (id: string) => void;
  updateTabName: (id: string, newName: string) => void;
  deleteTab: (id: string) => void;
  setTabs: (tabs: SheetTab[]) => void;
}

// ... helpers (keep existing ones) ...
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

// Helper for deep cloning blocks with new IDs
const deepCloneBlock = (block: SheetBlock, tabIdOverride?: string): SheetBlock => {
    const newId = uuidv4();
    const newBlock: SheetBlock = {
        ...block,
        id: newId,
        label: `${block.label} (Copy)`,
        tabId: tabIdOverride || block.tabId,
        children: block.children ? block.children.map(child => deepCloneBlock(child, tabIdOverride)) : undefined
    };
    return newBlock;
};

export const useSheetStore = create<SheetState>((set) => ({
  blocks: [],
  tabs: [
      { id: 'tab-main', name: 'Principal' }
  ],
  activeTabId: 'tab-main',

  setBlocks: (blocks) => set((state) => {
      // Migration: If blocks don't have tabId, assign them to the first tab (or active tab)
      const migratedBlocks = blocks.map(b => {
          if (!b.tabId) {
              return { ...b, tabId: 'tab-main' };
          }
          return b;
      });
      return { blocks: migratedBlocks };
  }),

  // Tab Actions
  addTab: (name) => set((state) => {
      const newTab = { id: uuidv4(), name };
      return { 
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id
      };
  }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabName: (id, newName) => set((state) => ({
      tabs: state.tabs.map(t => t.id === id ? { ...t, name: newName } : t)
  })),

  deleteTab: (id) => set((state) => {
      // Don't delete if it's the only tab
      if (state.tabs.length <= 1) return state;
      
      const newTabs = state.tabs.filter(t => t.id !== id);
      const newActiveId = state.activeTabId === id ? newTabs[0].id : state.activeTabId;
      
      // Also remove blocks belonging to this tab
      const newBlocks = state.blocks.filter(b => b.tabId !== id);

      return {
          tabs: newTabs,
          activeTabId: newActiveId,
          blocks: newBlocks
      };
  }),

  setTabs: (tabs) => set({ tabs }),

  addBlock: (type, parentId) => set((state) => {
    const newBlock: SheetBlock = {
        id: uuidv4(),
        type,
        tabId: state.activeTabId, // Assign to current tab
        label: type === 'STAT' ? 'New Stat' : 
               type === 'RESOURCE' ? 'New Resource' : 
               type === 'SKILL' ? 'New Skill' :
               type === 'GROUP' ? 'New Group' : 
               type === 'INLINE_FIELD' ? 'Label' :
               type === 'SIMPLE_INPUT' ? 'Input' :
               type === 'CUSTOM_SKILL' ? 'Skill Name' : 
               type === 'CHARACTER_IMAGE' ? 'Character Portrait' : 
               type === 'PLAYER_NOTE' ? 'Label' : 'New Text',
        children: type === 'GROUP' ? [] : undefined,
        config: {
            color: type === 'RESOURCE' ? '#ef4444' : undefined,
            direction: 'col',
            columns: 1,
            placeholder: type === 'SIMPLE_INPUT' || type === 'PLAYER_NOTE' ? 'Placeholder...' : undefined,
            avatarShape: type === 'CHARACTER_IMAGE' ? 'square' : undefined
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
    
    // Suggest placement for Avatar: Top of list if it's the first one
    if (type === 'CHARACTER_IMAGE') {
        return { blocks: [newBlock, ...state.blocks] };
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
    // ... (Keep existing logic, dnd-kit handles sorting within the filtered list in UI, 
    // but here we operate on the full list. We rely on finding indices in the global list.
    // This works fine as long as uniqueness of IDs is preserved.)
    const activePath = findBlockPath(state.blocks, activeId);
    const overPath = findBlockPath(state.blocks, overId);

    if (!activePath || !overPath) return { blocks: state.blocks };

    // Deep clone
    const newBlocks = JSON.parse(JSON.stringify(state.blocks));
    
    // ... (rest of the logic remains same as it relies on finding by ID in the full tree)
    
    // Helper inside
    const getParentArray = (root: SheetBlock[], path: number[]) => {
        let current = root;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]].children!;
        }
        return current;
    };

    // 1. Locate and extract Active Block
    // Need to find path in newBlocks because it's a clone
    // Since we just cloned, paths are same.
    const parentListA = getParentArray(newBlocks, activePath);
    const indexA = activePath[activePath.length - 1];
    const [extractedBlock] = parentListA.splice(indexA, 1);

    // 2. Locate Over Block (after removal)
    // Re-find path because removal might have shifted indices
    const pathO = findBlockPath(newBlocks, overId);
    if (!pathO) return { blocks: state.blocks };

    const parentListO = getParentArray(newBlocks, pathO);
    const indexO = pathO[pathO.length - 1];

    parentListO.splice(indexO, 0, extractedBlock);

    return { blocks: newBlocks };
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

  moveBlockToTab: (blockId, targetTabId) => set((state) => {
      // 1. Find and extract the block from its current location
      const blockPath = findBlockPath(state.blocks, blockId);
      if (!blockPath) return { blocks: state.blocks };

      const newBlocks = JSON.parse(JSON.stringify(state.blocks));

      // Get parent array
      let current = newBlocks;
      for (let i = 0; i < blockPath.length - 1; i++) {
          current = current[blockPath[i]].children!;
      }
      const parentArray = current;
      const index = blockPath[blockPath.length - 1];

      // Extract block
      const [block] = parentArray.splice(index, 1);

      // 2. Update block's tabId
      block.tabId = targetTabId;

      // 3. If block was nested, it will now become a top-level block in the new tab
      // This is a simplification: moving to another tab puts it at the root of that tab.
      // We append it to the end of the root blocks list.
      newBlocks.push(block);

      return { blocks: newBlocks };
  }),

  duplicateBlock: (blockId, targetTabId) => set((state) => {
      const blockPath = findBlockPath(state.blocks, blockId);
      if (!blockPath) return { blocks: state.blocks };

      const newBlocks = JSON.parse(JSON.stringify(state.blocks));

      // Get parent array and original block
      // We need to traverse down to the parent of the block
      let parentArray = newBlocks;
      // If path length is 1, it's at root level. 
      // If path length > 1, we traverse to the group containing it.
      
      for (let i = 0; i < blockPath.length - 1; i++) {
          // If we are at root, parentArray is newBlocks (which is an array)
          // If we are deeper, parentArray[index] is a block, and we want its .children
          
          const currentIndex = blockPath[i];
          
          if (!parentArray[currentIndex]) {
               console.error("Block not found during traversal");
               return { blocks: state.blocks };
          }

          if (parentArray[currentIndex].children) {
              parentArray = parentArray[currentIndex].children!;
          } else {
              // Should not happen if path is correct and logic assumes structure
              console.error("Path indicates children but none found");
              return { blocks: state.blocks };
          }
      }
      
      const index = blockPath[blockPath.length - 1];
      const originalBlock = parentArray[index];
      
      if (!originalBlock) return { blocks: state.blocks };

      // Clone
      const clonedBlock = deepCloneBlock(originalBlock, targetTabId);

      if (targetTabId) {
          // Case A: Copy to another tab
          newBlocks.push(clonedBlock);
      } else {
          // Case B: Duplicate in-place (same parent)
          parentArray.splice(index + 1, 0, clonedBlock);
      }

      return { blocks: newBlocks };
  }),
}));
