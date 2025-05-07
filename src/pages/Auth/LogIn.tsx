import React from "react";
import AppInputField from "@/components/AppInput";
import { LoginFormType } from "@/types/form-types";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { InputSchema } from "@/lib/InputSchema";
import { NavLink } from "react-router-dom";
import { ROUTES } from "@/constatnts/routesConstants";
import AppButton from "@/components/AppButton";

const Login: React.FC = () => {
  const form = useForm<LoginFormType>({
    resolver: yupResolver(InputSchema),
  });
  const onSubmit: SubmitHandler<FormData> = (data) => {
    console.log(data);
    alert("Registration successfull");
  };
  return (
    <>
      <div className="container flex w-[100%] h-screen">
        <div className="leftside w-[50%] ">
          <img src="/Image/images.jpg" alt="SignUp" className="h-screen" />
        </div>
        <div className="rightside w-[50%]">
          <div className=" h-[500px] w-[450px] m-auto mt-25">
            <h1 className="font-bold">Sign in to your account</h1>
            <p>Enter your credentials to access your account</p>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <AppInputField<LoginFormType>
                name="userId"
                form={form}
                type="text"
                placeholder="Enter your UserID or Mobile Number"
                label="User ID"
              />
              <AppInputField<LoginFormType>
                name="password"
                form={form}
                type="password"
                placeholder="Enter your password"
                label="Password"
              />
              <AppButton
                type="submit"
                className="text-white bg-blue-500 "
                label="Log In"
              />
              <div className="text-center mt-4">
                <span className="text-sm font-light text-[#526279]">
                  Don't have an account?{" "}
                  <NavLink
                    to={ROUTES.SIGNUP}
                    className="text-[#394557] font-semibold hover:underline"
                  >
                    Sign up
                  </NavLink>
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
