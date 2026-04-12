import React from 'react';
import { useStore } from '../../store/useStore';
import { User } from 'lucide-react';

interface CharacterAvatarProps {
    characterId?: number;
    initialImageUrl?: string;
    name?: string;
    className?: string;
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ 
    characterId, 
    initialImageUrl, 
    name, 
    className = "w-10 h-10 rounded-full" 
}) => {
    const myCharacters = useStore(state => state.myCharacters);
    
    // Check if this character is mine and has an updated image in the store
    // Only check if characterId is provided
    const myChar = characterId ? myCharacters.find(c => c.id === characterId) : null;
    
    // Use the store image if available (it's my character and I might have updated it)
    // Otherwise use the initialImageUrl passed from props (e.g. from Lobby data for other players)
    const imageUrl = myChar?.image_url || initialImageUrl;

    if (imageUrl) {
        return (
            <img 
                src={imageUrl} 
                alt={name || "Character Avatar"} 
                className={`${className} object-cover`} 
                onError={(e) => {
                    // Fallback on error
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
            />
        );
    }
    
    return (
        <div className={`${className} bg-gray-700 flex items-center justify-center text-gray-400 overflow-hidden`}>
             <User size={20} />
        </div>
    );
};
