import axios from 'axios';

const API_BASE_URL = 'https://stock.indianapi.in';
const API_KEY = import.meta.env.VITE_STOCK_API_KEY;

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    /* 
       If the API requires an API key in headers, uncomment below:
       headers: {
         'X-Api-Key': API_KEY 
       }
    */
});

// Interceptor to inject API key into query params and headers if needed
apiClient.interceptors.request.use((config) => {
    console.log("API Request to: " + config.url); // Log for debugging
    if (API_KEY && API_KEY !== 'your_api_key_here') {
        config.params = { ...config.params, key: API_KEY }; // Add key param
        config.headers = { // Add X-Api-Key header
            ...config.headers,
            'X-Api-Key': API_KEY
        };
    }
    return config;
});

// Response interceptor for better error logging
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('API Error Details:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers,
            });
        }
        return Promise.reject(error);
    }
);

export const getTrendingStocks = () => apiClient.get('/trending');
export const getStockNews = () => apiClient.get('/news');
export const getIPO = () => apiClient.get('/ipo');
export const getTopGainers = () => apiClient.get('/BSE_most_active');
export const getNSEActive = () => apiClient.get('/NSE_most_active');
export const getPriceShockers = () => apiClient.get('/price_shockers'); // Renamed from getTopLosers to match instruction
export const getMutualFunds = () => apiClient.get('/mutual_funds'); // Corrected spelling from getMutalFunds
export const getCommodities = () => apiClient.get('/commodities');
export const get52WeekHighLow = () => apiClient.get('/fetch_52_week_high_low_data'); // Renamed from get52WeekData to match instruction
export const getRecentAnnouncements = () => apiClient.get('/recent_announcements');
export const getCorporateActions = () => apiClient.get('/corporate_actions');

// Search & Specific Data Endpoints
export const searchStock = (query) => apiClient.get(`/stock?name=${query}`);
export const getStockDetails = (id) => apiClient.get(`/stock?id=${id}`); // Assuming ID or symbol based on API common patterns, or name
export const getHistoricalData = (symbol) => apiClient.get(`/historical_data?symbol=${symbol}`);
export const getStockForecasts = (symbol) => apiClient.get(`/stock_forecasts?symbol=${symbol}`);
export const getStockTargetPrice = (symbol) => apiClient.get(`/stock_target_price?symbol=${symbol}`);
export const getHistoricalStats = (symbol) => apiClient.get(`/historical_stats?symbol=${symbol}`);
export const getStatement = (symbol) => apiClient.get(`/statement?symbol=${symbol}`);

// Mutual Fund Specific
export const getMutualFundSearch = (query) => apiClient.get(`/mutual_fund_search?name=${query}`); // Renamed from searchMutualFund to match instruction
export const getMutualFundDetails = (id) => apiClient.get(`/mutual_funds_details?id=${id}`);
export const getIndustrySearch = (query) => apiClient.get(`/industry_search?name=${query}`);

export default apiClient;
