const BASE_URL = 'https://api.neodairysales.com';

export interface PasswordResponse {
  success: boolean;
  message: string;
}

export const passwordApiService = {
  checkPassword: async (vlc: string): Promise<{ success: boolean; hasPassword: boolean; password?: string }> => {
    try {
      const response = await fetch(`${BASE_URL}/web/settings/check-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vlc }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.log('Check password error:', error);
      return { success: false, hasPassword: false };
    }
  },

  createPassword: async (vlc: string, password: string): Promise<PasswordResponse> => {
    try {
      const response = await fetch(`${BASE_URL}/web/settings/create-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vlc,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create password error:', error);
      return { success: false, message: 'Failed to create password' };
    }
  },

  updatePassword: async (vlc: string, password: string): Promise<PasswordResponse> => {
    try {
      const response = await fetch(`${BASE_URL}/web/settings/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vlc,
          password,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, message: 'Failed to update password' };
    }
  },
};
