
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";

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
  type?: string;
  sample_id?: number | string | null;
}

interface LastEntryDetailsProps {
  entries?: Entry[];
  onEdit?: (entry: Entry) => void;
  onDelete?: (id: number) => void;
  // Blind testing: identify entries by sample # only — no VLC ID, VLC name or weight.
  hideVlcDetails?: boolean;
}

const LastEntryDetails = ({ entries = [], onEdit, onDelete, hideVlcDetails = false }: LastEntryDetailsProps) => {
  const { t } = useTranslation();
  const hasSample = (entry: Entry) => entry.sample_id != null && entry.sample_id !== '';

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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{hideVlcDetails ? t('sample_id') : t('vlc_id')}:</span>
                    <div className="flex items-center gap-2 max-w-[65%]">
                      {hideVlcDetails ? (
                        <span className="text-sm font-bold text-blue-600 truncate">
                          {hasSample(entry) ? `#${entry.sample_id}` : '—'}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-800 truncate">{entry.vlc_id}</span>
                      )}
                      {(onEdit || onDelete) && (
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => onEdit(entry)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onDelete(entry.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {!hideVlcDetails && hasSample(entry) && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('sample_id')}:</span>
                      <span className="text-sm font-bold text-blue-600">#{entry.sample_id}</span>
                    </div>
                  )}
                  {!hideVlcDetails && (
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-600 flex-shrink-0">{t('vlc_name')}:</span>
                      <span className="text-sm font-medium text-gray-800 text-right break-words">{entry.vlc_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('shift')}:</span>
                    <span className="text-sm font-medium text-gray-800">{entry.shift}</span>
                  </div>
                  {!hideVlcDetails && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('weight')}:</span>
                      <span className="text-sm font-medium text-gray-800">{entry.weight} kg</span>
                    </div>
                  )}
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
                  {entry.type && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm font-medium text-gray-800">{entry.type}</span>
                    </div>
                  )}
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