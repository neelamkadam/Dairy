import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { endOfMonth, format } from "date-fns";
import { useAppSelector } from "@/redux/store";
import { transportApi, Transport, TankerTransport } from "@/services/transportApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Droplets, IndianRupee, Loader2, Milestone, Truck } from "lucide-react";

// Collection → Tanker: the milk each transport's tanker carried. Every date + shift
// on which the VLCs of its route made a mobile dispatch entry is one trip; a trip
// opens into the VLC entries that filled it.

const ALL = "all";
const n2 = (v: number) => v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value: string) => {
  const [y, m, d] = value.split("-");
  return `${d}-${m}-${y}`;
};

// Current 10-day bill period: 1–10, 11–20, 21–end of month
const currentPeriod = () => {
  const now = new Date();
  const day = now.getDate();
  const start = new Date(now.getFullYear(), now.getMonth(), day <= 10 ? 1 : day <= 20 ? 11 : 21);
  const end = day <= 10 ? new Date(now.getFullYear(), now.getMonth(), 10)
    : day <= 20 ? new Date(now.getFullYear(), now.getMonth(), 20) : endOfMonth(now);
  return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
};

const TankerTrips = () => {
  const { t } = useTranslation();
  const { userData } = useAppSelector((state) => state.authData);
  const userId = userData?.id;

  const [transports, setTransports] = useState<Transport[]>([]);
  const [transportId, setTransportId] = useState(ALL);
  const [fromDate, setFromDate] = useState(currentPeriod().from);
  const [toDate, setToDate] = useState(currentPeriod().to);
  const [data, setData] = useState<TankerTransport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    transportApi.list(userId)
      .then((res) => setTransports(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => toast.error(t("failed_to_load_transports", "Failed to load transports")));
  }, [userId, t]);

  const handleShow = async () => {
    if (!userId) return;
    if (!fromDate || !toDate || fromDate > toDate) {
      toast.error(t("invalid_date_range", "Please select a valid date range"));
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await transportApi.tanker(userId, fromDate, toDate, transportId === ALL ? undefined : Number(transportId));
      if (res?.success) {
        setData(res.data || []);
        setExpanded(new Set());
        if (!res.data?.some((tr: TankerTransport) => tr.trips.length > 0)) {
          toast.info(t("no_tanker_trips", "No tanker trips in this period"));
        }
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("failed_fetch_report", "Failed to fetch report"));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const grand = (data || []).reduce(
    (acc, tr) => ({
      trips: acc.trips + tr.totals.trips,
      km: acc.km + tr.totals.km,
      milk: acc.milk + tr.totals.milk,
      amount: acc.amount + tr.totals.transport_amount,
    }),
    { trips: 0, km: 0, milk: 0, amount: 0 }
  );

  const tiles = [
    { label: t("trips", "Trips"), value: String(grand.trips), icon: Truck, tone: "text-blue-600 bg-blue-50" },
    { label: t("milk_in_tanker", "Milk in Tanker"), value: `${n2(grand.milk)} L`, icon: Droplets, tone: "text-sky-600 bg-sky-50" },
    { label: t("total_kms", "Total KMs"), value: n2(grand.km), icon: Milestone, tone: "text-amber-600 bg-amber-50" },
    { label: t("transport_amount", "Transport Amount"), value: `₹${n2(grand.amount)}`, icon: IndianRupee, tone: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="p-2 sm:p-4 bg-gray-50 min-h-screen">
      <div className="flex flex-col items-start text-left gap-1 px-2 mb-2">
        <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
          {t("tanker", "Tanker")}
        </h1>
        <p className="text-sm text-gray-600">
          {t("tanker_subtitle", "Milk dispatched by each route's VLCs into its transport's tanker, trip by trip")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end bg-white p-3 sm:p-4 rounded-lg shadow-sm mx-2 mb-4 text-left">
        <div>
          <Label className="mb-1">{t("transport", "Transport")}</Label>
          <Select value={transportId} onValueChange={setTransportId}>
            <SelectTrigger className="w-full h-10"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value={ALL}>{t("all_transports", "All Transports")}</SelectItem>
              {transports.map((tr) => (
                <SelectItem key={tr.id} value={String(tr.id)}>
                  {tr.name}{tr.vehicle_number ? ` · ${tr.vehicle_number}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1">{t("from_date", "From Date")}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10" />
        </div>
        <div>
          <Label className="mb-1">{t("to_date", "To Date")}</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10" />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleShow} disabled={loading} className="text-white bg-blue-600 w-[120px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("show", "Show")}
          </Button>
        </div>
      </div>

      {data && (
        <div className="mx-2 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tiles.map((tile) => (
              <Card key={tile.label} className="py-0 gap-0">
                <CardContent className="flex items-center gap-3 px-4 py-3 text-left">
                  <div className={`p-2.5 rounded-xl shrink-0 ${tile.tone}`}><tile.icon className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-5 truncate">{tile.label}</p>
                    <p className="text-lg font-bold text-gray-900 tabular-nums truncate">{tile.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.length === 0 && (
            <Card><CardContent className="py-10 text-center text-gray-500">{t("no_tanker_trips", "No tanker trips in this period")}</CardContent></Card>
          )}

          {data.map((tr) => (
            <Card key={tr.id} className="overflow-hidden py-0 gap-0">
              <div className="px-4 py-3 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-gray-900">{tr.name}</span>
                  {tr.vehicle_number && <span className="text-sm text-gray-500">· {tr.vehicle_number}</span>}
                  {tr.vehicle_capacity && <span className="text-sm text-gray-500">· {tr.vehicle_capacity}</span>}
                </div>
                <div className="text-sm text-gray-700 flex flex-wrap gap-x-4">
                  <span>{t("trips", "Trips")}: <b>{tr.totals.trips}</b></span>
                  <span>{t("milk", "Milk")}: <b>{n2(tr.totals.milk)} L</b></span>
                  <span>KM: <b>{n2(tr.totals.km)}</b></span>
                  <span>{t("amount", "Amount")}: <b>₹{n2(tr.totals.transport_amount)}</b></span>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                        <th className="px-3 py-2.5 text-left font-semibold w-8" />
                        <th className="px-3 py-2.5 text-left font-semibold">{t("date", "Date")}</th>
                        <th className="px-3 py-2.5 text-left font-semibold">{t("shift", "Shift")}</th>
                        <th className="px-3 py-2.5 text-left font-semibold">{t("route", "Route")}</th>
                        <th className="px-3 py-2.5 text-right font-semibold">VLC</th>
                        <th className="px-3 py-2.5 text-right font-semibold">{t("milk", "Milk")} (L)</th>
                        <th className="px-3 py-2.5 text-right font-semibold">{t("fat", "Fat")}</th>
                        <th className="px-3 py-2.5 text-right font-semibold">{t("snf", "SNF")}</th>
                        <th className="px-3 py-2.5 text-right font-semibold">{t("milk_amount", "Milk Amount")}</th>
                        <th className="px-3 py-2.5 text-right font-semibold">KM</th>
                        <th className="px-3 py-2.5 text-right font-semibold">{t("transport_amount", "Transport Amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tr.trips.length === 0 && (
                        <tr><td colSpan={11} className="px-4 py-6 text-center text-gray-500">{t("no_tanker_trips", "No tanker trips in this period")}</td></tr>
                      )}
                      {tr.trips.map((trip) => {
                        const key = `${tr.id}|${trip.date}|${trip.shift}`;
                        const open = expanded.has(key);
                        return (
                          <Fragment key={key}>
                            <tr className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer" onClick={() => toggle(key)}>
                              <td className="px-3 py-2.5 text-gray-400">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(trip.date)}</td>
                              <td className="px-3 py-2.5">{trip.shift === "Morning" ? t("morning", "Morning") : t("evening", "Evening")}</td>
                              <td className="px-3 py-2.5">
                                {trip.route_name}
                                {trip.bmc_name && <span className="block text-xs text-gray-500">BMC {trip.bmc_name}</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{trip.entries.length}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{n2(trip.milk)}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{trip.fat.toFixed(2)}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{trip.snf.toFixed(2)}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{n2(trip.milk_amount)}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{n2(trip.km)}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{n2(trip.transport_amount)}</td>
                            </tr>
                            {open && trip.entries.map((e) => (
                              <tr key={e.id} className="bg-gray-50/70 text-xs text-gray-600">
                                <td />
                                <td className="px-3 py-1.5" colSpan={3}>
                                  <span className="text-gray-400 mr-1">↳</span>{e.vlc_name} <span className="text-gray-400">({e.dairy_id})</span>
                                  {e.milk_type && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{e.milk_type}</span>}
                                </td>
                                <td />
                                <td className="px-3 py-1.5 text-right tabular-nums">{n2(e.quantity)}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{e.fat.toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{e.snf.toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{n2(e.amount)}</td>
                                <td colSpan={2} />
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TankerTrips;
