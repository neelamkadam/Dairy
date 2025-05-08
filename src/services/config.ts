export const CURRENT_ENVIRONMENT: string = "development";
type VariableType = {
  API_BASE: string;
};

type ConfigType = {
  [key: string]: VariableType;
};

// const BASE_URL = typeof window !== "undefined" ? window?.location?.origin : "";
const LOCAL_ENV = "https://api-stg.medistry.ai/";
// const LOCAL_ENV = "http://13.51.72.110:3004/";

const CONFIG: ConfigType = {
  test: {
    API_BASE: LOCAL_ENV,
  },
  development: {
    API_BASE: LOCAL_ENV,
  },
  production: {
    API_BASE: LOCAL_ENV,
  },
};
export const ENV_VARIABLES = CONFIG[CURRENT_ENVIRONMENT];
