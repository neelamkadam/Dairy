import { createSlice } from "@reduxjs/toolkit";
import { User } from "../types/response.types";

export interface NavStateType {
  userData: User;
  authToken?: string;
}

const initialState: NavStateType = {
  userData: {},
  authToken: "",
};

export const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    resetAuthSlice: () => initialState,
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setAuthToken: (state, action) => {
      state.authToken = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const { resetAuthSlice, setUserData, setAuthToken } = authSlice.actions;

export default authSlice.reducer;
