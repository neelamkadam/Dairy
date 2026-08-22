import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import AppButton from "@/components/AppButton";
import AppInputField from "@/components/AppInput";
import { ROUTES } from "@/constatnts/routesConstants";
import { SignupInputSchema } from "@/lib/InputSchema";
import { SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { NavLink, useNavigate } from "react-router-dom";
import { SignUpFormType } from "@/types/form-types";
import { yupResolver } from "@hookform/resolvers/yup";
import NeoDairyLogo from "@/assets/NeoDairy_Logo.png";

const SignUp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const form: UseFormReturn<SignUpFormType> = useForm<SignUpFormType>({
    resolver: yupResolver(SignupInputSchema),
    defaultValues: {
      diaryName: "",
      fullName: "",
      pincode: "",
      villageName: "",
      talukaName: "",
      state: "",
      mobileNumber: "",
      enterOtp: "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit: SubmitHandler<SignUpFormType> = (data) => {
    console.log(data);
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
        setIsLoading(false);
        navigate(ROUTES.DASHBOARD);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero section (Same as Login) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-0 right-0 h-24 md:h-32 bg-gray-800 opacity-20"></div>
          <div className="absolute bottom-12 md:bottom-16 left-0 right-0 h-1 bg-yellow-400 opacity-40"></div>
          <div className="absolute bottom-16 md:bottom-20 left-8 md:left-12 text-5xl md:text-7xl opacity-80">🏭</div>
          <div className="absolute bottom-16 md:bottom-20 left-1/2 animate-[slide_8s_linear_infinite]">
            <div className="text-4xl md:text-6xl">🚜</div>
          </div>
          <div className="absolute top-16 md:top-20 left-16 md:left-20 text-2xl md:text-3xl animate-[float_3s_ease-in-out_infinite]">🥛</div>
          <div className="absolute top-32 md:top-40 right-24 md:right-32 text-xl md:text-2xl animate-[float_4s_ease-in-out_infinite_0.5s]">🥛</div>
          <div className="absolute top-48 md:top-60 left-32 md:left-40 text-2xl md:text-3xl animate-[float_3.5s_ease-in-out_infinite_1s]">🥛</div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center p-6 xl:p-12 pb-24 xl:pb-32 text-white w-full h-full">
          <div className="space-y-3 xl:space-y-4 text-center bg-black/20 backdrop-blur-sm rounded-3xl p-6 xl:p-8 max-w-lg">
            <img 
              src={NeoDairyLogo} 
              alt="Neo Dairy Logo" 
              className="w-20 xl:w-24 h-auto mx-auto mb-4 bg-white rounded-2xl p-2"
            />
            <div>
              <h1 className="text-2xl xl:text-4xl font-bold mb-2 leading-tight">{t("neo_dairy_sales_and_services", "Neo Dairy Sales and Services")}</h1>
              <p className="text-base xl:text-lg text-green-100">{t("pvt_ltd", "Pvt Ltd.")}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm xl:text-base text-green-50">{t("empowering_dairy_with_technology", "Empowering Dairy with Technology")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - SignUp form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-gray-50 p-6 md:p-8 overflow-y-auto max-h-screen">
        <div className="w-full max-w-xl my-auto py-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-2xl font-bold text-blue-600">{t("neo_dairy_sales_and_services", "Neo Dairy Sales and Services")}</h2>
            <p className="text-sm text-gray-600">{t("pvt_ltd", "Pvt Ltd.")}</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">{t("create_account", "Create Account")}</h2>
              <p className="text-gray-600 mt-2">{t("start_digital_dairy_experience", "Start your digital dairy experience today")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <AppInputField<SignUpFormType>
                name="diaryName"
                form={form}
                type="text"
                placeholder={t("enter_dairy_name", "Enter your dairy's name")}
                label={t("dairy_name", "Dairy Name")}
              />
              <AppInputField<SignUpFormType>
                name="fullName"
                form={form}
                type="text"
                placeholder={t("enter_full_name", "Enter your full name")}
                label={t("owner_name", "Owner Name")}
              />
              
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">{t("location_details", "Location Details")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <AppInputField<SignUpFormType>
                    name="pincode"
                    form={form}
                    type="number"
                    placeholder={t("pincode", "Pincode")}
                    label={t("pincode", "Pincode")}
                  />
                  <AppInputField<SignUpFormType>
                    name="villageName"
                    form={form}
                    type="text"
                    placeholder={t("village", "Village")}
                    label={t("village_name", "Village Name")}
                  />
                  <AppInputField<SignUpFormType>
                    name="talukaName"
                    form={form}
                    type="text"
                    placeholder={t("taluka", "Taluka")}
                    label={t("taluka_name", "Taluka Name")}
                  />
                  <AppInputField<SignUpFormType>
                    name="state"
                    form={form}
                    type="text"
                    placeholder={t("state", "State")}
                    label={t("state", "State")}
                  />
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">{t("mobile_verification", "Mobile Verification")}</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <AppInputField<SignUpFormType>
                      name="mobileNumber"
                      form={form}
                      type="number"
                      placeholder={t("mobile_number_placeholder", "Mobile number")}
                      label={t("mobile_number", "Mobile Number")}
                    />
                  </div>
                  <AppButton
                    type="button"
                    className="h-[46px] w-[100px] text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md font-semibold transition-colors"
                    label={t("send_otp", "Send OTP")}
                  />
                </div>
                <div className="flex gap-4 items-end mt-4">
                  <div className="flex-1">
                    <AppInputField<SignUpFormType>
                      name="enterOtp"
                      form={form}
                      type="number"
                      placeholder={t("enter_otp", "Enter OTP")}
                      label={t("otp", "OTP")}
                    />
                  </div>
                  <AppButton
                    type="button"
                    className="h-[46px] w-[100px] text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold transition-colors"
                    label={t("verify", "Verify")}
                  />
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">{t("security", "Security")}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <AppInputField<SignUpFormType>
                    name="password"
                    form={form}
                    type="password"
                    placeholder={t("create_password", "Create password")}
                    label={t("password", "Password")}
                  />
                  <AppInputField<SignUpFormType>
                    name="confirmPassword"
                    form={form}
                    type="password"
                    placeholder={t("repeat_password", "Repeat password")}
                    label={t("repeat_password_label", "Repeat Password")}
                  />
                </div>
              </div>

              <AppButton
                type="submit"
                className="w-full text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded-md font-semibold transition-colors shadow-sm mt-6"
                label={t("create_account", "Create Account")}
                isLoading={isLoading}
              />
              
              <div className="text-center mt-6">
                <span className="text-sm text-gray-500">
                  {t("already_have_an_account", "Already have an account?")}{" "}
                  <NavLink
                    to={ROUTES.AUTH.LOGIN}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    {t("sign_in_link", "Sign in")}
                  </NavLink>
                </span>
              </div>
            </form>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-6">
            {t("copyright_notice", "© {{year}} Neo Dairy Sales and Services Pvt Ltd. All rights reserved.", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
