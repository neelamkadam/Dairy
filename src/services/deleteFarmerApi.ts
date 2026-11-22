import { ENV_VARIABLES } from './config';
import { authFetch } from './sessionGuard';

const BASE_URL = ENV_VARIABLES.API_BASE;

export interface DeleteFarmerResponse {
  success: boolean;
  message: string;
  deleted_collections?: number;
}

export const deleteFarmerApi = {
  deleteFarmer: async (dairy_id: string, farmer_id: string): Promise<DeleteFarmerResponse> => {
    try {
      console.log('ðŸ“ž Delete Farmer API Request:', {
        url: `${BASE_URL}/auth/delete-farmer`,
        method: 'POST',
        body: { dairy_id, farmer_id }
      });
      
      const response = await authFetch(`${BASE_URL}/auth/delete-farmer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dairy_id,
          farmer_id,
        }),
      });

      console.log('ðŸ“ž Delete Farmer API Response Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('âŒ Delete Farmer API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('âœ… Delete Farmer API Success Response:', data);
      return data;
    } catch (error) {
      console.error('âŒ Delete farmer API error:', error);
      return { success: false, message: 'Failed to delete farmer' };
    }
  },
};
