import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Theme {
  theme: "dark" | "light";
}

const initialState: Theme = {
  theme: "light",
};

export const themeSlice = createSlice({
  name: "themeSlice",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<"dark" | "light">) => {
      state.theme = action.payload;
    },
    resetTheme: (state) => {
      state.theme = "light";
    },
  },
});

// Action creators are generated for each case reducer function
export const { setTheme, resetTheme } = themeSlice.actions;

export default themeSlice.reducer;
