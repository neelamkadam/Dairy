import { createSlice } from "@reduxjs/toolkit";
import { User } from "../types/response.types";

export interface AuthStateType {
  isAuthenticated: boolean;
  userRole: "admin" | "user" | null;
  userData: User;
  tempUserData?: {
    userId: number;
    name: string;
    email: string;
  };
}

const initialState: AuthStateType = {
  isAuthenticated: false,
  userRole: null,
  userData: {},
  tempUserData: undefined,
};

export const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    resetAuthSlice: () => initialState,
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setAuthentication: (state, action) => {
      state.isAuthenticated = action.payload.isAuthenticated;
      state.userRole = action.payload.userRole;
      state.userData = action.payload.userData;
    },
    setTempUserData: (state, action) => {
      state.tempUserData = action.payload;
    },
    clearTempUserData: (state) => {
      state.tempUserData = undefined;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.userRole = null;
      state.userData = {};
      state.tempUserData = undefined;
    },
  },
});

// Action creators are generated for each case reducer function
export const { resetAuthSlice, setUserData, setAuthentication, setTempUserData, clearTempUserData, logout } = authSlice.actions;

export default authSlice.reducer;
