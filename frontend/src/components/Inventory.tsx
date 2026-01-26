import React from 'react';
import { Character, InventoryItem, InventoryLocation } from '../types';
import { clsx } from 'clsx';

interface InventoryProps {
  character: Character;
  onMoveItem: (inventoryId: number, newLocation: InventoryLocation) => void;
}

const InventorySection: React.FC<{
  title: string;
  items: InventoryItem[];
  location: InventoryLocation;
  onDropItem: (itemId: number) => void;
}> = ({ title, items, location, onDropItem }) => {
  return (
    <div 
      className="border p-4 rounded-lg min-h-[200px] bg-slate-50"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData('inventoryId');
        if (id) onDropItem(parseInt(id));
      }}
    >
      <h3 className="font-bold mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map((entry) => (
          <div
            key={entry.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('inventoryId', entry.id.toString())}
            className="p-2 bg-white border rounded shadow-sm cursor-move hover:bg-slate-100"
          >
            <div className="font-medium">{entry.item.name}</div>
            <div className="text-xs text-gray-500">Qty: {entry.quantity}</div>
            {entry.item.stats_modifier && (
              <div className="text-xs text-blue-600 mt-1">
                {Object.entries(entry.item.stats_modifier).map(([k, v]) => (
                  <span key={k}>{k}: {v > 0 ? '+' : ''}{v} </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Inventory: React.FC<InventoryProps> = ({ character, onMoveItem }) => {
  const equipped = character.inventory?.filter(i => i.location === InventoryLocation.EQUIPPED) || [];
  const backpack = character.inventory?.filter(i => i.location === InventoryLocation.BACKPACK) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <InventorySection 
        title="Equipped (Active Stats)" 
        items={equipped} 
        location={InventoryLocation.EQUIPPED}
        onDropItem={(id) => onMoveItem(id, InventoryLocation.EQUIPPED)}
      />
      <InventorySection 
        title="Backpack" 
        items={backpack} 
        location={InventoryLocation.BACKPACK}
        onDropItem={(id) => onMoveItem(id, InventoryLocation.BACKPACK)}
      />
    </div>
  );
};
