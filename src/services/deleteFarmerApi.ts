const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface DeleteFarmerResponse {
  success: boolean;
  message: string;
  deleted_collections?: number;
}

export const deleteFarmerApi = {
  deleteFarmer: async (dairy_id: string, farmer_id: string): Promise<DeleteFarmerResponse> => {
    try {
      console.log('📞 Delete Farmer API Request:', {
        url: `${BASE_URL}/auth/delete-farmer`,
        method: 'POST',
        body: { dairy_id, farmer_id }
      });
      
      const response = await fetch(`${BASE_URL}/auth/delete-farmer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dairy_id,
          farmer_id,
        }),
      });

      console.log('📞 Delete Farmer API Response Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Delete Farmer API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Delete Farmer API Success Response:', data);
      return data;
    } catch (error) {
      console.error('❌ Delete farmer API error:', error);
      return { success: false, message: 'Failed to delete farmer' };
    }
  },
};
