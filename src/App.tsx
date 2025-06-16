import { RouterProvider } from "react-router-dom";
import "./App.css";
import { AppRoutes } from "./routes/AppRoutes";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ToastContainer } from "react-toastify";
import { persistor, store } from "./redux/store";

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <RouterProvider router={AppRoutes} />
        <ToastContainer />
      </PersistGate>
    </Provider>
  );
}

export default App;
