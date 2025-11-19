export const Validator = {
  validateRequired: (value: string, label: string) => {
    if (!value || value.trim() === '') {
      return { isValid: false, error: `${label} is required` };
    }
    return { isValid: true };
  },

  validateMobile: (mobile: string) => {
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      return { isValid: false, error: 'Mobile number must be 10 digits' };
    }
    if (!/^[6-9]/.test(cleaned)) {
      return { isValid: false, error: 'Mobile number must start with 6-9' };
    }
    return { isValid: true };
  },

  validateEmail: (email: string) => {
    if (!email) return { isValid: true }; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
    return { isValid: true };
  },

  formatMobile: (mobile: string) => {
    return mobile.replace(/\D/g, '').slice(0, 10);
  },

  validateAccountNumber: (accountNumber: string) => {
    if (!accountNumber) return { isValid: true }; // Optional
    const cleaned = accountNumber.replace(/\D/g, '');
    if (cleaned.length < 9 || cleaned.length > 18) {
      return { isValid: false, error: 'Account number must be 9-18 digits' };
    }
    return { isValid: true };
  },

  validateIFSC: (ifsc: string) => {
    if (!ifsc) return { isValid: true }; // Optional
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc)) {
      return { isValid: false, error: 'Invalid IFSC code format' };
    }
    return { isValid: true };
  },

  formatPanCard: (pan: string) => {
    return pan.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  }
};
