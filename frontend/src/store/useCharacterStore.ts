import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CharacterStore {
  characterValues: Record<string, any>;
  updateValue: (blockId: string, value: any) => void;
  setValues: (values: Record<string, any>) => void;
  reset: () => void;
}

export const useCharacterStore = create<CharacterStore>()(
  persist(
    (set) => ({
      characterValues: {},
      updateValue: (blockId, value) => 
        set((state) => ({
          characterValues: {
            ...state.characterValues,
            [blockId]: value,
          },
        })),
      setValues: (values) => set({ characterValues: values }),
      reset: () => set({ characterValues: {} }),
    }),
    {
      name: 'character-storage',
    }
  )
);
