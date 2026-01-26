import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Inventory } from '../components/Inventory';
import { Character, InventoryLocation } from '../types';
import axios from 'axios';
import { useStore } from '../store/useStore';

export const CharacterSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [character, setCharacter] = useState<Character | null>(null);
  const { token } = useStore();

  const fetchCharacter = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/characters/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCharacter(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (id && token) fetchCharacter();
  }, [id, token]);

  const handleMoveItem = async (inventoryId: number, newLocation: InventoryLocation) => {
    try {
      await axios.put(`http://localhost:8000/inventory/${inventoryId}/move`, 
        { location: newLocation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh character to get updated stats and inventory
      fetchCharacter();
    } catch (err) {
      console.error("Failed to move item", err);
    }
  };

  if (!character) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex gap-6 mb-8 items-start">
        <div className="w-32 h-32 bg-gray-300 rounded-full flex-shrink-0 overflow-hidden">
          {character.image_url && <img src={character.image_url} alt={character.name} className="w-full h-full object-cover"/>}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{character.name}</h1>
          <div className="grid grid-cols-2 gap-4 mt-4 bg-white p-4 rounded shadow">
            {Object.entries(character.stats).map(([stat, val]) => (
              <div key={stat} className="flex justify-between border-b pb-1">
                <span className="capitalize text-gray-600">{stat}</span>
                <span className="font-bold">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Inventory character={character} onMoveItem={handleMoveItem} />
    </div>
  );
};
