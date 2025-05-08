import { createSlice } from "@reduxjs/toolkit";
import { registerUserData } from "../types/response.types";

export interface NavStateType {
  registerUserData: registerUserData;
}

const initialState: NavStateType = {
  registerUserData: {
    name: "",
    email: "",
    timezone: "",
    password: "",
    referralCode: "",
    role: "",
    privatePracticeName: "",
    registeredMedicalID: "",
    organizationName: "",
    companyRegistrationID: "",
  },
};

export const registerUserSlice = createSlice({
  name: "registerUserSlice",
  initialState,
  reducers: {
    resetRegisterDataSlice: () => initialState,
    setRegisterUserData: (state, action) => {
      state.registerUserData = {
        ...state.registerUserData,
        ...action.payload,
      };
    },
  },
});

// Action creators are generated for each case reducer function
export const { resetRegisterDataSlice, setRegisterUserData } =
  registerUserSlice.actions;

export default registerUserSlice.reducer;
