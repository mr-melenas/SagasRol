import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Inventory } from '../components/Inventory';
import { Character, InventoryLocation, Universe } from '../types';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';
import { CharacterSheetView } from '../components/player/CharacterSheetView';
import { useCharacterStore } from '../store/useCharacterStore';
import { useStore } from '../store/useStore';
import { Save, Camera } from 'lucide-react';

export const CharacterSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [universe, setUniverse] = useState<Universe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { getToken } = useAuth();
  const { setValues, characterValues } = useCharacterStore();
  const { updateCharacterAvatar } = useStore();

  const fetchData = async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Character
      const charRes = await axios.get(`http://localhost:8000/characters/${id}`, { headers });
      const charData = charRes.data;
      setCharacter(charData);

      // 2. Initialize Store with Character Stats
      if (charData.stats) {
          setValues(charData.stats);
      }

      // 3. Fetch Universe if linked
      if (charData.universe_id) {
          const uniRes = await axios.get(`http://localhost:8000/universes/${charData.universe_id}`, { headers });
          setUniverse(uniRes.data);
      }

    } catch (err) {
      console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
          const token = await getToken();
          const formData = new FormData();
          formData.append('file', file);
          
          const res = await axios.post(`http://localhost:8000/characters/${id}/avatar`, formData, {
              headers: { 
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
              }
          });
          
          const newUrl = res.data.image_url;
          
          // Update local state
          setCharacter(prev => prev ? { ...prev, image_url: newUrl } : null);
          
          // Update Global Store
          if (character?.id) {
              updateCharacterAvatar(character.id, newUrl);
          }
          
      } catch (err) {
          console.error("Failed to upload avatar", err);
          alert("Failed to upload avatar");
      }
  };

  const handleSave = async () => {
      setSaving(true);
      try {
          const token = await getToken();
          await axios.put(`http://localhost:8000/characters/${id}`, 
              { stats: characterValues },
              { headers: { Authorization: `Bearer ${token}` } }
          );
          alert("Character saved successfully!");
      } catch (err) {
          console.error("Failed to save character", err);
          alert("Failed to save character");
      } finally {
          setSaving(false);
      }
  };

  const handleMoveItem = async (inventoryId: number, newLocation: InventoryLocation) => {
    try {
      const token = await getToken();
      await axios.put(`http://localhost:8000/inventory/${inventoryId}/move`, 
        { location: newLocation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh character (simple reload for now)
      fetchData();
    } catch (err) {
      console.error("Failed to move item", err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading character...</div>;
  if (!character) return <div className="p-8 text-center">Character not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex gap-6 mb-8 items-center bg-white p-6 rounded-lg shadow-sm border justify-between">
        <div className="flex gap-6 items-center">
            <div className="relative group w-24 h-24 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden border-2 border-indigo-100 cursor-pointer shadow-md">
                {character.image_url ? (
                    <img src={character.image_url} alt={character.name} className="w-full h-full object-cover"/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                )}
                
                {/* Overlay for upload */}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={24} />
                </div>

                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                />
            </div>
            <div>
            <h1 className="text-3xl font-bold text-gray-900">{character.name}</h1>
            <div className="text-sm text-gray-500 mt-1">
                {universe ? `Universe: ${universe.name}` : 'No Universe Linked'}
            </div>
            </div>
        </div>
        
        <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Character Sheet View */}
      {universe && universe.sheetTemplate ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-8">
              <div className="bg-gray-50 border-b px-6 py-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Character Stats</span>
              </div>
              <CharacterSheetView 
                  templateData={universe.sheetTemplate.structure} 
              />
          </div>
      ) : (
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mb-8 text-yellow-800">
              This character is not linked to a valid universe template, so we cannot display the formatted sheet.
              <div className="mt-4 font-mono text-xs bg-white p-2 rounded border">
                  {JSON.stringify(character.stats, null, 2)}
              </div>
          </div>
      )}

      {/* Inventory */}
      <Inventory character={character} onMoveItem={handleMoveItem} />
    </div>
  );
};
