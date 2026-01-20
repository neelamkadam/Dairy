import { api } from './config';

interface CattleFeedStock {
  id: number;
  dairy_id: string;
  stock_name: string;
  amount: number;
  stock: number;
  date: string;
}

interface FarmerPayment {
  id: number;
  date: string;
  dairy_id: string;
  farmer_id: string;
  farmer_name: string;
  payment_type: string;
  amount_taken: number;
  received: number;
  descriptions: string;
  status: number;
}

interface CattleFeedStockReportResponse {
  success: boolean;
  data: {
    cattlefeed_stock: CattleFeedStock[];
    farmer_payments: FarmerPayment[];
  };
  message?: string;
}

export const getCattleFeedStockReport = async (
  dairy_id: string,
  start_date: string,
  end_date: string
): Promise<CattleFeedStockReportResponse> => {
  const response = await api.get('/web/cattlefeed-stock/report', {
    params: { dairy_id, start_date, end_date }
  });
  return response.data;
};
