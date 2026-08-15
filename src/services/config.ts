import axios from "axios";

export const CURRENT_ENVIRONMENT: string = "development";
type VariableType = {
  API_BASE: string;
};

type ConfigType = {
  [key: string]: VariableType;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const CONFIG: ConfigType = {
  test: {
    API_BASE: API_BASE_URL,
  },
  development: {
    API_BASE: API_BASE_URL,
  },
  production: {
    API_BASE: API_BASE_URL,
  },
};
export const ENV_VARIABLES = CONFIG[CURRENT_ENVIRONMENT];

export const api = axios.create({
  baseURL: ENV_VARIABLES.API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});
