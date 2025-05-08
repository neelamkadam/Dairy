import React from "react";
import AppInputField from "@/components/AppInput";
import { LoginFormType } from "@/types/form-types";
import { SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { InputSchema } from "@/lib/InputSchema";
import { NavLink } from "react-router-dom";
import AppButton from "@/components/AppButton";
import { yupResolver } from "@hookform/resolvers/yup";
import { ROUTES } from "@/constatnts/routesConstants";

const Login: React.FC = () => {
  const form: UseFormReturn<LoginFormType> = useForm<LoginFormType>({
    resolver: yupResolver(InputSchema),
  });

  const {
    handleSubmit,
    formState: { errors },
  } = form;
  const onSubmit: SubmitHandler<LoginFormType> = (data) => {
    console.log(data);
    alert("Registration successful");
  };

  return (
    <div className="container flex w-full h-screen">
      <div className="leftside h-screen w-1/2 bg-[url('/Image/images.jpg')] bg-cover bg-center">
        <img
          src="/Image/signuppage.webp"
          className="w-7 h-7 mt-9 ml-9"
          alt="Logo"
        />
        <div className="h-[500px] w-[380px] text-left mt-[13%] ml-9">
          <div className="ml-2">
            <span className="text-white mt-3 ">Welcome back to</span>
            <h1 className="text-[45px] text-blue-700 font-bold">DairyTrade</h1>
            <span className="text-white">
              Your all-in-one business solution
            </span>
          </div>
        </div>
      </div>
      <div className="rightside w-1/2">
        <div className="h-[500px] w-[380px] m-auto mt-[12%]">
          <h1 className="font-bold text-[25px]">Sign in to your account</h1>
          <p className="mb-5">Enter your credentials to access your account</p>
          <form onSubmit={handleSubmit(onSubmit)}>
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
              <p className="text-red-500 text-sm mt-1">
                {errors.userId.message}
              </p>
            )}
            {/* Input for Password */}
            <AppInputField<LoginFormType>
              name="password"
              form={form}
              type="password"
              placeholder="Enter your password"
              label="Password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
            
            <AppButton
              type="submit"
              className="text-white bg-blue-500"
              label="Sign in"
            />
            <div className="text-sm text-right" style={{ marginTop: "2px" }}>
              <NavLink
                to={ROUTES.AUTH.RESET_PWD}
                className="text-[#843d3d] hover:underline text-[14px]"
                // style={{ color: "#999999" }}
              >
                Forgot Password?
              </NavLink>
            </div>
            <div className="text-center mt-4">
              <span className="text-sm font-light text-[#526279]">
                Don't have an account?{" "}
                <NavLink
                  to={ROUTES.AUTH.SIGNUP}
                  className="text-[#843d3d] font-semibold hover:underline"
                >
                  Sign up
                </NavLink>
              </span>
            </div>
            <div className="mt-18 flex justify-between">
              <NavLink to="#" className="text-sm font-light text-[#526279]">
                Terms of Service{" "}
              </NavLink>
              <NavLink to="#" className="text-sm font-light text-[#526279]">
                Privacy Policy
              </NavLink>
              <NavLink to="#" className="text-sm font-light text-[#526279]">
                Help Center{" "}
              </NavLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
