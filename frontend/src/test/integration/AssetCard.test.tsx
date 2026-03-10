import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetCard } from '../../components/assets/AssetCard';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { Asset, AssetType } from '../../types';

// Mock Modules
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

vi.mock('@clerk/clerk-react', () => ({
    useAuth: () => ({
        getToken: () => Promise.resolve('test-token'),
    }),
}));

const mockAsset: Asset = {
    id: 1,
    name: "Test Asset",
    image_url: "http://example.com/image.jpg",
    type: AssetType.SCENE,
    universe_id: 1,
    tags: ["tag1"]
};

describe('AssetCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders asset image and name correctly', () => {
        render(
            <AssetCard 
                asset={mockAsset} 
                onDelete={vi.fn()} 
                onUpdate={vi.fn()} 
                isOwner={false} 
            />
        );

        expect(screen.getByRole('img')).toHaveAttribute('src', mockAsset.image_url);
        expect(screen.getByText('Test Asset')).toBeInTheDocument();
        expect(screen.getByText('tag1')).toBeInTheDocument();
    });

    it('shows delete and edit buttons only for owner', () => {
        const { rerender } = render(
            <AssetCard 
                asset={mockAsset} 
                onDelete={vi.fn()} 
                onUpdate={vi.fn()} 
                isOwner={false} 
            />
        );
        expect(screen.queryByTitle('Delete asset')).not.toBeInTheDocument();

        rerender(
            <AssetCard 
                asset={mockAsset} 
                onDelete={vi.fn()} 
                onUpdate={vi.fn()} 
                isOwner={true} 
            />
        );
        expect(screen.getByTitle('Delete asset')).toBeInTheDocument();
    });

    it('handles delete confirmation and API call', async () => {
        const handleDelete = vi.fn();
        mockedAxios.delete.mockResolvedValue({});

        render(
            <AssetCard 
                asset={mockAsset} 
                onDelete={handleDelete} 
                onUpdate={vi.fn()} 
                isOwner={true} 
            />
        );

        // Click delete icon
        fireEvent.click(screen.getByTitle('Delete asset'));
        
        // Check for confirmation text
        expect(screen.getByText('Delete this asset?')).toBeInTheDocument();

        // Click confirm
        fireEvent.click(screen.getByText('Delete', { selector: 'button' }));

        await waitFor(() => {
            expect(mockedAxios.delete).toHaveBeenCalledWith(`http://localhost:8000/assets/${mockAsset.id}`, expect.any(Object));
            expect(handleDelete).toHaveBeenCalledWith(mockAsset.id);
        });
    });

    it('handles edit mode and API call', async () => {
        const handleUpdate = vi.fn();
        const updatedAsset = { ...mockAsset, name: "New Name" };
        mockedAxios.patch.mockResolvedValue({ data: updatedAsset });

        const { container } = render(
            <AssetCard 
                asset={mockAsset} 
                onDelete={vi.fn()} 
                onUpdate={handleUpdate} 
                isOwner={true} 
            />
        );

        // Enter edit mode
        fireEvent.click(screen.getByTitle('Edit details'));
        
        // Change name
        const input = screen.getByDisplayValue('Test Asset');
        fireEvent.change(input, { target: { value: 'New Name' } });
        
        // Save (Find the green check button by class since it has no text)
        // Note: Tailwind classes might be parsed differently, so finding by SVG or class structure is safer
        // Or better yet, we can add aria-labels to buttons in the component for accessibility and testing
        const saveButton = container.querySelector('button.text-green-600');
        fireEvent.click(saveButton!);

        await waitFor(() => {
            expect(mockedAxios.patch).toHaveBeenCalledWith(
                `http://localhost:8000/assets/${mockAsset.id}`, 
                expect.objectContaining({ name: "New Name" }),
                expect.any(Object)
            );
            expect(handleUpdate).toHaveBeenCalledWith(updatedAsset);
        });
    });
});
