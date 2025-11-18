import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { ENV_VARIABLES } from "@/services/config";

interface Branch {
  branch_id: number;
  username: string;
  name: string;
}

export interface BranchState {
  branches: Branch[];
  loading: boolean;
  error: string | null;
}

const initialState: BranchState = {
  branches: [],
  loading: false,
  error: null,
};

export const fetchUserBranches = createAsyncThunk(
  'branch/fetchUserBranches',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${ENV_VARIABLES.API_BASE}/web/dashboard/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log('Branch API Response:', data);

      if (!data.success) {
        return rejectWithValue(data.message || 'Failed to fetch branches');
      }

      return data.branches;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const branchSlice = createSlice({
  name: "branch",
  initialState,
  reducers: {
    resetBranchSlice: () => initialState,
    setBranches: (state, action) => {
      state.branches = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = action.payload;
        state.error = null;
      })
      .addCase(fetchUserBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetBranchSlice, setBranches } = branchSlice.actions;
export default branchSlice.reducer;