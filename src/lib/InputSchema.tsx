import * as Yup from 'yup';

export const InputSchema =Yup.object().shape({
    userId:Yup.string().min(2).max(20).required("userId is required"),
    password:Yup.string().max(4).required("password is required"),
});
