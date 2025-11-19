import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/services/config";

export interface CollectionData {
  dairy_id: number;
  quantity: number;
  fat: number;
  snf: number;
  amount: number;
}

export interface DashboardState {
  collections: CollectionData[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  collections: [],
  loading: false,
  error: null,
};

export const fetchCollectionsSummary = createAsyncThunk(
  'dashboard/fetchCollectionsSummary',
  async (payload: { branches: number[]; date: string; shift: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/web/dashboard/collections", payload);
      console.log('Collections API Response:', data);

      if (!data.success) {
        return rejectWithValue(data.message || 'Failed to fetch collections');
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCollectionsSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCollectionsSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.collections = action.payload;
        state.error = null;
      })
      .addCase(fetchCollectionsSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetDashboardSlice } = dashboardSlice.actions;
export default dashboardSlice.reducer;