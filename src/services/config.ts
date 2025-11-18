export const CURRENT_ENVIRONMENT: string = "development";
type VariableType = {
  API_BASE: string;
};

type ConfigType = {
  [key: string]: VariableType;
};

// const BASE_URL = typeof window !== "undefined" ? window?.location?.origin : "";
const API_BASE_URL = "https://api.neodairysales.com/";
// const LOCAL_ENV = "http://13.51.72.110:3004/";

const CONFIG: ConfigType = {
  test: {
    API_BASE: API_BASE_URL,
  },
  development: {
    API_BASE: "https://api.neodairysales.com",
  },
  production: {
    API_BASE: API_BASE_URL,
  },
};
export const ENV_VARIABLES = CONFIG[CURRENT_ENVIRONMENT];
