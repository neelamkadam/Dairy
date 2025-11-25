
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface Entry {
  id: number;
  date: string;
  shift: string;
  vlc_id: string;
  vlc_name: string;
  weight: number;
  fat: number;
  snf: number;
  clr: number;
}

interface LastEntryDetailsProps {
  entries?: Entry[];
}

const LastEntryDetails = ({ entries = [] }: LastEntryDetailsProps) => {
  const { t } = useTranslation();

  return (
    <Card className="w-full shadow-lg border-0 bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-800 text-left">
          {t('last_entry_details')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length > 0 ? (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="border-b pb-4 last:border-b-0">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('vlc_id')}:</span>
                    <span className="text-sm font-medium text-gray-800">{entry.vlc_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('vlc_name')}:</span>
                    <span className="text-sm font-medium text-gray-800">{entry.vlc_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('weight')}:</span>
                    <span className="text-sm font-medium text-gray-800">{entry.weight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('fat')}:</span>
                    <span className="text-sm font-medium text-gray-800">{entry.fat}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('snf')}:</span>
                    <span className="text-sm font-medium text-gray-800">{entry.snf}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('clr')}:</span>
                    <span className="text-sm font-medium text-gray-800">{entry.clr}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            No entries found for selected date and shift
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export type { Entry };

export default LastEntryDetails;