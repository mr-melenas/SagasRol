import { create } from 'zustand';
import { User, Character, Campaign } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  campaigns: Campaign[];
  currentCharacter: Character | null;
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCampaigns: (campaigns: Campaign[]) => void;
  setCurrentCharacter: (character: Character | null) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  campaigns: [],
  currentCharacter: null,

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
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, campaigns: [], currentCharacter: null });
  },
}));
