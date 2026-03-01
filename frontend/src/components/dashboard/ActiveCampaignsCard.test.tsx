import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActiveCampaignsCard } from './ActiveCampaignsCard';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

// Mock Modules
vi.mock('axios', () => {
    return {
        default: {
            get: vi.fn(),
            post: vi.fn(),
        }
    };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockGetToken = vi.fn().mockResolvedValue('test-token');
vi.mock('@clerk/clerk-react', () => ({
    useAuth: () => ({
        getToken: mockGetToken,
    }),
}));

const renderWithRouter = (ui: React.ReactElement) => {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ActiveCampaignsCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset axios mock
        (axios.get as any).mockReset();
    });

    it('renders empty state correctly', async () => {
        (axios.get as any).mockResolvedValueOnce({ 
            data: { mastering: [], playing: [] } 
        });

        renderWithRouter(<ActiveCampaignsCard />);

        await waitFor(() => {
            expect(mockGetToken).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });

        expect(await screen.findByText('No active campaigns')).toBeInTheDocument();
        expect(screen.getByText('Start a new adventure or join one!')).toBeInTheDocument();
    });

    it('renders fetched campaigns with correct roles', async () => {
        (axios.get as any).mockResolvedValueOnce({
            data: {
                mastering: [
                    { id: 1, name: 'Campaign GM', universe_id: 1, gm_id: 'me', created_at: '2024-01-01' }
                ],
                playing: [
                    { id: 2, name: 'Campaign Player', universe_id: 1, gm_id: 'other', created_at: '2024-01-02' }
                ]
            }
        });

        renderWithRouter(<ActiveCampaignsCard />);

        expect(await screen.findByText('Campaign GM')).toBeInTheDocument();
        
        expect(screen.getByText('Campaign Player')).toBeInTheDocument();
        expect(screen.getByText('GM')).toBeInTheDocument();
        expect(screen.getByText('PLAYER')).toBeInTheDocument();
    });

    it('navigates to create campaign page on click', async () => {
        (axios.get as any).mockResolvedValueOnce({ data: { mastering: [], playing: [] } });
        renderWithRouter(<ActiveCampaignsCard />);

        await screen.findByText('No active campaigns');

        const createBtn = screen.getByRole('button', { name: /create/i });
        fireEvent.click(createBtn);

        expect(mockNavigate).toHaveBeenCalledWith('/campaigns', { state: { openCreate: true } });
    });

    it('opens join modal on click', async () => {
        (axios.get as any).mockResolvedValueOnce({ data: { mastering: [], playing: [] } });
        renderWithRouter(<ActiveCampaignsCard />);

        await screen.findByText('No active campaigns');

        const joinBtn = screen.getByRole('button', { name: /join/i });
        fireEvent.click(joinBtn);

        expect(await screen.findByText('Join Campaign')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('XYZ-123')).toBeInTheDocument();
    });

    it('navigates to lobby on campaign click', async () => {
        (axios.get as any).mockResolvedValueOnce({
            data: {
                mastering: [{ id: 99, name: 'Epic Quest', universe_id: 1, gm_id: 'me' }],
                playing: []
            }
        });

        renderWithRouter(<ActiveCampaignsCard />);

        const campaign = await screen.findByText('Epic Quest');
        const campaignItem = campaign.closest('div.cursor-pointer');
        fireEvent.click(campaignItem!);

        expect(mockNavigate).toHaveBeenCalledWith('/campaigns/99/lobby');
    });
});
