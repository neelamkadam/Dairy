import AxiosClient from "./interceptor";

export type VLCMilkType = 'Cow' | 'Buffalo' | 'Both';

// Step 1 of VLC collection: weight recorded against a serial sample ID.
// The analyser step later finalizes it into a regular VLC entry (FAT/SNF/rate).
export interface VLCWeightRecord {
  id: number;
  date: string;
  shift: string;
  vlc_id: string;
  vlc_name: string;
  type: VLCMilkType;
  weight: number;
  sample_id: number | string;
  is_completed?: boolean | number;
  vlc_entry_id?: number | null;
}

export interface VLCWeightPayload {
  date: string; // yyyy-MM-dd
  shift: 'Morning' | 'Evening';
  vlc_id: string;
  vlc_name: string;
  type: VLCMilkType;
  weight: number;
  // Every VLC the sample serial runs across; the server allocates sample_id as MAX + 1 over these
  vlc_ids: string[];
}

export const isWeightCompleted = (record: VLCWeightRecord) => Number(record.is_completed) === 1;

export const vlcCollectionApi = {
  createWeight: async (payload: VLCWeightPayload) => {
    const response = await AxiosClient.post('/api/web/collection/vlc-weight-entry', payload);
    return response.data;
  },

  getWeights: async (payload: { vlc_ids: string[]; date: string; shift: 'Morning' | 'Evening' }) => {
    const response = await AxiosClient.post('/api/web/collection/vlc-weight-entries', payload);
    return response.data;
  },

  // Finalized VLC entries (weight + FAT/SNF) for a date + shift across the given VLCs.
  getEntries: async (payload: { vlc_ids: string[]; date: string; shift: 'Morning' | 'Evening' }) => {
    const response = await AxiosClient.post('/api/web/collection/vlc-entries', payload);
    return response.data;
  },

  // Fix a weighed sample that has not been analysed yet (409 once it has).
  updateWeight: async (id: number, payload: { type?: VLCMilkType; weight?: number }) => {
    const response = await AxiosClient.put(`/api/web/collection/vlc-weight-entry/${id}`, payload);
    return response.data;
  },

  // Update a finalized VLC entry; only the fields sent are changed.
  updateEntry: async (id: number, payload: Record<string, unknown>) => {
    const response = await AxiosClient.put(`/api/web/collection/vlc-entry/${id}`, payload);
    return response.data;
  },

  deleteWeight: async (id: number) => {
    const response = await AxiosClient.delete(`/api/web/collection/vlc-weight-entry/${id}`);
    return response.data;
  }
};
