import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UniverseSettings } from '../../pages/UniverseSettings';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AssetType } from '../../types';

// Mock Modules
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

vi.mock('@clerk/clerk-react', () => ({
    useAuth: () => ({
        getToken: () => Promise.resolve('test-token'),
    }),
    useUser: () => ({
        user: { id: 'gm-123' }
    })
}));

// Mock AssetCard to isolate UniverseSettings test
vi.mock('../../components/assets/AssetCard', () => ({
    AssetCard: ({ asset }: any) => <div data-testid="asset-card">{asset.name}</div>
}));

// Mock SheetBuilder (heavy component)
vi.mock('../../components/builder/SheetBuilder', () => ({
    SheetBuilder: () => <div>SheetBuilder Mock</div>
}));

const mockUniverse = {
    id: 1,
    name: "Test Universe",
    description: "Desc",
    gm_id: "gm-123",
    isPublic: true,
    tags: []
};

const mockAssets = [
    {
        id: 1,
        name: "Scene 1",
        image_url: "url1",
        type: AssetType.SCENE,
        universe_id: 1,
        tags: []
    },
    {
        id: 2,
        name: "NPC 1",
        image_url: "url2",
        type: AssetType.NPC,
        universe_id: 1,
        tags: []
    }
];

const renderWithRouter = () => {
    return render(
        <BrowserRouter>
            <Routes>
                <Route path="/universes/:id" element={<UniverseSettings />} />
            </Routes>
        </BrowserRouter>
    );
};

describe('UniverseSettings Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default mocks
        mockedAxios.get.mockImplementation((url) => {
            if (url.includes('/universes/1/assets')) return Promise.resolve({ data: mockAssets });
            if (url.includes('/universes/1')) return Promise.resolve({ data: mockUniverse });
            if (url.includes('/sheets')) return Promise.resolve({ data: [] });
            return Promise.reject(new Error('Not found'));
        });
        
        // Mock window.confirm
        window.confirm = vi.fn(() => true);
        window.alert = vi.fn();
    });

    it('renders and switches to assets tab without crashing', async () => {
        window.history.pushState({}, 'Test Page', '/universes/1');
        renderWithRouter();

        // Wait for initial load
        await waitFor(() => expect(screen.getByText('Test Universe Settings')).toBeInTheDocument(), { timeout: 5000 });

        // Click on Assets tab
        const assetsTab = screen.getByText('assets');
        fireEvent.click(assetsTab);

        // Check if assets are rendered
        await waitFor(() => {
            expect(screen.getByText('Universe Assets')).toBeInTheDocument();
            expect(screen.getByText('SCENEs')).toBeInTheDocument();
            expect(screen.getByText('NPCs')).toBeInTheDocument();
        }, { timeout: 5000 });

        // Verify assets are displayed
        expect(screen.getByText('Scene 1')).toBeInTheDocument();
        expect(screen.getByText('NPC 1')).toBeInTheDocument();
    });

    it('handles asset upload correctly', async () => {
        window.history.pushState({}, 'Test Page', '/universes/1');
        renderWithRouter();
        
        // Go to assets tab
        await waitFor(() => screen.getByText('Test Universe Settings'), { timeout: 5000 });
        fireEvent.click(screen.getByText('assets'));

        // Mock upload endpoints
        mockedAxios.post.mockImplementation((url) => {
            if (url.includes('/upload')) return Promise.resolve({ data: 'new-image-url' });
            if (url.includes('/assets')) return Promise.resolve({ 
                data: { 
                    id: 3, 
                    name: 'New Asset', 
                    image_url: 'new-image-url', 
                    type: AssetType.SCENE, 
                    universe_id: 1,
                    tags: []
                } 
            });
            return Promise.reject(new Error('Not found'));
        });

        // Find upload input for SCENE
        const uploadSpan = screen.getByText('+ Upload SCENE');
        const uploadLabel = uploadSpan.closest('label');
        const sceneInput = uploadLabel?.querySelector('input[type="file"]');

        const file = new File(['(⌐□_□)'], 'new-asset.png', { type: 'image/png' });
        fireEvent.change(sceneInput!, { target: { files: [file] } });

        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Upload + Create
            expect(screen.getByText('New Asset')).toBeInTheDocument();
        }, { timeout: 5000 });
    });
});
