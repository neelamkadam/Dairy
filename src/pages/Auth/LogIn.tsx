import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AppInputField from "@/components/AppInput";
import { LoginFormType } from "@/types/form-types";
import { SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { InputSchema } from "@/lib/InputSchema";
import { useNavigate } from "react-router-dom";
import AppButton from "@/components/AppButton";
import { yupResolver } from "@hookform/resolvers/yup";
import { ROUTES } from "@/constatnts/routesConstants";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/services/config";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import { setAuthentication, setTempUserData } from "@/redux/AuthSlice";
import { fetchUserBranches } from "@/redux/branchSlice";
import NeoDairyLogo from "@/assets/NeoDairy_Logo.png";


const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, userRole } = useAppSelector(state => state.authData);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(userRole === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, userRole, navigate]);

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
        // Store a dummy token for admin (or generate one if needed)
        localStorage.setItem("token", "admin-token");
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
            // First time login - show set password screen (don't authenticate yet)
            dispatch(setTempUserData({
              userId: result.userId,
              name: result.name,
              email: result.email
            }));
            navigate(ROUTES.AUTH.SET_NEW_PASSWORD);
          } else {
            // Store token in localStorage if provided
            if (result.token) {
              localStorage.setItem("token", result.token);
            }
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
    <div className="min-h-screen flex">
      {/* Left side - Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {/* Road */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gray-800 opacity-20"></div>
          <div className="absolute bottom-16 left-0 right-0 h-1 bg-yellow-400 opacity-40 animate-road-line"></div>
          
          {/* Dairy building on left */}
          <div className="absolute bottom-20 left-12 text-7xl animate-pulse-slow">🏭</div>
          
          {/* Animated tractor with farmer moving right to left */}
          <div className="absolute bottom-20 animate-tractor-rtl">
            <div className="text-6xl">🚜</div>
          </div>
          
          {/* Floating milk drops */}
          <div className="absolute top-20 left-20 text-3xl animate-float-1">🥛</div>
          <div className="absolute top-40 right-32 text-2xl animate-float-2">🥛</div>
          <div className="absolute top-60 left-40 text-3xl animate-float-3">🥛</div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="space-y-8 text-center bg-black/20 backdrop-blur-sm rounded-3xl p-8">
            <img 
              src={NeoDairyLogo} 
              alt="Neo Dairy Logo" 
              className="w-32 h-auto mx-auto mb-8 bg-white rounded-2xl p-2"
            />
            <div>
              <h1 className="text-5xl font-bold mb-4">Neo Dairy Sales and Services</h1>
              <p className="text-xl text-green-100">Pvt Ltd.</p>
            </div>
            <div className="space-y-4">
              <p className="text-lg text-green-50">Empowring Dairy with Technology</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-2xl font-bold text-blue-600">Neo Dairy Sales and Services</h2>
            <p className="text-sm text-gray-600">Pvt Ltd.</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t("sign_in")}</h2>
              <p className="text-gray-600 mt-2">{t("enter_credentials")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <AppInputField<LoginFormType>
                  name="userId"
                  form={form}
                  type="text"
                  placeholder={t("user_id")}
                  label={t("E-Mail")}
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
                  <Checkbox id="remember-me" className="border-gray-300" />
                  <label 
                    htmlFor="remember-me" 
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {t("remember_me")}
                  </label>
                </div>

                <AppButton
                  type="submit"
                  className="w-full text-white bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition-colors duration-200"
                  label={t("sign_in_button")}
                />
              </form>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              © {new Date().getFullYear()} Neo Dairy Sales and Services Pvt Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
};

export default Login;