import { create } from 'zustand';
import { User, Character, Campaign } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  campaigns: Campaign[];
  currentCharacter: Character | null;
  myCharacters: Character[]; // Add this to track all my characters globally
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCampaigns: (campaigns: Campaign[]) => void;
  setCurrentCharacter: (character: Character | null) => void;
  setMyCharacters: (characters: Character[]) => void;
  updateCharacterAvatar: (characterId: number, imageUrl: string) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  campaigns: [],
  currentCharacter: null,
  myCharacters: [],

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },
  setCampaigns: (campaigns) => set({ campaigns }),
  setCurrentCharacter: (character) => set({ currentCharacter: character }),
  setMyCharacters: (characters) => set({ myCharacters: characters }),
  
  updateCharacterAvatar: (characterId, imageUrl) => set((state) => {
    // Update in myCharacters list
    const updatedMyCharacters = state.myCharacters.map(c => 
      c.id === characterId ? { ...c, image_url: imageUrl } : c
    );
    
    // Update currentCharacter if it matches
    const updatedCurrentCharacter = state.currentCharacter?.id === characterId 
      ? { ...state.currentCharacter, image_url: imageUrl } 
      : state.currentCharacter;

    return {
      myCharacters: updatedMyCharacters,
      currentCharacter: updatedCurrentCharacter
    };
  }),

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, campaigns: [], currentCharacter: null, myCharacters: [] });
  },
}));
