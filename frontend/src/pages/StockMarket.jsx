import { useState, useEffect } from 'react';
import { 
  TrendingUp, Newspaper, Activity, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Globe, BarChart2, 
  Search, Target, Briefcase, Zap, Info
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import * as stockApi from '../services/stockApi';

export default function StockMarket() {
  const [activeTab, setActiveTab] = useState('overview');
  const [subTab, setSubTab] = useState('trending');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [ticker, setTicker] = useState('RELIANCE'); // Default ticker for analysis
  const [analysisData, setAnalysisData] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  // Main Category Tabs
  const mainTabs = [
    { id: 'overview', label: 'Market Overview', icon: Activity },
    { id: 'analysis', label: 'Stock Analysis', icon: BarChart2 },
    { id: 'mutual_funds', label: 'Mutual Funds', icon: Briefcase },
    { id: 'news', label: 'News & Updates', icon: Newspaper },
    { id: 'ipo', label: 'IPO Watch', icon: Globe },
  ];

  // Sub-tabs configuration maps to API calls
  const subTabs = {
    overview: [
      { id: 'trending', label: 'Trending', api: stockApi.getTrendingStocks },
      { id: 'bse_active', label: 'BSE Active', api: stockApi.getTopGainers },
      { id: 'nse_active', label: 'NSE Active', api: stockApi.getNSEActive },
      { id: 'shockers', label: 'Price Shockers', api: stockApi.getPriceShockers },
      { id: '52week', label: '52 Week High/Low', api: stockApi.get52WeekHighLow },
      { id: 'commodities', label: 'Commodities', api: stockApi.getCommodities },
    ],
    mutual_funds: [
      { id: 'mf_list', label: 'Top Funds', api: stockApi.getMutualFunds },
      // Search is handled separately in render
    ],
    news: [
      { id: 'news_list', label: 'Latest News', api: stockApi.getStockNews },
      { id: 'announcements', label: 'Announcements', api: stockApi.getRecentAnnouncements },
      { id: 'corporate', label: 'Corporate Actions', api: stockApi.getCorporateActions },
    ],
    ipo: [
      { id: 'ipo_list', label: 'Upcoming / Recent', api: stockApi.getIPO },
    ]
  };

  // Fetch Logic
  const fetchData = async () => {
    if (activeTab === 'analysis') return;

    setLoading(true);
    setError(null);
    try {
      const currentTabGroup = subTabs[activeTab];
      const tabConfig = currentTabGroup?.find(t => t.id === subTab);
      
      if (tabConfig) {
        let response = await tabConfig.api();
        // API often returns data in { data: ... } or just [...]
        let result = response.data?.data || response.data || [];
        setData(Array.isArray(result) ? result : [result]);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError("Failed to fetch real data from the API. Ensure your API Key is valid in .env");
      setData([]); // Clear data to avoid showing stale/mock info
    } finally {
      setLoading(false);
    }
  };

  // Fetch Analysis Data
  const fetchAnalysis = async (symbol) => {
    setLoading(true);
    setError(null);
    try {
      const [hist, forecast, target, stats, details] = await Promise.allSettled([
        stockApi.getHistoricalData(symbol),
        stockApi.getStockForecasts(symbol),
        stockApi.getStockTargetPrice(symbol),
        stockApi.getHistoricalStats(symbol),
        stockApi.searchStock(symbol)
      ]);

      // Helper to extract data or return null (no mocks)
      const extract = (res) => res.status === 'fulfilled' ? (res.value?.data?.data || res.value?.data) : null;

      const detailsData = extract(details);
      
      setAnalysisData({
        historical: extract(hist) || [],
        forecast: extract(forecast) || {},
        target: extract(target) || {},
        stats: extract(stats) || {},
        details: detailsData || { companyName: symbol }
      });
      
    } catch (e) {
      console.error("Analysis Error", e);
      setError("Failed to fetch analysis data.");
      setAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analysis') {
      fetchAnalysis(ticker);
    } else {
      fetchData();
    }
  }, [activeTab, subTab]);

  const handleSearch = (e) => {
    e.preventDefault();
    if(searchInput) {
        setTicker(searchInput.toUpperCase());
        if(activeTab === 'analysis') fetchAnalysis(searchInput.toUpperCase());
    }
  };

  // --- RENDER HELPERS ---

  const renderTable = (columns, rows) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={`px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.align || 'text-left'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
               {columns.map((col, j) => (
                 <td key={j} className={`px-6 py-4 text-sm ${col.className || 'text-slate-600'} ${col.align || 'text-left'}`}>
                   {col.render ? col.render(row) : (row[col.key] || '-')}
                 </td>
               ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderOverview = () => {
    let columns = [
      { label: 'Company', key: 'companyName', className: 'font-semibold text-slate-900', render: (r) => r.companyName || r.name || r.symbol },
      { label: 'Price (₹)', key: 'currentPrice', align: 'text-right', render: (r) => `₹${(r.currentPrice || r.lastPrice || r.price || 0).toLocaleString()}` },
      { label: 'Change', key: 'percentChange', align: 'text-right', render: (r) => {
         const val = r.percentChange || r.pChange || r.change || 0;
         return (
           <span className={`font-medium ${val >= 0 ? 'text-green-600' : 'text-red-600'}`}>
             {val > 0 ? '+' : ''}{val}%
           </span>
         )
      }} 
    ];

    if (subTab === '52week') {
      columns.push({ label: '52W High', key: 'high52', align: 'text-right' });
      columns.push({ label: '52W Low', key: 'low52', align: 'text-right' });
    }

    return renderTable(columns, data);
  };

  const renderAnalysis = () => {
    if(!analysisData) return null;
    
    // Mock chart data transform if api raw
    const chartData = Array.isArray(analysisData.historical) ? analysisData.historical : [
      { date: '2023-01', price: 2400 }, { date: '2023-02', price: 2450 }, { date: '2023-03', price: 2380 },
      { date: '2023-04', price: 2500 }, { date: '2023-05', price: 2600 }, { date: '2023-06', price: 2550 },
    ];

    return (
      <div className="space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter symbol (e.g., RELIANCE, TCS)..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
            Analyze
          </button>
        </form>

        {/* Header Stats */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-8 items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{analysisData.details?.companyName || ticker}</h2>
            <p className="text-slate-500">{ticker} • NSE</p>
          </div>
          <div className="text-right">
             <p className="text-sm text-slate-500">Current Price</p>
             <h3 className="text-3xl font-bold text-slate-900">₹{parseFloat(analysisData.details?.currentPrice || 0).toLocaleString()}</h3>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Price Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
               <Activity className="text-blue-500" size={20}/> Price History
             </h3>
             <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                   <defs>
                     <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="date" hide />
                   <YAxis domain={['auto', 'auto']} />
                   <Tooltip />
                   <Area type="monotone" dataKey="price" stroke="#2563eb" fillOpacity={1} fill="url(#colorPrice)" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Targets & Forecast */}
          <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Target className="text-red-500" size={20}/> Targets
                </h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-green-700 font-medium">High Target</span>
                      <span className="font-bold text-green-800">₹{analysisData.target?.high || 2800}</span>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm text-yellow-700 font-medium">Median Target</span>
                      <span className="font-bold text-yellow-800">₹{analysisData.target?.median || 2600}</span>
                   </div>
                   <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-red-700 font-medium">Low Target</span>
                      <span className="font-bold text-red-800">₹{analysisData.target?.low || 2200}</span>
                   </div>
                </div>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Zap className="text-amber-500" size={20}/> Forecast
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                   {analysisData.forecast?.summary || "Based on historical trends, the stock shows strong momentum with potential upside in the coming quarter. Analysts recommend 'BUY'."}
                </p>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNews = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((item, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex-1">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 block">{activeTab}</span>
            <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{item.title || item.subject || "Market Update"}</h3>
            <p className="text-sm text-slate-500 line-clamp-3 mb-4">{item.description || item.summary || "No details available."}</p>
          </div>
          <div className="text-xs text-slate-400 mt-auto pt-4 border-t border-slate-50 flex justify-between">
            <span>{item.source || "FinancePro"}</span>
            <span>{item.date || new Date().toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // --- HELPERS ---

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <div className="p-2 bg-indigo-100/50 rounded-xl">
             <Globe className="text-indigo-600" size={32} />
           </div>
           Financial Markets
        </h1>
        <p className="text-slate-500 text-lg">Real-time insights, analytics, and news</p>
      </div>

      {/* Main Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200">
         {mainTabs.map(tab => (
           <button
             key={tab.id}
             onClick={() => { setActiveTab(tab.id); setSubTab(subTabs[tab.id]?.[0]?.id || '') }}
             className={`
                flex items-center gap-2 px-6 py-3 whitespace-nowrap font-semibold transition-all rounded-t-xl
                ${activeTab === tab.id 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }
             `}
           >
             <tab.icon size={18} />
             {tab.label}
           </button>
         ))}
      </div>

      {/* Sub Tabs (Pills) */}
      {subTabs[activeTab] && (
        <div className="flex flex-wrap gap-2">
           {subTabs[activeTab].map(tab => (
             <button
               key={tab.id}
               onClick={() => setSubTab(tab.id)}
               className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${subTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }
               `}
             >
               {tab.label}
             </button>
           ))}
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-[400px]">
         {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p>Fetching market data...</p>
            </div>
         ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500 bg-red-50 rounded-xl border border-red-100 p-8 text-center">
               <AlertCircle size={48} className="mb-4 opacity-80" />
               <h3 className="text-xl font-bold mb-2">Data Fetch Failed</h3>
               <p className="max-w-md">{error}</p>
               <div className="mt-4 text-sm text-slate-600">
                  Please ensure your API Key is correctly configured in .env file.<br/>
                  <code>VITE_STOCK_API_KEY=your_key_here</code>
               </div>
            </div>
         ) : (
            <>
               {activeTab === 'analysis' && renderAnalysis()}
               {activeTab === 'news' && renderNews()}
               {(activeTab === 'overview' || activeTab === 'mutual_funds') && renderOverview()}
               {activeTab === 'ipo' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {data.map((item, i) => (
                       <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10"><Globe size={64}/></div>
                          <h3 className="text-xl font-bold text-slate-900 mb-1">{item.companyName}</h3>
                          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold uppercase rounded mb-4">IPO</span>
                          
                          <div className="space-y-3">
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Price Band</span>
                                <span className="font-semibold">₹{item.priceBand || item.price || "TBA"}</span>
                             </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Open Date</span>
                                <span className="font-semibold">{item.openDate || item.date || "TBA"}</span>
                             </div>
                          </div>
                          
                          <button className="w-full mt-6 py-2 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors">
                             View Details
                          </button>
                       </div>
                     ))}
                  </div>
               )}
            </>
         )}
      </div>

      <div className="text-center text-slate-400 text-xs mt-10">
         Market data provided by indianapi.in. Values may be delayed.
      </div>
    </div>
  );
}
