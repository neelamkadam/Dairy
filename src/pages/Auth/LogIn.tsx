import React from "react";
import AppInputField from "@/components/AppInput";
import { LoginFormType } from "@/types/form-types";
import { SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { InputSchema } from "@/lib/InputSchema";
import { NavLink, useNavigate } from "react-router-dom";
import AppButton from "@/components/AppButton";
import { yupResolver } from "@hookform/resolvers/yup";
import { ROUTES } from "@/constatnts/routesConstants";
import { Checkbox } from "@/components/ui/checkbox";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const form: UseFormReturn<LoginFormType> = useForm<LoginFormType>({
    resolver: yupResolver(InputSchema),
    defaultValues: { userId: "", password: "" },
  });

  const { handleSubmit,formState: { errors } } = form;

  const onSubmit: SubmitHandler<LoginFormType> = (data) => {
    console.log(data);
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <div className="grid lg:grid-cols-2 w-full h-screen ">
      {/* Left Side */}
      <div className="hidden lg:block bg-[url('/Image/images.jpg')] bg-cover bg-center">
        <img
          src="/Image/signuppage.webp"
          className="w-7 h-7 mt-9 ml-9"
          alt="Logo"
        />
        <div className="h-[500px] w-[380px] text-left mt-[13%] ml-9">
          <div className="ml-2">
            <span className="text-white mt-3">Welcome back to</span>
            <h1 className="text-[45px] text-blue-700 font-bold">DairyTrade</h1>
            <span className="text-white">
              Your all-in-one business solution
            </span>
          </div>
        </div>
      </div>
      {/* Right Side */}
      <div className="w-full h-screen flex items-left justify-center m-auto ">
        <div className="lg:w-[320px] lg:h-[500px] xl:w-[450px] xl:h-[600px] md:w-[450px] md:h-[550px] justify-items-center items-center xl:mt-8 md:mt-8 mt-6">
          <h1 className="font-bold text-[18px] lg:text-[22px] xl:text-3xl md:text-[24px] text-center w-full ">
            Sign in to your account
          </h1>
          <p className="mb-6 text-[15] xl:text-[20px] text-center w-full ">
            Enter your credentials to access your account
          </p>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="items-center w-full "
          >
            {/* Input for User ID */}
            <AppInputField<LoginFormType>
              name="userId"
              form={form}
              type="text"
              placeholder="Enter your UserID or Mobile Number"
              label="User ID"
              className=""
            />
              {errors.userId && (
              <p className="text-red-500 text-sm text-left mb-3">{errors.userId.message}</p>
            )}
            {/* Input for Password */}
            <AppInputField<LoginFormType>
              name="password"
              form={form}
              type="password"
              placeholder="Enter your password"
              label="Password"
              className=""
            />
            {errors.password && (
              <p className="text-red-500 text-sm text-left mb-3">{errors.password.message}</p>
            )}
            <div className="flex items-center mt-5  gap-2 justify-start">
              <Checkbox id="remember-me" className="border-gray-500" />
              <label
                htmlFor="remember-me"
                className="text-sm xl:text-[18px] font-medium leading-none text-gray-700"
              >
                Remember me
              </label>
            </div>
            <AppButton
              type="submit"
              className="mt-5 w-full text-white bg-blue-500 py-2 rounded-md hover:bg-blue-600"
              label="Sign in"
            />
            <div className="text-sm text-right w-full mt-0">
              <NavLink
                to={ROUTES.AUTH.RESET_PWD}
                className="text-[#843d3d] xl:text-[18px]  hover:underline text-[14px]"
              >
                Forgot Password?
              </NavLink>
            </div>
            <div className="text-center mt-4">
              <span className="text-sm font-light xl:text-[18px]  text-[#526279]">
                Don't have an account?{" "}
                <NavLink
                  to={ROUTES.AUTH.SIGNUP}
                  className="text-[#843d3d] xl:text-[18px]  font-semibold hover:underline"
                >
                  Sign up
                </NavLink>
              </span>
            </div>
            <div className="mt-10 flex justify-between xl:text-[18px]  text-sm text-[#526279] w-full">
              <NavLink to="#">Terms of Service</NavLink>
              <NavLink to="#">Privacy Policy</NavLink>
              <NavLink to="#">Help Center</NavLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
