import React from "react";
import { useTranslation } from "react-i18next";
import AppInputField from "@/components/AppInput";
import { LoginFormType } from "@/types/form-types";
import { SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { InputSchema } from "@/lib/InputSchema";
import { NavLink, useNavigate } from "react-router-dom";
import AppButton from "@/components/AppButton";
import { yupResolver } from "@hookform/resolvers/yup";
import { ROUTES } from "@/constatnts/routesConstants";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/services/config";
import { useAppDispatch } from "@/redux/store";
import { setAuthentication, setTempUserData } from "@/redux/AuthSlice";
import { fetchUserBranches } from "@/redux/branchSlice";


const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const form: UseFormReturn<LoginFormType> = useForm<LoginFormType>({
    resolver: yupResolver(InputSchema),
    defaultValues: {
      userId: "",
      password: ""
    },
  });
  // const { postData: login, isLoading } = usePostApi<AuthResponseBodyDataModel>({
  //   path: API_CONSTANTS.AUTH.LOGIN,
  // });

  const { handleSubmit, formState: { errors } } = form;

  const onSubmit: SubmitHandler<LoginFormType> = async (data) => {
    try {
      // Check for hardcoded admin credentials
      if (data.userId === "admin@gmail.com" && data.password === "admin") {
        dispatch(setAuthentication({
          isAuthenticated: true,
          userRole: "admin",
          userData: { email: data.userId, name: "Admin" }
        }));
        navigate(ROUTES.ADMIN_DASHBOARD);
      } else {
        // User login API call
        const { data: result } = await api.post("/web-users/login", {
          email: data.userId,
          password: data.password
        });

        if (result.success) {
          if (result.requirePasswordChange === true) {
            // First time login - show set password screen
            dispatch(setTempUserData({
              userId: result.userId,
              name: result.name,
              email: result.email
            }));
            navigate(ROUTES.AUTH.SET_NEW_PASSWORD);
          } else {
            // Regular login - go to dashboard
            dispatch(setAuthentication({
              isAuthenticated: true,
              userRole: "user",
              userData: {
                id: result.userId.toString(),
                name: result.name,
                email: result.email
              }
            }));
            
            // Fetch user branches after successful login
            dispatch(fetchUserBranches(result.email));
            
            navigate(ROUTES.DASHBOARD);
          }
        } else {
          console.log("Login failed:", result.message);
        }
      }
    } catch (error) {
      console.log("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-[url('/Image/images.jpg')] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 flex flex-col p-8 xl:p-12">
          <img 
            src="/Image/signuppage.webp" 
            className="w-7 h-7 xl:w-8 xl:h-8" 
            alt="Logo" 
          />
          <div className="flex-1 flex items-center">
            <div className="max-w-md">
              <span className="text-white text-lg xl:text-xl block mb-2">
                {t("welcome_back")}
              </span>
              <h1 className="text-4xl xl:text-5xl 2xl:text-6xl text-blue-700 font-bold mb-4">
                NeoDairy Sales And Services
              </h1>
              <span className="text-white text-lg xl:text-xl">
                {t("business_solution")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 lg:w-1/2 flex flex-col min-h-screen">
        {/* Mobile logo */}
        <div className="lg:hidden p-6 pb-0">
          <img 
            src="/Image/signuppage.webp" 
            className="w-8 h-8" 
            alt="Logo" 
          />
        </div>

        {/* Form container */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md space-y-6">
            {/* Mobile hero text */}
            <div className="lg:hidden text-center mb-8">
              <h2 className="text-2xl font-bold text-blue-700 mb-2">NeoDairy</h2>
              <p className="text-gray-600">{t("business_solution")}</p>
            </div>

            {/* Form header */}
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl lg:text-2xl xl:text-3xl font-bold text-gray-900">
                {t("sign_in")}
              </h1>
              <p className="mt-2 text-base lg:text-lg xl:text-xl text-gray-600">
                {t("enter_credentials")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <AppInputField<LoginFormType>
                  name="userId"
                  form={form}
                  type="text"
                  placeholder={t("user_id")}
                  label={t("user_id")}
                  className=""
                />
                {errors.userId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.userId.message}
                  </p>
                )}
              </div>

              <div>
                <AppInputField<LoginFormType>
                  name="password"
                  form={form}
                  type="password"
                  placeholder={t("password")}
                  label={t("password")}
                  className=""
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember-me" className="border-gray-500" />
                <label 
                  htmlFor="remember-me" 
                  className="text-sm lg:text-base xl:text-lg font-medium text-gray-700"
                >
                  {t("remember_me")}
                </label>
              </div>

              <AppButton
                type="submit"
                className="w-full text-white bg-blue-500 py-3 rounded-md hover:bg-blue-600 transition-colors duration-200"
                label={t("sign_in_button")}
              />

              {/* Uncomment these sections if needed */}
              {/* <div className="text-right">
                <NavLink 
                  to={ROUTES.AUTH.RESET_PWD} 
                  className="text-red-600 hover:underline text-sm lg:text-base xl:text-lg"
                >
                  {t("forgot_password")}
                </NavLink>
              </div> */}

              {/* <div className="text-center">
                <span className="text-sm lg:text-base xl:text-lg text-gray-600">
                  {t("dont_have_account")}{" "}
                  <NavLink 
                    to={ROUTES.AUTH.SIGNUP} 
                    className="text-red-600 font-semibold hover:underline"
                  >
                    {t("sign_up")}
                  </NavLink>
                </span>
              </div> */}
            </form>
          </div>
        </div>

        {/* Footer links - moved to bottom */}
        <div className="p-6 lg:p-8 pt-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm lg:text-base xl:text-lg text-gray-500 border-t pt-6">
            <NavLink 
              to="#" 
              className="hover:text-gray-700 transition-colors duration-200"
            >
              {t("terms_of_service")}
            </NavLink>
            <NavLink 
              to="#" 
              className="hover:text-gray-700 transition-colors duration-200"
            >
              {t("privacy_policy")}
            </NavLink>
            <NavLink 
              to="#" 
              className="hover:text-gray-700 transition-colors duration-200"
            >
              {t("help_center")}
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;