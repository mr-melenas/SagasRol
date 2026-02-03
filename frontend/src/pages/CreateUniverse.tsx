import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

enum CreateStep {
  IDENTITY = 1,
  RULES = 2,
  ASSETS = 3
}

export const CreateUniverse: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [step, setStep] = useState<CreateStep>(CreateStep.IDENTITY);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverUrl: '',
    defaultDice: 'd20',
    tags: [] as string[]
  });
  
  // Local state for UI
  const [newTag, setNewTag] = useState('');
  const [assets, setAssets] = useState<File[]>([]);

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // For cover image
      const file = e.target.files[0];
      const data = new FormData();
      data.append('file', file);

      try {
        const token = await getToken();
        const res = await axios.post('http://localhost:8000/assets/upload', data, {
            headers: { 
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${token}` 
            }
        });
        setFormData(prev => ({ ...prev, coverUrl: res.data })); // URL relative from backend
      } catch (err) {
        console.error("Upload failed", err);
        alert("Failed to upload image");
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      
      // 1. Create Universe
      const universePayload = {
        name: formData.name,
        description: formData.description,
        cover_url: formData.coverUrl,
        tags: formData.tags,
        rules_config: {
            default_dice: formData.defaultDice
        }
      };

      const res = await axios.post('http://localhost:8000/universes/', universePayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const universeId = res.data.id;

      // 2. Upload Assets (Placeholder logic - would need bulk upload endpoint)
      // For now we just redirect
      console.log("Universe created:", universeId);
      
      navigate('/dashboard');
    } catch (err) {
      console.error("Creation failed", err);
      alert("Failed to create universe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Universe</h1>
        <div className="flex gap-2">
            <div className={`h-2 flex-1 rounded ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`h-2 flex-1 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`h-2 flex-1 rounded ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow-lg min-h-[400px]">
        {/* STEP 1: IDENTITY */}
        {step === CreateStep.IDENTITY && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 1: Identity</h2>
            
            <div>
                <label className="block font-medium mb-1">Universe Name</label>
                <input 
                    type="text" 
                    className="w-full border p-2 rounded"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Lands of Eldoria"
                />
            </div>

            <div>
                <label className="block font-medium mb-1">Synopsis</label>
                <textarea 
                    className="w-full border p-2 rounded h-32"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="A brief description of your world..."
                />
            </div>

            <div>
                <label className="block font-medium mb-1">Cover Image</label>
                <input type="file" onChange={handleFileUpload} accept="image/*" />
                {formData.coverUrl && (
                    <img src={`http://localhost:8000${formData.coverUrl}`} alt="Cover" className="mt-4 h-40 object-cover rounded" />
                )}
            </div>
          </div>
        )}

        {/* STEP 2: RULES */}
        {step === CreateStep.RULES && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 2: Core Rules</h2>
            
            <div>
                <label className="block font-medium mb-1">Default Dice</label>
                <select 
                    className="w-full border p-2 rounded"
                    value={formData.defaultDice}
                    onChange={e => setFormData({...formData, defaultDice: e.target.value})}
                >
                    <option value="d6">d6 (Standard)</option>
                    <option value="d10">d10 (Percentile-ish)</option>
                    <option value="d20">d20 (Heroic)</option>
                    <option value="d100">d100 (Detailed)</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">This can be changed during gameplay.</p>
            </div>

            <div>
                <label className="block font-medium mb-1">Tags (Genres/Themes)</label>
                <div className="flex gap-2 mb-2">
                    <input 
                        type="text" 
                        className="flex-1 border p-2 rounded"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        placeholder="Add tag (e.g. Fantasy, Horror)"
                        onKeyPress={e => e.key === 'Enter' && addTag()}
                    />
                    <button onClick={addTag} className="bg-blue-600 text-white px-4 rounded">Add</button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                    {formData.tags.map(tag => (
                        <span key={tag} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full flex items-center gap-2 border border-purple-200">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="text-red-500 font-bold hover:text-red-700">×</button>
                        </span>
                    ))}
                    {formData.tags.length === 0 && <span className="text-gray-400 italic">No tags added yet.</span>}
                </div>
            </div>
          </div>
        )}

        {/* STEP 3: ASSETS */}
        {step === CreateStep.ASSETS && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 3: Quick Assets</h2>
            <p className="text-gray-600">Upload assets to populate your world (Scenes, NPCs, Items).</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <p className="text-gray-500">Bulk upload feature coming soon...</p>
                <p className="text-sm text-gray-400 mt-2">(You can add assets later from the Universe Dashboard)</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button 
            onClick={handleBack} 
            disabled={step === 1}
            className={`px-6 py-2 rounded font-bold ${step === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
            Back
        </button>

        {step < 3 ? (
            <button 
                onClick={handleNext}
                className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700"
            >
                Next
            </button>
        ) : (
            <button 
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
            >
                {loading ? 'Creating...' : 'Finish & Create'}
            </button>
        )}
      </div>
    </div>
  );
};
