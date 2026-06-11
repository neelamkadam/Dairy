import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/services/config";

export interface CollectionData {
  dairy_id: number;
  quantity: number;
  fat: number;
  snf: number;
  amount: number;
  farmers: number;
  registered_farmers: number;
  inactive_farmers: number;
}

export interface GraphData {
  date: string;
  quantity: number;
}

export interface FarmerInfo {
  id: number;
  username: string;
  fullName: string;
  dairy_id: number;
  role: string;
  is_active: number;
}

export interface FarmersInfoData {
  dairy_id: number;
  registered_farmers: FarmerInfo[];
  inactive_farmers: FarmerInfo[];
  poured_farmers: FarmerInfo[];
  not_poured_farmers: FarmerInfo[];
}

export interface DashboardState {
  collections: CollectionData[];
  graph: GraphData[];
  farmersInfo: FarmersInfoData[];
  loading: boolean;
  farmersInfoLoading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  collections: [],
  graph: [],
  farmersInfo: [],
  loading: false,
  farmersInfoLoading: false,
  error: null,
};

export const fetchCollectionsSummary = createAsyncThunk(
  'dashboard/fetchCollectionsSummary',
  async (payload: { branches: number[]; date: string; shift: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/web/dashboard/collections", payload);

      if (!data.success) {
        return rejectWithValue(data.message || 'Failed to fetch collections');
      }

      return { collections: data.data, graph: data.graph || [] };
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const fetchFarmersInfo = createAsyncThunk(
  'dashboard/fetchFarmersInfo',
  async (payload: { branches: number[]; date: string; shift: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/web/dashboard/farmers-info", {
        params: { 
          branches: payload.branches.join(','),
          date: payload.date,
          shift: payload.shift
        }
      });

      if (!data.success) {
        return rejectWithValue(data.message || 'Failed to fetch farmers info');
      }

      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    resetDashboardSlice: () => initialState,
    clearFarmersInfo: (state) => {
      state.farmersInfo = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCollectionsSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.farmersInfo = [];
      })
      .addCase(fetchCollectionsSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.collections = action.payload.collections;
        state.graph = action.payload.graph;
        state.error = null;
      })
      .addCase(fetchCollectionsSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchFarmersInfo.pending, (state) => {
        state.farmersInfoLoading = true;
      })
      .addCase(fetchFarmersInfo.fulfilled, (state, action) => {
        state.farmersInfo = action.payload;
        state.farmersInfoLoading = false;
      })
      .addCase(fetchFarmersInfo.rejected, (state) => {
        state.farmersInfoLoading = false;
      });
  },
});

export const { resetDashboardSlice, clearFarmersInfo } = dashboardSlice.actions;
export default dashboardSlice.reducer;