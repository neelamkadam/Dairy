import { useTranslation } from "react-i18next";

const PLStatement = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">{t('coming_soon', 'Coming Soon')}</h1>
        <p className="text-xl text-gray-500">{t('pl_statement_under_development', 'P/L Statement is under development')}</p>
      </div>
    </div>
  );
};

export default PLStatement;
