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

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const form: UseFormReturn<LoginFormType> = useForm<LoginFormType>({
    resolver: yupResolver(InputSchema),
    defaultValues: { userId: "", password: "" },
  });

  const { handleSubmit, formState: { errors } } = form;

  const onSubmit: SubmitHandler<LoginFormType> = (data) => {
    console.log(data);
    navigate(ROUTES.DASHBOARD);
  };

  return (
    <div className="grid lg:grid-cols-2 w-full h-screen ">
      <div className="hidden lg:block bg-[url('/Image/images.jpg')] bg-cover bg-center">
        <img
          src="/Image/signuppage.webp"
          className="w-7 h-7 mt-9 ml-9"
          alt="Logo"
        />
        <div className="h-[500px] w-[380px] text-left mt-[13%] ml-9">
          <div className="ml-2">
            <span className="text-white mt-3">{t("welcome_back")}</span>
            <h1 className="text-[45px] text-blue-700 font-bold">
              DairyTrade
            </h1>
            <span className="text-white">{t("business_solution")}</span>
          </div>
        </div>
      </div>
      <div className="w-full h-screen flex items-left justify-center m-auto ">
        <div className="lg:w-[320px] lg:h-[500px] xl:w-[450px] xl:h-[600px] md:w-[450px] md:h-[550px] justify-items-center items-center lg:mt-16 xl:mt-16 md:mt-15 mt-10">
          <h1 className="font-bold text-[18px] lg:text-[22px] xl:text-3xl md:text-[24px] text-center w-full ">
            {t("sign_in")}
          </h1>
          <p className="mb-6 text-[15] xl:text-[20px] text-center w-full ">
            {t("enter_credentials")}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="items-center w-full ">
            <AppInputField<LoginFormType>
              name="userId"
              form={form}
              type="text"
              placeholder={t("user_id")}
              label={t("user_id")}
              className=""
            />
            {errors.userId && (
              <p className="text-red-500 text-sm text-left mb-3">
                {errors.userId.message}
              </p>
            )}
            <AppInputField<LoginFormType>
              name="password"
              form={form}
              type="password"
              placeholder={t("password")}
              label={t("password")}
              className=""
            />
            {errors.password && (
              <p className="text-red-500 text-sm text-left mb-3">
                {errors.password.message}
              </p>
            )}
            <div className="flex items-center mt-5 gap-2 justify-start">
              <Checkbox id="remember-me" className="border-gray-500" />
              <label
                htmlFor="remember-me"
                className="text-sm xl:text-[18px] font-medium leading-none text-gray-700"
              >
                {t("remember_me")}
              </label>
            </div>
            <AppButton
              type="submit"
              className="mt-5 w-full text-white bg-blue-500 py-2 rounded-md hover:bg-blue-600"
              label={t("sign_in_button")}
            />
            <div className="text-sm text-right w-full mt-0">
              <NavLink
                to={ROUTES.AUTH.RESET_PWD}
                className="text-[#843d3d] xl:text-[18px] hover:underline text-[14px]"
              >
                {t("forgot_password")}
              </NavLink>
            </div>
            <div className="text-center mt-4">
              <span className="text-sm font-light xl:text-[18px] text-[#526279]">
                {t("dont_have_account")}{" "}
                <NavLink
                  to={ROUTES.AUTH.SIGNUP}
                  className="text-[#843d3d] xl:text-[18px] font-semibold hover:underline"
                >
                  {t("sign_up")}
                </NavLink>
              </span>
            </div>
            <div className="mt-10 flex justify-between xl:text-[18px] text-sm text-[#526279] w-full">
              <NavLink to="#">{t("terms_of_service")}</NavLink>
              <NavLink to="#">{t("privacy_policy")}</NavLink>
              <NavLink to="#">{t("help_center")}</NavLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
