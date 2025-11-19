import * as Yup from "yup";

export const InputSchema = Yup.object().shape({
  userId: Yup.string().min(2).required("userId is required"),
  password: Yup.string().min(4).max(6).required("password is required"),
});

export const SignupInputSchema = Yup.object().shape({
  diaryName: Yup.string()
    .min(2, "Diary name must be at least 2 characters")
    .max(15, "Diary name cannot exceed 15 characters")
    .required("Diary Name is required"),

  fullName: Yup.string()
    .min(2, "Full name must be at least 2 characters")
    .max(25, "Full name cannot exceed 25 characters")
    .required("Full Name is required"),

  pincode: Yup.string()
    .matches(/^\d{6}$/, "Pincode must be exactly 6 digits")
    .required("Pincode is required"),

  villageName: Yup.string()
    .min(2, "Village name must be at least 2 characters")
    .max(20, "Village name cannot exceed 20 characters")
    .required("Village name is required"),

  talukaName: Yup.string()
    .min(2, "Taluka name must be at least 2 characters")
    .max(20, "Taluka name cannot exceed 20 characters")
    .required("Taluka name is required"),

  mobileNumber: Yup.string()
    .matches(/^\d{10}$/, "Mobile number must be 10 digits")
    .required("Mobile number is required"),

  enterOtp: Yup.string()
    .matches(/^\d{4}$/, "OTP must be exactly 4 digits")
    .required("OTP is required"),
  state: Yup.string().required("OTP is required"),
  password: Yup.string()
    .min(4, "Password must be at least 4 characters")
    .max(15, "Password cannot exceed 15 characters")
    .required("Password is required"),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm Password is required"),
});
