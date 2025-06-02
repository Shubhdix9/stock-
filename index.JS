import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'; // Import Recharts components including ReferenceLine

// --- Firebase Context ---
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loadingFirebase, setLoadingFirebase] = useState(true);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

        if (!Object.keys(firebaseConfig).length) {
          console.error("Firebase config is missing or empty. Please ensure __firebase_config is set.");
          setLoadingFirebase(false);
          return;
        }

        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authentication = getAuth(app);

        setDb(firestore);
        setAuth(authentication);

        const unsubscribe = onAuthStateChanged(authentication, async (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            // If no user, try to sign in with custom token or anonymously
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
              try {
                await signInWithCustomToken(authentication, __initial_auth_token);
                setUserId(authentication.currentUser?.uid);
              } catch (error) {
                console.error("Error signing in with custom token:", error);
                await signInAnonymously(authentication);
                setUserId(authentication.currentUser?.uid);
              }
            } else {
              await signInAnonymously(authentication);
              setUserId(authentication.currentUser?.uid);
            }
          }
          setIsAuthReady(true);
          setLoadingFirebase(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Failed to initialize Firebase:", error);
        setLoadingFirebase(false);
      }
    };

    initFirebase();
  }, []);

  return (
    <FirebaseContext.Provider value={{ db, auth, userId, isAuthReady, loadingFirebase }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// --- Custom Message Box Component ---
const MessageBox = ({ message, type, onClose }) => {
  if (!message) return null;

  const bgColor = type === 'error' ? 'bg-red-800 border-red-600 text-red-100' : 'bg-green-800 border-green-600 text-green-100';
  const textColor = type === 'error' ? 'text-red-100' : 'text-green-100';

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-md border shadow-lg ${bgColor}`} role="alert">
      <div className="flex items-center">
        <span className={`font-semibold ${textColor}`}>{message}</span>
        <button onClick={onClose} className="ml-4 text-gray-300 hover:text-gray-100 focus:outline-none">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

// --- Loading Spinner Component ---
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
  </div>
);

// --- Stock Data Simulation ---
const simulateStockData = (symbol) => {
  const data = [];
  let currentPrice = Math.random() * 1000 + 500; // Starting price between 500 and 1500
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const open = currentPrice + (Math.random() - 0.5) * 20;
    const high = Math.max(open, currentPrice + Math.random() * 30);
    const low = Math.min(open, currentPrice - Math.random() * 20);
    const close = low + (Math.random() * (high - low)); // Ensure close is between low and high
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    currentPrice = close; // Next day's price influenced by today's close

    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: volume,
    });
  }
  return data;
};

// --- Sparkline Data Generation ---
const generateSparklineData = (basePrice, numPoints = 10) => {
  const data = [];
  let price = basePrice;
  for (let i = 0; i < numPoints; i++) {
    price += (Math.random() - 0.5) * (basePrice * 0.02); // Small random fluctuation
    data.push({ value: parseFloat(price.toFixed(2)) });
  }
  return data;
};

const simulateAIPrediction = (currentPrice) => {
  // This is a highly simplified simulation.
  // In a real app, this would involve a trained ML model (e.g., LSTM, GRU)
  // making predictions based on historical data and other features.

  // Simulate momentum: strong recent trend
  const momentumScore = Math.random(); // 0 to 1, higher means stronger momentum
  let trend = 'Neutral';
  if (momentumScore > 0.7) trend = 'Upward';
  if (momentumScore < 0.3) trend = 'Downward';

  // Simulate mean reversion potential: if price is extreme, it might revert
  const reversionPotential = Math.random(); // 0 to 1, higher means more likely to revert
  if (reversionPotential > 0.8 && trend === 'Upward') trend = 'Reversing Down'; // Overbought
  if (reversionPotential > 0.8 && trend === 'Downward') trend = 'Reversing Up'; // Oversold

  const change = (Math.random() - 0.5) * currentPrice * 0.05; // +/- 5%
  const predictedPrice = currentPrice + change;
  const confidence = parseFloat((0.6 + Math.random() * 0.3).toFixed(2)); // 60-90% confidence

  return {
    predictedPrice: parseFloat(predictedPrice.toFixed(2)),
    confidence: confidence,
    trend: trend, // Can be 'Upward', 'Downward', 'Neutral', 'Reversing Up', 'Reversing Down'
  };
};

const simulateSentiment = () => {
  // This is a highly simplified simulation.
  // In a real app, this would involve NLP models analyzing news and social media.
  const sentiments = ['Positive', 'Neutral', 'Negative'];
  const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
  const score = parseFloat((Math.random() * 2 - 1).toFixed(2)); // -1 to 1
  return {
    overall: { sentiment, score },
    news: { sentiment: sentiments[Math.floor(Math.random() * sentiments.length)], score: parseFloat((Math.random() * 2 - 1).toFixed(2)) },
    socialMedia: { sentiment: sentiments[Math.floor(Math.random() * sentiments.length)], score: parseFloat((Math.random() * 2 - 1).toFixed(2)) },
  };
};

// --- Simulated Company Data ---
const simulateCompanyData = (symbol) => {
  const baseMarketCap = Math.random() * (100 - 10) + 10; // 10B to 100B
  const baseVolume = Math.floor(Math.random() * 5000000) + 1000000;

  const valuations = ['Undervalued', 'Fairly Valued', 'Overvalued'];
  const valuation = valuations[Math.floor(Math.random() * valuations.length)];

  const financialHealths = ['Strong', 'Moderate', 'Weak'];
  const financialHealth = financialHealths[Math.floor(Math.random() * financialHealths.length)];

  const newsHeadlines = [
    `${symbol} announces record Q1 earnings, beating analyst expectations.`,
    `New partnership between ${symbol} and a major tech firm boosts investor confidence.`,
    `${symbol} faces regulatory scrutiny over data privacy concerns.`,
    `Innovation in AI drives ${symbol}'s stock to new highs.`,
    `${symbol} to acquire a smaller competitor in a strategic move.`,
    `Market analysts divided on ${symbol}'s future outlook.`,
    `Supply chain disruptions impact ${symbol}'s production.`,
    `Positive analyst ratings for ${symbol} after product launch.`,
    `CEO of ${symbol} outlines ambitious growth plans.`,
    `Increased competition puts pressure on ${symbol}'s profit margins.`,
  ];

  return {
    marketCap: `${baseMarketCap.toFixed(2)}B`,
    beta: parseFloat((0.5 + Math.random() * 1.5).toFixed(2)), // 0.5 to 2.0
    peRatio: parseFloat((15 + Math.random() * 30).toFixed(2)), // 15 to 45
    eps: parseFloat((Math.random() * 5 - 2).toFixed(2)), // -2 to 3
    earningsDate: `May ${Math.floor(Math.random() * 28) + 1}, 2025`,
    forwardDividendYield: parseFloat((Math.random() * 0.05).toFixed(2)), // 0 to 5%
    exDividendDate: `Apr ${Math.floor(Math.random() * 28) + 1}, 2025`,
    oneYearTargetEst: parseFloat((Math.random() * 100 + 1000).toFixed(2)), // 1000 to 1100
    dayRange: `${(Math.random() * 20 + 500).toFixed(2)}-${(Math.random() * 20 + 520).toFixed(2)}`,
    fiftyTwoWeekRange: `${(Math.random() * 100 + 100).toFixed(2)}-${(Math.random() * 500 + 1500).toFixed(2)}`,
    volume: baseVolume.toLocaleString(),
    avgVolume: (baseVolume * (0.8 + Math.random() * 0.4)).toFixed(0).toLocaleString(), // +/- 20% of current volume
    companyOverview: `${symbol} Inc. is a leading technology company specializing in AI-powered enterprise software solutions. They provide a platform for developing and deploying AI applications across various industries, including energy, manufacturing, and government. Their innovative approach helps clients optimize operations, enhance decision-making, and drive digital transformation. Founded in 2012, ${symbol} has rapidly grown to become a key player in the artificial intelligence market, known for its robust infrastructure and cutting-edge machine learning capabilities.`,
    valuation: valuation, // 'Undervalued', 'Fairly Valued', 'Overvalued'
    pbRatio: parseFloat((1 + Math.random() * 5).toFixed(2)), // Price-to-Book Ratio
    debtToEquity: parseFloat((0.1 + Math.random() * 2).toFixed(2)), // Debt-to-Equity Ratio
    roe: parseFloat((5 + Math.random() * 25).toFixed(2)), // Return on Equity %
    financialHealth: financialHealth, // 'Strong', 'Moderate', 'Weak'
    recentNews: Array.from({ length: 3 }).map(() => ({
      headline: newsHeadlines[Math.floor(Math.random() * newsHeadlines.length)],
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      source: ['Reuters', 'Bloomberg', 'Economic Times', 'Livemint'][Math.floor(Math.random() * 4)],
    })),
  };
};


// --- Dashboard Component ---
const Dashboard = ({ goToStockDetail, searchTerm, setSearchTerm }) => {
  // Helper to generate random change and price for display
  const getRandomChange = (basePrice) => {
    const change = (Math.random() * 5 - 2.5).toFixed(2); // +/- 2.5%
    const changePercent = ((change / basePrice) * 100).toFixed(2);
    const newPrice = (basePrice + parseFloat(change)).toFixed(2);
    return {
      price: parseFloat(newPrice),
      change: parseFloat(change),
      changePercent: parseFloat(changePercent),
      isPositive: parseFloat(change) >= 0
    };
  };

  const marketOverview = {
    nifty50: { value: 22500.50, change: '+0.8%', trend: 'up' },
    sensex: { value: 74000.25, change: '+0.75%', trend: 'up' },
    topGainers: [
      { symbol: 'LYEL', companyName: 'Lyell Immunopharma', basePrice: 8.73 },
      { symbol: 'RGC', companyName: 'Regencell Biosci', basePrice: 877.00 },
      { symbol: 'PONY', companyName: 'Pony AI Inc.', basePrice: 19.28 },
      { symbol: 'ULTA', companyName: 'Ulta Beauty, Inc.', basePrice: 471.46 },
      { symbol: 'MP', companyName: 'MP Materials Co', basePrice: 21.79 },
    ].map(stock => ({ ...stock, ...getRandomChange(stock.basePrice), sparklineData: generateSparklineData(stock.basePrice, 10) })),
    topLosers: [
      { symbol: 'SMMT', companyName: 'Summit Therape', basePrice: 18.22 },
      { symbol: 'GAP', companyName: 'The Gap, Inc.', basePrice: 22.31 },
      { symbol: 'REGN', companyName: 'Regeneron Phar', basePrice: 490.28 },
      { symbol: 'AMBA', companyName: 'Ambarella, Inc.', basePrice: 52.64 },
      { symbol: 'COO', companyName: 'The Cooper Com', basePrice: 68.28 },
    ].map(stock => ({ ...stock, ...getRandomChange(stock.basePrice), sparklineData: generateSparklineData(stock.basePrice, 10) })),
    mostActive: [
      { symbol: 'NVDA', companyName: 'NVIDIA Corporat', basePrice: 135.13 },
      { symbol: 'LCID', companyName: 'Lucid Group, Inc.', basePrice: 2.23 },
      { symbol: 'PLTR', companyName: 'Palantir Technol', basePrice: 131.78 },
      { symbol: 'F', companyName: 'Ford Motor Com', basePrice: 10.38 },
      { symbol: 'TSLA', companyName: 'Tesla, Inc.', basePrice: 346.46 },
    ].map(stock => ({ ...stock, ...getRandomChange(stock.basePrice), sparklineData: generateSparklineData(stock.basePrice, 10) })),
  };

  const allSimulatedStocks = [
    'RELIANCE', 'TCS', 'HDFCBANK', 'ADANIENT', 'INFY', 'ICICIBANK',
    'TATAMOTORS', 'SBIN', 'LT', 'BAJFINANCE', 'AXISBANK', 'WIPRO',
    'BHARTIARTL', 'ASIANPAINT', 'MARUTI', 'ULTRACEMCO', 'NESTLEIND',
    'KOTAKBANK', 'ITC', 'HINDUNILVR', 'DRREDDY', 'SUNPHARMA', 'TITAN',
    'M&M', 'NTPC', 'POWERGRID', 'INDUSINDBK', 'HCLTECH', 'TECHM', 'ONGC',
    'COALINDIA', 'BPCL', 'IOC', 'GAIL', 'JSWSTEEL', 'TATASTEEL', 'GRASIM',
    'SHREECEM', 'UPL', 'EICHERMOT', 'HEROMOTOCO', 'BAJAJ-AUTO', 'DIVISLAB',
    'CIPLA', 'APOLLOHOSP', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI', 'BRITANNIA',
    'NESTLEIND', 'DABUR', 'GODREJCP', 'PIDILITIND', 'ULTRACEMCO', 'AMBUJACEM',
    'ACC', 'DLF', 'GODREJPROP', 'OBEROIRLTY', 'PHOENIXLTD', 'PRESTIGE'
  ];

  const filteredStocks = searchTerm
    ? allSimulatedStocks.filter(stock =>
        stock.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const StockListItem = ({ stock, goToStockDetail }) => {
    const changeColor = stock.isPositive ? 'text-green-500' : 'text-red-500';
    const changeSign = stock.isPositive ? '+' : '';
    const sparklineStroke = stock.isPositive ? '#22c55e' : '#ef4444'; // Tailwind green-500 or red-500

    return (
      <li className="flex justify-between items-center py-2 border-b border-gray-800 last:border-b-0 cursor-pointer hover:bg-gray-800 px-2 rounded-md transition-colors duration-150"
          onClick={() => goToStockDetail(stock.symbol)}>
        <div className="flex items-center gap-4 flex-grow">
          <div className="flex-shrink-0 w-20 h-10"> {/* Sparkline container */}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stock.sparklineData}>
                <Line type="monotone" dataKey="value" stroke={sparklineStroke} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-grow">
            <p className="font-semibold text-white text-lg">{stock.symbol}</p>
            <p className="text-gray-400 text-sm">{stock.companyName}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-white text-lg">{stock.price.toFixed(2)}</p>
          <p className={`text-sm ${changeColor}`}>
            {changeSign}{stock.change.toFixed(2)} ({changeSign}{stock.changePercent.toFixed(2)}%)
          </p>
        </div>
      </li>
    );
  };


  return (
    <div className="p-6 bg-black min-h-screen text-gray-50">
      <h2 className="text-3xl font-bold text-white mb-6">Indian Market Overview</h2>

      {/* Market Indices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800">
          <h3 className="text-xl font-semibold text-gray-100 mb-3">Nifty 50</h3>
          <p className="text-4xl font-bold text-green-500">{marketOverview.nifty50.value}</p>
          <p className="text-lg text-green-400">{marketOverview.nifty50.change}</p>
        </div>
        <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800">
          <h3 className="text-xl font-semibold text-gray-100 mb-3">Sensex</h3>
          <p className="text-4xl font-bold text-green-500">{marketOverview.sensex.value}</p>
          <p className="text-lg text-green-400">{marketOverview.sensex.change}</p>
        </div>
      </div>

      {/* Search Results Display */}
      {searchTerm && filteredStocks.length > 0 && (
        <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
          <h3 className="text-xl font-semibold text-gray-100 mb-3">Search Results for "{searchTerm}"</h3>
          <div className="flex flex-wrap gap-3">
            {filteredStocks.map((symbol, index) => (
              <button
                key={index}
                onClick={() => goToStockDetail(symbol)}
                className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors duration-200 ease-in-out shadow-md"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {searchTerm && filteredStocks.length === 0 && (
        <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
          <p className="text-gray-400">No results found for "{searchTerm}". Try a different symbol.</p>
        </div>
      )}

      {/* Top Gainers Section */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-3">Top Gainers</h3>
        <ul>
          {marketOverview.topGainers.map((stock, index) => (
            <StockListItem key={index} stock={stock} goToStockDetail={goToStockDetail} />
          ))}
        </ul>
      </div>

      {/* Top Losers Section */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-3">Top Losers</h3>
        <ul>
          {marketOverview.topLosers.map((stock, index) => (
            <StockListItem key={index} stock={stock} goToStockDetail={goToStockDetail} />
          ))}
        </ul>
      </div>

      {/* Most Active Section */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-3">Most Active</h3>
        <ul>
          {marketOverview.mostActive.map((stock, index) => (
            <StockListItem key={index} stock={stock} goToStockDetail={goToStockDetail} />
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-yellow-900 border border-yellow-700 text-yellow-200 rounded-lg text-sm">
        <p className="font-semibold">Disclaimer:</p>
        <p>Market data displayed here is simulated and for demonstration purposes only. It does not reflect real-time market conditions. Always consult a financial advisor before making investment decisions.</p>
      </div>
    </div>
  );
};

// --- StockDetail Component ---
const StockDetail = ({ stockSymbol, goToDashboard, showMessage }) => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext);
  const [stockData, setStockData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [companyData, setCompanyData] = useState(null); // New state for company data
  const [loading, setLoading] = useState(true);
  const [isAddedToWatchlist, setIsAddedToWatchlist] = useState(false);
  const [recommendation, setRecommendation] = useState({ action: 'Hold', color: 'text-gray-300' });
  const [selectedTimeRange, setSelectedTimeRange] = useState('1D'); // New state for time range

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  useEffect(() => {
    const fetchStockDetails = async () => {
      setLoading(true);
      // Simulate API call for stock data
      const simulatedData = simulateStockData(stockSymbol);
      setStockData(simulatedData);
      console.log("Simulated Stock Data for chart:", simulatedData); // Log data for debugging

      // Simulate AI/ML predictions and sentiment
      const latestPrice = simulatedData[simulatedData.length - 1]?.close || 0;
      const simulatedPrediction = simulateAIPrediction(latestPrice);
      const simulatedSentiment = simulateSentiment();
      const simulatedCompanyData = simulateCompanyData(stockSymbol); // Simulate company data

      setPrediction(simulatedPrediction);
      setSentiment(simulatedSentiment);
      setCompanyData(simulatedCompanyData); // Set company data

      // Determine Buy/Sell/Hold recommendation based on new factors
      let action = 'Hold';
      let color = 'text-yellow-400'; // Default to Hold/Yellow

      // Strong Buy conditions
      if (simulatedPrediction.trend === 'Upward' && simulatedSentiment.overall.sentiment === 'Positive' && simulatedCompanyData.valuation === 'Undervalued') {
        action = 'Strong Buy';
        color = 'text-green-500';
      } else if (simulatedPrediction.trend === 'Upward' && simulatedSentiment.overall.sentiment === 'Positive') {
        action = 'Buy';
        color = 'text-green-400';
      }
      // Buy conditions
      else if (simulatedPrediction.trend === 'Upward' && simulatedCompanyData.valuation === 'Undervalued') {
        action = 'Buy';
        color = 'text-green-400';
      }
      // Strong Sell conditions
      else if (simulatedPrediction.trend === 'Downward' && simulatedSentiment.overall.sentiment === 'Negative' && simulatedCompanyData.valuation === 'Overvalued') {
        action = 'Strong Sell';
        color = 'text-red-500';
      } else if (simulatedPrediction.trend === 'Downward' && simulatedSentiment.overall.sentiment === 'Negative') {
        action = 'Sell';
        color = 'text-red-400';
      }
      // Sell conditions
      else if (simulatedPrediction.trend === 'Downward' && simulatedCompanyData.valuation === 'Overvalued') {
        action = 'Sell';
        color = 'text-red-400';
      }
      // Mean Reversion scenarios
      else if (simulatedPrediction.trend === 'Reversing Up' && simulatedCompanyData.valuation === 'Undervalued') {
        action = 'Buy on Dip';
        color = 'text-blue-400';
      } else if (simulatedPrediction.trend === 'Reversing Down' && simulatedCompanyData.valuation === 'Overvalued') {
        action = 'Sell on Rise';
        color = 'text-orange-400';
      }

      setRecommendation({ action, color });

      // Check if stock is in watchlist
      if (isAuthReady && db && userId) {
        try {
          const watchlistRef = collection(db, `/artifacts/${appId}/public/data/watchlists`);
          const q = query(watchlistRef, where("userId", "==", userId), where("symbol", "==", stockSymbol));
          const querySnapshot = await getDocs(q);
          setIsAddedToWatchlist(!querySnapshot.empty);
        } catch (error) {
          console.error("Error checking watchlist:", error);
          showMessage("Error checking watchlist status.", 'error');
        }
      }
      setLoading(false);
    };

    fetchStockDetails();
  }, [stockSymbol, db, userId, isAuthReady, showMessage, appId]);

  const handleToggleWatchlist = async () => {
    if (!db || !userId) {
      showMessage("Please wait for authentication to be ready.", 'error');
      return;
    }

    const watchlistRef = collection(db, `/artifacts/${appId}/public/data/watchlists`);

    try {
      if (isAddedToWatchlist) {
        // Remove from watchlist
        const q = query(watchlistRef, where("userId", "==", userId), where("symbol", "==", stockSymbol));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          await deleteDoc(querySnapshot.docs[0].ref);
          setIsAddedToWatchlist(false);
          showMessage(`${stockSymbol} removed from watchlist!`, 'success');
        }
      } else {
        // Add to watchlist
        await addDoc(watchlistRef, {
          userId: userId,
          symbol: stockSymbol,
          addedAt: new Date(),
        });
        setIsAddedToWatchlist(true);
        showMessage(`${stockSymbol} added to watchlist!`, 'success');
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error);
      showMessage(`Failed to toggle watchlist for ${stockSymbol}.`, 'error');
    }
  };

  // New: Handle setting price alert
  const handleSetPriceAlert = async () => {
    if (!db || !userId) {
      showMessage("Please wait for authentication to be ready.", 'error');
      return;
    }

    // Simulate a target price based on current prediction
    const targetPrice = prediction?.predictedPrice || latestPrice;
    const alertType = recommendation.action.includes('Buy') ? 'Buy' : (recommendation.action.includes('Sell') ? 'Sell' : 'Hold');

    try {
      const alertsCollectionRef = collection(db, `/artifacts/${appId}/public/data/priceAlerts`);
      await addDoc(alertsCollectionRef, {
        userId: userId,
        symbol: stockSymbol,
        targetPrice: targetPrice,
        alertType: alertType,
        setAt: new Date(),
        // For a real app, you'd add phone number here, but we cannot send SMS/WhatsApp directly.
        // phoneNumber: '9166750197' // This phone number is for illustrative purposes only.
      });
      showMessage(`Price alert set for ${stockSymbol} at ₹${targetPrice} (${alertType}). (Reminder not sent via WhatsApp)`, 'success');
    } catch (error) {
      console.error("Error setting price alert:", error);
      showMessage(`Failed to set price alert for ${stockSymbol}.`, 'error');
    }
  };


  if (loading || !stockData || !companyData) {
    return <LoadingSpinner />;
  }

  const latestPrice = stockData[stockData.length - 1]?.close;
  const previousClose = stockData[stockData.length - 2]?.close || latestPrice; // Use previous day's close for comparison
  const dailyChange = (latestPrice - previousClose).toFixed(2);
  const dailyChangePercent = ((dailyChange / previousClose) * 100).toFixed(2);
  const changeColor = dailyChange >= 0 ? 'text-green-500' : 'text-red-500';
  const changeSign = dailyChange >= 0 ? '+' : '';

  // Simulate pre-market data
  const preMarketPrice = (latestPrice + (Math.random() - 0.5) * 5).toFixed(2);
  const preMarketChange = (preMarketPrice - latestPrice).toFixed(2);
  const preMarketChangePercent = ((preMarketChange / latestPrice) * 100).toFixed(2);
  const preMarketChangeColor = preMarketChange >= 0 ? 'text-green-500' : 'text-red-500';
  const preMarketChangeSign = preMarketChange >= 0 ? '+' : '';

  // Simulated Support and Resistance Levels
  const supportLevels = [
    parseFloat((latestPrice * 0.95).toFixed(2)),
    parseFloat((latestPrice * 0.90).toFixed(2)),
    parseFloat((latestPrice * 0.85).toFixed(2)),
  ];
  const resistanceLevels = [
    parseFloat((latestPrice * 1.05).toFixed(2)),
    parseFloat((latestPrice * 1.10).toFixed(2)),
    parseFloat((latestPrice * 1.15).toFixed(2)),
  ];

  // Simulated Technical Indicators
  const simulatedMovingAverage = parseFloat((latestPrice * (0.98 + Math.random() * 0.04)).toFixed(2)); // +/- 2% of current price
  const simulatedRSI = parseFloat((30 + Math.random() * 40).toFixed(2)); // 30-70 range

  const timeRanges = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'All'];

  return (
    <div className="p-6 bg-black min-h-screen text-gray-50">
      <button
        onClick={goToDashboard}
        className="mb-6 px-4 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors duration-200 ease-in-out shadow-sm"
      >
        &larr; Back to Dashboard
      </button>

      {/* Stock Header */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-white">{stockSymbol}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleToggleWatchlist}
              className={`px-4 py-2 rounded-full text-white font-semibold transition-colors duration-200 ease-in-out shadow-md
                ${isAddedToWatchlist ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isAddedToWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </button>
            <button
              onClick={handleSetPriceAlert}
              className="px-4 py-2 rounded-full text-white font-semibold transition-colors duration-200 ease-in-out shadow-md bg-blue-600 hover:bg-blue-700"
            >
              Set Price Alert
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-4">
          <p className="text-5xl font-bold text-blue-500">₹ {latestPrice}</p>
          <p className={`text-xl font-semibold ${changeColor}`}>
            {changeSign}{dailyChange} ({changeSign}{dailyChangePercent}%)
          </p>
          <p className="text-md text-gray-400">At close: {stockData[stockData.length - 1]?.date} at 4:00:02 PM IST</p>
        </div>

        <div className="flex items-baseline gap-x-4 gap-y-2 mb-4">
          <p className={`text-lg font-semibold ${preMarketChangeColor}`}>
            Pre-Market: ₹ {preMarketPrice} {preMarketChangeSign}{preMarketChange} ({preMarketChangeSign}{preMarketChangePercent}%)
          </p>
          <p className="text-md text-gray-400">8:06:11 AM IST</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {timeRanges.map(range => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out
                ${selectedTimeRange === range ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="w-full h-64 bg-gray-700 rounded-md p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={stockData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" /> {/* Darker grid lines */}
              <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#4a5568' }} tick={{ fill: '#a0aec0', fontSize: 10 }} /> {/* Gray text for labels */}
              <YAxis
                tickLine={false}
                axisLine={{ stroke: '#4a5568' }}
                tick={{ fill: '#a0aec0', fontSize: 10 }}
                domain={['dataMin', 'dataMax']} // Corrected domain to use actual data min/max
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#2d3748', borderColor: '#4a5568', color: '#e2e8f0' }} // Dark tooltip background
                itemStyle={{ color: '#e2e8f0' }} // Light text for tooltip items
                labelStyle={{ color: '#cbd5e0' }} // Slightly darker label for tooltip
              />
              <Line type="monotone" dataKey="close" stroke="#4ade80" strokeWidth={2} dot={false} /> {/* Green line for price */}

              {/* Simulated Support Lines */}
              {supportLevels.map((level, index) => (
                <ReferenceLine
                  key={`support-${index}`}
                  y={level}
                  stroke="#22c55e" // Green for support
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{ value: `S${index + 1}: ₹${level}`, position: 'insideTopLeft', fill: '#22c55e', fontSize: 10 }}
                />
              ))}

              {/* Simulated Resistance Lines */}
              {resistanceLevels.map((level, index) => (
                <ReferenceLine
                  key={`resistance-${index}`}
                  y={level}
                  stroke="#ef4444" // Red for resistance
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{ value: `R${index + 1}: ₹${level}`, position: 'insideBottomLeft', fill: '#ef4444', fontSize: 10 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-4">Key Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Previous Close</span>
            <span className="font-medium text-gray-100">₹ {previousClose}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Day's Range</span>
            <span className="font-medium text-gray-100">{companyData.dayRange}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Open</span>
            <span className="font-medium text-gray-100">₹ {stockData[stockData.length - 1]?.open}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">52 Week Range</span>
            <span className="font-medium text-gray-100">{companyData.fiftyTwoWeekRange}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Bid</span>
            <span className="font-medium text-gray-100">₹ {(latestPrice - (Math.random() * 0.5 + 0.1)).toFixed(2)} x {Math.floor(Math.random() * 500) + 100}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Volume</span>
            <span className="font-medium text-gray-100">{companyData.volume}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Ask</span>
            <span className="font-medium text-gray-100">₹ {(latestPrice + (Math.random() * 0.5 + 0.1)).toFixed(2)} x {Math.floor(Math.random() * 500) + 100}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Avg. Volume</span>
            <span className="font-medium text-gray-100">{companyData.avgVolume}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Market Cap (Intraday)</span>
            <span className="font-medium text-gray-100">{companyData.marketCap}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Beta (5Y Monthly)</span>
            <span className="font-medium text-gray-100">{companyData.beta}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">PE Ratio (TTM)</span>
            <span className="font-medium text-gray-100">{companyData.peRatio}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">EPS (TTM)</span>
            <span className="font-medium text-gray-100">{companyData.eps}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Earnings Date</span>
            <span className="font-medium text-gray-100">{companyData.earningsDate}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Forward Dividend & Yield</span>
            <span className="font-medium text-gray-100">{companyData.forwardDividendYield}%</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Ex-Dividend Date</span>
            <span className="font-medium text-gray-100">{companyData.exDividendDate}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">1y Target Est</span>
            <span className="font-medium text-gray-100">₹ {companyData.oneYearTargetEst}</span>
          </div>
          {/* New financial ratios */}
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">P/B Ratio</span>
            <span className="font-medium text-gray-100">{companyData.pbRatio}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Debt/Equity</span>
            <span className="font-medium text-gray-100">{companyData.debtToEquity}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">ROE (%)</span>
            <span className="font-medium text-gray-100">{companyData.roe}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Financial Health</span>
            <span className={`font-medium ${companyData.financialHealth === 'Strong' ? 'text-green-500' : companyData.financialHealth === 'Weak' ? 'text-red-500' : 'text-yellow-500'}`}>{companyData.financialHealth}</span>
          </div>
        </div>
      </div>

      {/* Technical Analysis Section */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-4">Technical Analysis (Simulated)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Current Price</span>
            <span className="font-medium text-white">₹ {latestPrice}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">50-Day Moving Average</span>
            <span className="font-medium text-white">₹ {simulatedMovingAverage}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">RSI (14)</span>
            <span className={`font-medium ${simulatedRSI > 70 ? 'text-red-500' : simulatedRSI < 30 ? 'text-green-500' : 'text-yellow-500'}`}>{simulatedRSI}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Support Levels</span>
            <span className="font-medium text-green-400">
              {supportLevels.map(s => `₹${s}`).join(', ')}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Resistance Levels</span>
            <span className="font-medium text-red-400">
              {resistanceLevels.map(r => `₹${r}`).join(', ')}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-4">
          <span className="font-semibold">Note:</span> Technical indicators and levels are simulated for demonstration. In real analysis, these are derived from complex calculations based on historical price and volume data. Support levels indicate where a downtrend might pause due to buying interest, and resistance levels indicate where an uptrend might pause due to selling pressure.
        </p>
      </div>


      {/* Company Overview (New) */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-3">{stockSymbol} Overview - Software - Infrastructure / Technology</h3>
        <p className="text-gray-300 leading-relaxed">
          {companyData.companyOverview}
        </p>
      </div>


      {/* AI Prediction, Sentiment, Recommendation (Existing, moved below key stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* AI Prediction */}
        <div className="lg:col-span-1 bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800">
          <h3 className="text-xl font-semibold text-gray-100 mb-3">AI Price Prediction (Next Day)</h3>
          {prediction ? (
            <>
              <p className="text-4xl font-bold text-purple-500">₹ {prediction.predictedPrice}</p>
              <p className="text-lg text-gray-300 mt-2">Confidence: {prediction.confidence * 100}%</p>
              <p className="text-lg text-gray-300">Trend: <span className={`${prediction.trend.includes('Up') ? 'text-green-500' : 'text-red-500'} font-semibold`}>{prediction.trend}</span></p>
              <p className="text-sm text-gray-400 mt-4">
                <span className="font-semibold">Note:</span> This is a simulated prediction. A real AI model would use complex algorithms (e.g., LSTM, GRU) trained on vast historical data.
              </p>
            </>
          ) : (
            <p className="text-gray-400">No prediction available.</p>
          )}
        </div>

        {/* Sentiment Analysis */}
        <div className="lg:col-span-1 bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800">
          <h3 className="text-xl font-semibold text-gray-100 mb-3">Market Sentiment</h3>
          {sentiment ? (
            <>
              <p className="text-4xl font-bold text-orange-500">{sentiment.overall.sentiment}</p>
              <p className="text-lg text-gray-300 mt-2">Score: {sentiment.overall.score}</p>
              <div className="mt-4 text-sm">
                <p className="text-gray-400 font-semibold">Breakdown:</p>
                <p className="text-gray-300">News: <span className={`${sentiment.news.sentiment === 'Positive' ? 'text-green-400' : sentiment.news.sentiment === 'Negative' ? 'text-red-400' : 'text-yellow-400'}`}>{sentiment.news.sentiment}</span> (Score: {sentiment.news.score})</p>
                <p className="text-gray-300">Social Media: <span className={`${sentiment.socialMedia.sentiment === 'Positive' ? 'text-green-400' : sentiment.socialMedia.sentiment === 'Negative' ? 'text-red-400' : 'text-yellow-400'}`}>{sentiment.socialMedia.sentiment}</span> (Score: {sentiment.socialMedia.score})</p>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                <span className="font-semibold">Note:</span> This is a simulated sentiment. Real sentiment analysis involves NLP on news, social media, and reports.
              </p>
            </>
          ) : (
            <p className="text-gray-400">No sentiment data available.</p>
          )}
        </div>

        {/* Buy/Sell/Hold Recommendation */}
        <div className="lg:col-span-1 bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 text-center">
          <h3 className="text-xl font-semibold text-gray-100 mb-3">AI-Driven Recommendation</h3>
          <p className={`text-6xl font-bold ${recommendation.color}`}>{recommendation.action}</p>
          <p className="text-sm text-gray-400 mt-4">
            <span className="font-semibold">Note:</span> This recommendation is generated based on simulated AI prediction, sentiment, and fundamental valuation. It considers past price movements, momentum, mean reversion tendencies, and value investing principles. It is for illustrative purposes only and should NOT be considered financial advice.
          </p>
        </div>
      </div>

      {/* Recent News/Events Section */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-4">Recent News & Events</h3>
        {companyData.recentNews && companyData.recentNews.length > 0 ? (
          <ul>
            {companyData.recentNews.map((news, index) => (
              <li key={index} className="mb-3 pb-3 border-b border-gray-800 last:border-b-0">
                <p className="text-md font-medium text-white">{news.headline}</p>
                <p className="text-sm text-gray-400 mt-1">
                  <span className="font-semibold">{news.source}</span> - {news.date}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">No recent news available for {stockSymbol}.</p>
        )}
      </div>

      {/* Historical Data (Textual Representation) - Moved to bottom */}
      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-4">Historical Data (Last 30 Days)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Open</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">High</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Low</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Close</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Volume</th>
              </tr>
            </thead>
            <tbody className="bg-neutral-950 divide-y divide-gray-800">
              {stockData.map((day, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{day.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">₹ {day.open}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">₹ {day.high}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">₹ {day.low}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">₹ {day.close}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{day.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-yellow-900 border border-yellow-700 text-yellow-200 rounded-lg text-sm">
        <p className="font-semibold">Disclaimer:</p>
        <p>All stock data, predictions, and sentiment analyses on this page are simulated and for illustrative purposes only. They do not represent real financial advice or actual market conditions. For real-time data and investment decisions, consult a professional financial advisor.</p>
      </div>
    </div>
  );
};

// --- Watchlist Component ---
const Watchlist = ({ goToStockDetail, showMessage }) => {
  const { db, userId, isAuthReady, loadingFirebase } = useContext(FirebaseContext);
  const [watchlist, setWatchlist] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [newStockSymbol, setNewStockSymbol] = useState('');

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  useEffect(() => {
    if (!isAuthReady || !db || !userId) {
      setLoadingWatchlist(true);
      return;
    }

    setLoadingWatchlist(false); // Set to false initially, onSnapshot will update
    const watchlistCollectionRef = collection(db, `/artifacts/${appId}/public/data/watchlists`);
    // Query for documents where userId matches the current user's ID
    const q = query(watchlistCollectionRef, where("userId", "==", userId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWatchlist(items);
      setLoadingWatchlist(false);
    }, (error) => {
      console.error("Error fetching watchlist:", error);
      showMessage("Failed to load watchlist.", 'error');
      setLoadingWatchlist(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [db, userId, isAuthReady, showMessage, appId]);

  const addStock = async (e) => {
    e.preventDefault();
    if (!newStockSymbol.trim()) {
      showMessage("Stock symbol cannot be empty.", 'error');
      return;
    }
    if (!db || !userId) {
      showMessage("Firebase not ready. Please wait.", 'error');
      return;
    }

    const symbolToAdd = newStockSymbol.trim().toUpperCase();

    // Check if stock is already in watchlist
    const existingStock = watchlist.find(item => item.symbol === symbolToAdd);
    if (existingStock) {
      showMessage(`${symbolToAdd} is already in your watchlist.`, 'error');
      setNewStockSymbol('');
      return;
    }

    try {
      const watchlistCollectionRef = collection(db, `/artifacts/${appId}/public/data/watchlists`);
      await addDoc(watchlistCollectionRef, {
        userId: userId,
        symbol: symbolToAdd,
        addedAt: new Date(),
      });
      showMessage(`${symbolToAdd} added to watchlist!`, 'success');
      setNewStockSymbol('');
    } catch (error) {
      console.error("Error adding stock:", error);
      showMessage(`Failed to add ${symbolToAdd}.`, 'error');
    }
  };

  const removeStock = async (id, symbol) => {
    if (!db || !userId) {
      showMessage("Firebase not ready. Please wait.", 'error');
      return;
    }
    try {
      const docRef = doc(db, `/artifacts/${appId}/public/data/watchlists`, id);
      await deleteDoc(docRef);
      showMessage(`${symbol} removed from watchlist.`, 'success');
    } catch (error) {
      console.error("Error removing stock:", error);
      showMessage(`Failed to remove ${symbol}.`, 'error');
    }
  };

  if (loadingFirebase || loadingWatchlist) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 bg-black min-h-screen text-gray-50">
      <h2 className="text-3xl font-bold text-white mb-6">Your Watchlist</h2>

      {/* Add Stock Form */}
      <form onSubmit={addStock} className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={newStockSymbol}
          onChange={(e) => setNewStockSymbol(e.target.value)}
          placeholder="Enter stock symbol (e.g., RELIANCE)"
          className="flex-grow p-3 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-gray-100 placeholder-gray-400"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors duration-200 ease-in-out shadow-md"
        >
          Add Stock
        </button>
      </form>

      {/* Watchlist Display */}
      {watchlist.length === 0 ? (
        <p className="text-gray-400 text-lg">Your watchlist is empty. Add some stocks to get started!</p>
      ) : (
        <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800">
          <ul className="divide-y divide-gray-800">
            {watchlist.map((stock) => (
              <li key={stock.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4">
                <div className="mb-2 sm:mb-0">
                  <span
                    onClick={() => goToStockDetail(stock.symbol)}
                    className="text-xl font-semibold text-blue-500 hover:underline cursor-pointer"
                  >
                    {stock.symbol}
                  </span>
                  <p className="text-sm text-gray-400">Added: {new Date(stock.addedAt.seconds * 1000).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => removeStock(stock.id, stock.symbol)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 ease-in-out shadow-md"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* User ID Display */}
      <div className="mt-8 p-4 bg-blue-900 border border-blue-700 text-blue-200 rounded-lg text-sm">
        <p className="font-semibold">Your User ID:</p>
        <p className="break-words">{userId || 'Loading...'}</p>
        <p className="mt-2">This ID is used to store your watchlist data securely.</p>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-yellow-900 border border-yellow-700 text-yellow-200 rounded-lg text-sm">
        <p className="font-semibold">Disclaimer:</p>
        <p>The watchlist feature uses Firestore for data persistence. Stock data displayed or implied for watchlist items is simulated.</p>
      </div>
    </div>
  );
};

// --- Portfolio Component ---
const Portfolio = ({ goToStockDetail, showMessage }) => {
  const { db, userId, isAuthReady, loadingFirebase } = useContext(FirebaseContext);
  const [portfolio, setPortfolio] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [buySellModalOpen, setBuySellModalOpen] = useState(false);
  const [currentStockToTrade, setCurrentStockToTrade] = useState(null);
  const [tradeAction, setTradeAction] = useState('buy'); // 'buy' or 'sell'
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [tradePrice, setTradePrice] = useState('');

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  useEffect(() => {
    if (!isAuthReady || !db || !userId) {
      setLoadingPortfolio(true);
      return;
    }

    setLoadingPortfolio(false);
    const portfolioCollectionRef = collection(db, `/artifacts/${appId}/users/${userId}/portfolio`);

    const unsubscribe = onSnapshot(portfolioCollectionRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPortfolio(items);
      setLoadingPortfolio(false);
    }, (error) => {
      console.error("Error fetching portfolio:", error);
      showMessage("Failed to load portfolio.", 'error');
      setLoadingPortfolio(false);
    });

    return () => unsubscribe();
  }, [db, userId, isAuthReady, showMessage, appId]);

  const openTradeModal = (stock, action) => {
    setCurrentStockToTrade(stock);
    setTradeAction(action);
    setTradeQuantity(1); // Default quantity
    setTradePrice(stock.currentPrice || ''); // Pre-fill with current price if available
    setBuySellModalOpen(true);
  };

  const closeTradeModal = () => {
    setBuySellModalOpen(false);
    setCurrentStockToTrade(null);
    setTradeQuantity(1);
    setTradePrice('');
  };

  const handleTrade = async (e) => {
    e.preventDefault();
    if (!currentStockToTrade || !tradeQuantity || !tradePrice) {
      showMessage("Please fill all trade details.", 'error');
      return;
    }
    if (!db || !userId) {
      showMessage("Firebase not ready. Please wait.", 'error');
      return;
    }

    const quantity = parseInt(tradeQuantity);
    const price = parseFloat(tradePrice);

    if (isNaN(quantity) || quantity <= 0) {
      showMessage("Quantity must be a positive number.", 'error');
      return;
    }
    if (isNaN(price) || price <= 0) {
      showMessage("Price must be a positive number.", 'error');
      return;
    }

    const portfolioDocRef = doc(db, `/artifacts/${appId}/users/${userId}/portfolio`, currentStockToTrade.symbol);

    try {
      const docSnap = await getDoc(portfolioDocRef);
      let currentHolding = docSnap.exists() ? docSnap.data() : { symbol: currentStockToTrade.symbol, quantity: 0, avgPrice: 0 };

      if (tradeAction === 'buy') {
        const newTotalCost = (currentHolding.quantity * currentHolding.avgPrice) + (quantity * price);
        const newTotalQuantity = currentHolding.quantity + quantity;
        currentHolding.avgPrice = newTotalCost / newTotalQuantity;
        currentHolding.quantity = newTotalQuantity;
        await setDoc(portfolioDocRef, currentHolding, { merge: true });
        showMessage(`Successfully bought ${quantity} shares of ${currentStockToTrade.symbol}!`, 'success');
      } else { // sell
        if (currentHolding.quantity < quantity) {
          showMessage(`You only have ${currentHolding.quantity} shares of ${currentStockToTrade.symbol} to sell.`, 'error');
          return;
        }
        currentHolding.quantity -= quantity;
        if (currentHolding.quantity === 0) {
          await deleteDoc(portfolioDocRef);
        } else {
          await setDoc(portfolioDocRef, currentHolding, { merge: true });
        }
        showMessage(`Successfully sold ${quantity} shares of ${currentStockToTrade.symbol}!`, 'success');
      }
      closeTradeModal();
    } catch (error) {
      console.error("Error performing trade:", error);
      showMessage(`Failed to ${tradeAction} ${currentStockToTrade.symbol}.`, 'error');
    }
  };


  if (loadingFirebase || loadingPortfolio) {
    return <LoadingSpinner />;
  }

  const totalPortfolioValue = portfolio.reduce((sum, stock) => sum + (stock.quantity * (stock.currentPrice || 0)), 0);
  const totalInvestedValue = portfolio.reduce((sum, stock) => sum + (stock.quantity * stock.avgPrice), 0);
  const overallGainLoss = totalPortfolioValue - totalInvestedValue;
  const overallGainLossPercent = totalInvestedValue > 0 ? (overallGainLoss / totalInvestedValue * 100).toFixed(2) : 0;
  const overallGainLossColor = overallGainLoss >= 0 ? 'text-green-500' : 'text-red-500';

  return (
    <div className="p-6 bg-black min-h-screen text-gray-50">
      <h2 className="text-3xl font-bold text-white mb-6">Your Portfolio</h2>

      <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-gray-100 mb-3">Portfolio Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Total Value</span>
            <span className="font-medium text-white">₹ {totalPortfolioValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Total Invested</span>
            <span className="font-medium text-white">₹ {totalInvestedValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <span className="text-gray-300">Overall Gain/Loss</span>
            <span className={`font-medium ${overallGainLossColor}`}>₹ {overallGainLoss.toFixed(2)} ({overallGainLossPercent}%)</span>
          </div>
        </div>
      </div>

      {portfolio.length === 0 ? (
        <p className="text-gray-400 text-lg">Your portfolio is empty. Buy some stocks to get started!</p>
      ) : (
        <div className="bg-neutral-950 p-6 rounded-lg shadow-md border border-gray-800">
          <h3 className="text-xl font-semibold text-gray-100 mb-4">Holdings</h3>
          <ul className="divide-y divide-gray-800">
            {portfolio.map((holding) => {
              // Simulate current price for portfolio display
              const simulatedCurrentPrice = holding.avgPrice * (1 + (Math.random() - 0.5) * 0.1); // +/- 5% fluctuation
              const gainLoss = (simulatedCurrentPrice - holding.avgPrice) * holding.quantity;
              const gainLossPercent = holding.avgPrice > 0 ? (gainLoss / (holding.avgPrice * holding.quantity) * 100).toFixed(2) : 0;
              const gainLossColor = gainLoss >= 0 ? 'text-green-500' : 'text-red-500';

              return (
                <li key={holding.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4">
                  <div className="mb-2 sm:mb-0">
                    <span
                      onClick={() => goToStockDetail(holding.symbol)}
                      className="text-xl font-semibold text-blue-500 hover:underline cursor-pointer"
                    >
                      {holding.symbol}
                    </span>
                    <p className="text-sm text-gray-400">Quantity: {holding.quantity}</p>
                    <p className="text-sm text-gray-400">Avg. Price: ₹ {holding.avgPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-right mb-2 sm:mb-0">
                    <p className="font-bold text-white text-lg">Current: ₹ {simulatedCurrentPrice.toFixed(2)}</p>
                    <p className={`text-sm ${gainLossColor}`}>
                      Gain/Loss: ₹ {gainLoss.toFixed(2)} ({gainLossPercent}%)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openTradeModal({ symbol: holding.symbol, currentPrice: simulatedCurrentPrice }, 'buy')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 ease-in-out shadow-md"
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => openTradeModal({ symbol: holding.symbol, currentPrice: simulatedCurrentPrice }, 'sell')}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 ease-in-out shadow-md"
                    >
                      Sell
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Buy/Sell Modal */}
      {buySellModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 p-6 rounded-lg shadow-xl border border-gray-700 w-full max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">{tradeAction === 'buy' ? 'Buy' : 'Sell'} {currentStockToTrade?.symbol}</h3>
            <form onSubmit={handleTrade}>
              <div className="mb-4">
                <label htmlFor="tradeQuantity" className="block text-gray-300 text-sm font-bold mb-2">
                  Quantity:
                </label>
                <input
                  type="number"
                  id="tradeQuantity"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(e.target.value)}
                  className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="tradePrice" className="block text-gray-300 text-sm font-bold mb-2">
                  Price per share:
                </label>
                <input
                  type="number"
                  id="tradePrice"
                  value={tradePrice}
                  onChange={(e) => setTradePrice(e.target.value)}
                  className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-white leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
                >
                  Confirm {tradeAction === 'buy' ? 'Buy' : 'Sell'}
                </button>
                <button
                  type="button"
                  onClick={closeTradeModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 p-4 bg-yellow-900 border border-yellow-700 text-yellow-200 rounded-lg text-sm">
        <p className="font-semibold">Disclaimer:</p>
        <p>This portfolio feature is simulated and does not involve real money or actual stock transactions. All prices and gains/losses are illustrative. Investment decisions should always be based on thorough research and professional advice.</p>
      </div>
    </div>
  );
};


// --- Main App Component ---
function App() {
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'stockDetail', 'watchlist', 'portfolio'
  const [selectedStock, setSelectedStock] = useState(null);
  const [messageBox, setMessageBox] = useState({ message: '', type: '' });
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const allSimulatedStocksForSearch = [ // Expanded list for search suggestions
    'RELIANCE', 'TCS', 'HDFCBANK', 'ADANIENT', 'INFY', 'ICICIBANK',
    'TATAMOTORS', 'SBIN', 'LT', 'BAJFINANCE', 'AXISBANK', 'WIPRO',
    'BHARTIARTL', 'ASIANPAINT', 'MARUTI', 'ULTRACEMCO', 'NESTLEIND',
    'KOTAKBANK', 'ITC', 'HINDUNILVR', 'DRREDDY', 'SUNPHARMA', 'TITAN',
    'M&M', 'NTPC', 'POWERGRID', 'INDUSINDBK', 'HCLTECH', 'TECHM', 'ONGC',
    'COALINDIA', 'BPCL', 'IOC', 'GAIL', 'JSWSTEEL', 'TATASTEEL', 'GRASIM',
    'SHREECEM', 'UPL', 'EICHERMOT', 'HEROMOTOCO', 'BAJAJ-AUTO', 'DIVISLAB',
    'CIPLA', 'APOLLOHOSP', 'SBILIFE', 'HDFCLIFE', 'ICICIPRULI', 'BRITANNIA',
    'NESTLEIND', 'DABUR', 'GODREJCP', 'PIDILITIND', 'ULTRACEMCO', 'AMBUJACEM',
    'ACC', 'DLF', 'GODREJPROP', 'OBEROIRLTY', 'PHOENIXLTD', 'PRESTIGE',
    'LYEL', 'RGC', 'PONY', 'ULTA', 'MP', 'SMMT', 'GAP', 'REGN', 'AMBA', 'COO',
    'NVDA', 'LCID', 'PLTR', 'F', 'TSLA'
  ].filter((value, index, self) => self.indexOf(value) === index); // Ensure unique symbols

  const showMessage = (message, type = 'success') => {
    setMessageBox({ message, type });
    setTimeout(() => {
      setMessageBox({ message: '', type: '' });
    }, 3000); // Message disappears after 3 seconds
  };

  const goToDashboard = () => {
    setCurrentPage('dashboard');
    setSelectedStock(null);
    setSearchTerm(''); // Clear search term when going to dashboard
  };

  const goToStockDetail = (symbol) => {
    setSelectedStock(symbol);
    setCurrentPage('stockDetail');
    setSearchTerm(''); // Clear search term when navigating to detail
  };

  const goToWatchlist = () => {
    setCurrentPage('watchlist');
    setSearchTerm(''); // Clear search term when going to watchlist
  };

  const goToPortfolio = () => {
    setCurrentPage('portfolio');
    setSearchTerm(''); // Clear search term when going to portfolio
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      goToStockDetail(searchTerm.trim().toUpperCase());
    } else {
      showMessage("Please enter a stock symbol to search.", 'error');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredSearchSuggestions = searchTerm.trim()
    ? allSimulatedStocksForSearch.filter(stock =>
        stock.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5) // Limit to 5 suggestions
    : [];

  return (
    <FirebaseProvider>
      <div className="font-inter antialiased bg-black text-gray-50 min-h-screen">
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
            }
          `}
        </style>

        {/* Navigation Bar */}
        <nav className="bg-neutral-950 shadow-lg p-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-40 gap-4 sm:gap-0">
          <h1 className="text-2xl font-bold text-blue-500 mb-2 sm:mb-0">
            India Stock AI
          </h1>
          <div className="relative flex-grow w-full sm:w-auto max-w-md mx-auto sm:mx-0">
            <form onSubmit={handleSearchSubmit} className="flex w-full">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search for stocks (e.g., RELIANCE)"
                className="flex-grow p-2 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-gray-100 placeholder-gray-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors duration-200 ease-in-out shadow-md"
              >
                Search
              </button>
            </form>
            {searchTerm && filteredSearchSuggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full bg-gray-800 border border-gray-700 rounded-b-md shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
                {filteredSearchSuggestions.map((symbol, index) => (
                  <li
                    key={index}
                    onClick={() => goToStockDetail(symbol)}
                    className="p-2 cursor-pointer hover:bg-gray-700 text-gray-200 border-b border-gray-700 last:border-b-0"
                  >
                    {symbol}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <button
              onClick={goToDashboard}
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ease-in-out
                ${currentPage === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-200 hover:bg-gray-700'}`}
            >
              Dashboard
            </button>
            <button
              onClick={goToWatchlist}
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ease-in-out
                ${currentPage === 'watchlist' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-200 hover:bg-gray-700'}`}
            >
              Watchlist
            </button>
            <button
              onClick={goToPortfolio}
              className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ease-in-out
                ${currentPage === 'portfolio' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-200 hover:bg-gray-700'}`}
            >
              Portfolio
            </button>
          </div>
        </nav>

        {/* Message Box */}
        <MessageBox message={messageBox.message} type={messageBox.type} onClose={() => setMessageBox({ message: '', type: '' })} />

        {/* Main Content */}
        <main className="container mx-auto p-4">
          {currentPage === 'dashboard' && <Dashboard goToStockDetail={goToStockDetail} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
          {currentPage === 'stockDetail' && selectedStock && <StockDetail stockSymbol={selectedStock} goToDashboard={goToDashboard} showMessage={showMessage} />}
          {currentPage === 'watchlist' && <Watchlist goToStockDetail={goToStockDetail} showMessage={showMessage} />}
          {currentPage === 'portfolio' && <Portfolio goToStockDetail={goToStockDetail} showMessage={showMessage} />}
        </main>

        {/* Footer */}
        <footer className="bg-neutral-950 text-gray-400 text-center p-4 text-sm mt-8">
          <p>&copy; {new Date().getFullYear()} India Stock AI. All rights reserved.</p>
          <p className="mt-1">Made by Shubh Dixit</p>
        </footer>
      </div>
    </FirebaseProvider>
  );
}

export default App;
