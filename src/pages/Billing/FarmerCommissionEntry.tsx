import React from 'react';
import { useTranslation } from 'react-i18next';

const FarmerCommissionEntry = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="md:text-2xl font-semibold text-gray-900 mb-6">
          {t('farmer_commission_entry') || 'Farmer Commission Entry'}
        </h1>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-center min-h-[400px]">
          <p className="text-gray-500 text-lg">Coming Soon...</p>
        </div>
      </div>
    </div>
  );
};

export default FarmerCommissionEntry;
