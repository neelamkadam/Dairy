import { useRouteError } from "react-router-dom";
import { Phone, RefreshCw, Home, MilkOff } from "lucide-react";
import NeoDairyLogo from "@/assets/NeoDairy_Logo.png";

const DEVELOPER_PHONE = "9970610663";

const ErrorPage = () => {
  const error = useRouteError() as any;
  console.error("Application error:", error);

  const errorText =
    error?.message || error?.statusText || (error ? String(error) : "");

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100 px-4 py-10">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-indigo-100/50 blur-2xl" />

      <div className="relative w-full max-w-md animate-[fadeUp_0.5s_ease-out]">
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="rounded-3xl bg-white/90 backdrop-blur shadow-xl shadow-blue-100/60 ring-1 ring-gray-100 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />

          <div className="p-8 text-center">
            <img
              src={NeoDairyLogo}
              alt="Neo Dairy Logo"
              className="h-16 w-auto mx-auto mb-6 drop-shadow-sm"
            />

            {/* Friendly icon */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
              <MilkOff className="h-8 w-8 text-amber-500" strokeWidth={1.75} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-sm leading-relaxed text-gray-500">
              Don't worry — your data is completely safe.
              <br />
              Please refresh the page and try again.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              काळजी करू नका — तुमचा डेटा पूर्णपणे सुरक्षित आहे.
              <br />
              कृपया पेज रिफ्रेश करून पुन्हा प्रयत्न करा.
            </p>

            {/* Actions */}
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </button>
            </div>
          </div>

          {/* Developer contact strip */}
          <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50/80 to-sky-50/80 px-8 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">
              Still facing the issue? · अजूनही समस्या येत आहे?
            </p>
            <a
              href={`tel:${DEVELOPER_PHONE}`}
              className="group inline-flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 ring-1 ring-blue-100 shadow-sm transition-all hover:shadow-md hover:ring-blue-200"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition-transform group-hover:scale-105">
                <Phone className="h-4 w-4" />
              </span>
              <span className="text-left">
                <span className="block text-[11px] text-gray-400 leading-none mb-0.5">
                  Call Developer
                </span>
                <span className="block text-base font-bold text-blue-700 leading-none tracking-wide">
                  {DEVELOPER_PHONE}
                </span>
              </span>
            </a>
          </div>
        </div>

        {/* Collapsed technical details — for the developer, hidden from normal view */}
        {errorText && (
          <details className="mt-4 text-center">
            <summary className="cursor-pointer text-[11px] text-gray-300 hover:text-gray-400 select-none list-none">
              technical details
            </summary>
            <p className="mt-2 mx-auto max-w-full overflow-x-auto rounded-lg bg-gray-900 px-3 py-2 text-left text-[11px] font-mono text-gray-300">
              {errorText}
            </p>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorPage;
