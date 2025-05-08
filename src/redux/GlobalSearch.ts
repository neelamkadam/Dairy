import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NavStateType {
  patientSearch: string;
  reportSearch: string;
}

const initialState: NavStateType = {
  patientSearch: "",
  reportSearch: "",
};

export const searchSlice = createSlice({
  name: "searchSlice",
  initialState,
  reducers: {
    resetSearchDataSlice(state) {
      state.patientSearch = "";
      state.reportSearch = "";
    },
    setPatientSearch: (state, action: PayloadAction<string>) => {
      state.patientSearch = action.payload;
    },
    setReportsSearch: (state, action: PayloadAction<string>) => {
      state.reportSearch = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { resetSearchDataSlice, setPatientSearch, setReportsSearch } =
  searchSlice.actions;

export default searchSlice.reducer;
