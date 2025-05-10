import AppButton from "@/components/AppButton";
import AppInputField from "@/components/AppInput";
import { ROUTES } from "@/constatnts/routesConstants";
import { SignupInputSchema } from "@/lib/InputSchema";
import { SubmitHandler, useForm, UseFormReturn } from "react-hook-form";
import { NavLink, useNavigate } from "react-router-dom";
import { SignUpFormType } from "@/types/form-types";
import { yupResolver } from "@hookform/resolvers/yup";

const SignUp = () => {
  const navigate = useNavigate();
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
    navigate(ROUTES.DASHBOARD);
  };
  return (
    <>
      <div className="grid lg:grid-cols-2 w-full h-screen">
        {/* left div */}
        <div className="h-screen hidden lg:block bg-gray-200 text-left">
          <div className="mt-8 ml-8">
            <img
              src="/Image/notebookImg.jpg"
              alt="Logo"
              className="w-6 h-6 mb-3"
            />
            <h1 className="text-[25px] font-bold">Digital Diary</h1>
            <p>Document your journey, one page at a time</p>
          </div>
          <img
            src="/Image/notebookImg.jpg"
            alt="Image"
            className="mt-10 ml-9 xl:w-[650px] xl:h-[350px] lg:h-[250px] lg:w-[450px] rounded-xl"
          />
          <div className="shadow-lg rounded-xl p-3 bg-white max-w-md h-[120px] w-[350px] ml-8 mt-5 ">
            <p className="text-gray-700 italic mb-2">
              "The perfect way to preserve your daily memories and thoughts in a
              secure digital space."
            </p>
            <div className="flex items-center">
              <img
                className="w-10 h-10 rounded-full"
                src="/Image/notebookImg.jpg"
                alt="User Avatar"
              />
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900">Sarah Mitchell</h3>
                <p className="text-sm text-gray-500">
                  Digital Journal Enthusiast
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 ml-8 flex text-sm gap-5 text-[#526279]">
            <NavLink to="#">Secure Storage</NavLink>
            <NavLink to="#">End-to-End Encrypted</NavLink>
          </div>
        </div>
        {/* right div */}
        <div className="w-full h-screen flex items-left justify-center m-auto">
          <div className="mt-10 w-[300px] xl:h-[700px] xl:w-[400px] lg:w-[300px] lg:h-full
          md:w-[480px] justify-items-center items-left text-left">
            <h1 className="font-bold text-[22px] text-left lg:text-left">Create Account</h1>
            <p className="mb-5 text-sm text-left">
              Start your digital journaling experience today
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full">
              {/* Input for User ID */}
              <AppInputField<SignUpFormType>
                name="diaryName"
                form={form}
                type="text"
                placeholder="Enter your diary's name"
                label="Diary Name"
                className="mb-2"
              />
              {errors.diaryName && (
                <p className="text-red-500 text-sm text-left mb-3">
                  {errors.diaryName.message}
                </p>
              )}
              {/* Input for fullName */}
              <AppInputField<SignUpFormType>
                name="fullName"
                form={form}
                type="text"
                placeholder="Enter your full name"
                label="Owner name"
                className="mb-2"
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm text-left mb-3">
                  {errors.fullName.message}
                </p>
              )}
              <h3 className="text-left w-full text-[18px] font-bold mb-2">
                Location Details
              </h3>
              <div className="grid grid-cols-2 gap-4 w-full mb-3 ">
                <div className="">
                  <AppInputField<SignUpFormType>
                    name="pincode"
                    form={form}
                    type="number"
                    placeholder="Enter pincode"
                    label="Pincode"
                    className=""
                  />
                  {errors.pincode && (
                    <p className="text-red-500 text-sm text-left ">
                      {errors.pincode.message}
                    </p>
                  )}
                </div>
                <div>
                  <AppInputField<SignUpFormType>
                    name="villageName"
                    form={form}
                    type="text"
                    placeholder="Enter village name"
                    label="Village Name"
                    className=""
                  />
                  {errors.villageName && (
                    <p className="text-red-500 text-sm text-left">
                      {errors.villageName.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full mb-3 ">
                <div>
                  <AppInputField<SignUpFormType>
                    name="talukaName"
                    form={form}
                    type="text"
                    placeholder="Enter taluka name"
                    label="Taluka Name"
                    className=""
                  />
                  {errors.talukaName && (
                    <p className="text-red-500 text-sm text-left">
                      {errors.talukaName.message}
                    </p>
                  )}
                </div>
                <div>
                  <AppInputField<SignUpFormType>
                    name="state"
                    form={form}
                    type="text"
                    placeholder="Select State"
                    label="State"
                    className=""
                  />
                  {errors.state && (
                    <p className="text-red-500 text-sm text-left">
                      {errors.state.message}
                    </p>
                  )}
                </div>
              </div>
              <h3 className="text-left w-full text-[18px] font-bold mb-2">
                Mobile Verification
              </h3>
              <div className="grid grid-cols-4 gap-4 w-full mb-3 ">
                <div className="col-start-1 col-end-4">
                  <AppInputField<SignUpFormType>
                    name="mobileNumber"
                    form={form}
                    type="number"
                    placeholder="Enter mobile number"
                    label="Mobile Number"
                    className=""
                  />
                  {errors.mobileNumber && (
                    <p className="text-red-500 text-sm text-left">
                      {errors.mobileNumber.message}
                    </p>
                  )}
                </div>
                <AppButton
                  type="submit"
                  className="w-full h-[48.28px] mt-6.5 text-left col-start-4 col-end-5 text-white bg-blue-700 rounded-md hover:bg-blue-600"
                  label="Send OTP"
                />
              </div>
              <div className="grid grid-cols-4 gap-4 w-full mb-3">
                <div className="col-start-1 col-end-4">
                  <AppInputField<SignUpFormType>
                    name="enterOtp"
                    form={form}
                    type="number"
                    placeholder="Enter OTP"
                    label="Enter OTP"
                    className=""
                  />
                  {errors.enterOtp && (
                    <p className="text-red-500 text-sm text-left">
                      {errors.enterOtp.message}
                    </p>
                  )}
                </div>
                <AppButton
                  type="submit"
                  className="w-full h-[48.28px] mt-6.5 col-start-4 col-end-5 px-3 py-3 text-white  bg-green-600 rounded-md hover:bg-blue-600"
                  label="Verify"
                />
              </div>
              <AppInputField<SignUpFormType>
                name="password"
                form={form}
                type="password"
                placeholder="Create password"
                label="Password"
                className="w-full mb-2"
              />
              {errors.password && (
                <p className="text-red-500 text-sm text-left mb-3">
                  {errors.password.message}
                </p>
              )}
              <AppInputField<SignUpFormType>
                name="confirmPassword"
                form={form}
                type="password"
                placeholder="Repeat password"
                label="Repeat Password"
                className="w-full mb-3"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm text-left mb-3">
                  {errors.confirmPassword.message}
                </p>
              )}
              <AppButton
                type="submit"
                className="w-full text-white mt-2 bg-blue-700  rounded-md hover:bg-blue-600"
                label="Create Account"
              />
              <div className="text-center mt-5">
                <span className="text-sm font-light text-[#526279]">
                  Already have an account?{" "}
                  <NavLink
                    to={ROUTES.AUTH.LOGIN}
                    className="text-blue-700 font-semibold hover:underline"
                  >
                    Sign in
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

export default SignUp;
