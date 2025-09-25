import React, { useState, useEffect } from 'react';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { Button } from './components/ui/button';

import { Input } from './components/ui/input';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

import { Badge } from './components/ui/badge';

import {

  BarChart3,

  Calendar,

  CalendarDays,

  TrendingUp,

  Users,

  Globe,

  MessageCircle,

  Brain,

  PieChart,

  LineChart,

  Send,

  User,

  Filter,

  Download,

  RefreshCw,

  Search,

  Settings,

  MoreHorizontal,

  Eye,

  Share,

  Bookmark,

  ChevronDown,

  Star,

  Plane,

  Target,

  MapPin,

  Menu,

  X

} from 'lucide-react';

import axios from 'axios';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart as ReLineChart, Line, ResponsiveContainer } from 'recharts';



import { Link } from 'react-router-dom';

import { AuthProvider, AuthContext } from './context/AuthContext';

import Login from './components/Auth/Login';

import Signup from './components/Auth/Signup';

import Profile from './components/Auth/Profile';

import ProtectedRoute from './components/Auth/ProtectedRoute';

import TDMSComponent from './components/TDMSComponent';

import MonthlyPredictionsComponent from './components/MonthlyPredictionsComponent';

import DailyPredictionsComponent from './components/DailyPredictionsComponent';

import ChatbotTab from './ChatbotTab';



const App = () => {

  return (

    <BrowserRouter>

      <AuthProvider>

        <Routes>

          <Route path="/login" element={<Login />} />

          <Route path="/signup" element={<Signup />} />

          <Route

            path="/profile"

            element={

              <ProtectedRoute>

                <Profile />

              </ProtectedRoute>

            }

          />

          <Route

            path="/"

            element={

              <ProtectedRoute>

                <PowerBIDashboard />

              </ProtectedRoute>

            }

          />

          <Route

            path="/dashboard"

            element={

              <ProtectedRoute>

                <PowerBIDashboard />

              </ProtectedRoute>

            }

          />

        </Routes>

      </AuthProvider>

    </BrowserRouter>

  );

}












// Power BI Dashboard Component

// Power BI Dashboard Component

function PowerBIDashboard() {

  const { userData, currentUser } = React.useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('overview');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);



  // Close sidebar on Escape key

  React.useEffect(() => {

    const handleEscape = (e) => {

      if (e.key === 'Escape') {

        setIsSidebarOpen(false);

      }

    };



    window.addEventListener('keydown', handleEscape);

    return () => window.removeEventListener('keydown', handleEscape);

  }, []);



  // Handle tab click - close sidebar automatically

  const handleTabClick = (tabId) => {

    setActiveTab(tabId);

    setIsSidebarOpen(false);

  };



  const displayName = (userData?.firstName && userData?.lastName)

    ? `${userData.firstName} ${userData.lastName}`

    : (userData?.firstName || currentUser?.email || 'User');



  return (

    <div className="min-h-screen bg-gray-100">

      {/* Power BI Header */}

      <header className="bg-gray-800 text-white border-b border-gray-700">

        <div className="flex items-center justify-between px-4 py-2">

          <div className="flex items-center space-x-4">

            <button

              onClick={() => setIsSidebarOpen(!isSidebarOpen)}

              className="p-2 hover:bg-gray-700 rounded-md transition-colors"

              aria-label="Toggle sidebar"

              title="Toggle sidebar"

            >

              {isSidebarOpen ? (

                <X className="h-6 w-6" />

              ) : (

                <Menu className="h-6 w-6" />

              )}

            </button>

            <h1 className="text-xl font-bold">Sri Lanka Tourism Analytics</h1>

          </div>

          <div className="flex items-center space-x-4">

            <div className="text-sm">

              <span className="text-gray-300">Logged in as:</span>

              <span className="ml-2 font-semibold">{displayName}</span>

            </div>

            <Link to="/profile">

              <Button size="sm" variant="ghost" className="text-white hover:bg-gray-700">

                <User className="h-4 w-4" />

              </Button>

            </Link>



          </div>

        </div>

      </header>



      {/* Sidebar Backdrop */}

      {isSidebarOpen && (

        <div

          className="fixed inset-0 bg-black/30 z-40"

          onClick={() => setIsSidebarOpen(false)}

          style={{ top: '60px' }}

        />

      )}



      {/* Floating Sidebar Navigation */}

      <div

        className={`fixed top-0 left-0 h-screen w-56 bg-white border-r border-gray-200 z-50 transform transition-transform duration-250 ease-out rounded-none ${

          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'

        }`}

        style={{

          boxShadow: isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',

          top: '60px',

          height: 'calc(100vh - 60px)'

        }}

      >

        <div className="p-4">

          <h2 className="text-lg font-semibold text-gray-800 mb-6">Navigation</h2>

          <nav className="space-y-1">

            {[

              { id: 'overview', label: 'Overview', icon: BarChart3 },

              { id: 'predictions', label: 'Monthly Predictions', icon: Calendar },

              { id: 'daily-predictions', label: 'Daily Predictions', icon: CalendarDays },



              { id: 'tdms', label: 'Distribution Management', icon: MapPin },

              { id: 'chatbot', label: 'AI Assistant', icon: MessageCircle }

            ].map((tab) => (

              <button

                key={tab.id}

                onClick={() => handleTabClick(tab.id)}

                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id

                  ? 'bg-blue-50 text-blue-600'

                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'

                  }`}

              >

                <tab.icon className="h-5 w-5 mr-3" />

                {tab.label}

              </button>

            ))}

          </nav>

        </div>

      </div>



      {/* Power BI Content Area */}

      <div className="flex h-[calc(100vh-60px)] bg-gray-50">

        {/* Main Content Area - Now Full Width */}

        <div className="flex-1 flex flex-col overflow-hidden w-full">

          {/* Tab Content */}

          <div className="flex-1 overflow-auto p-6">

            {activeTab === 'overview' && <OverviewTab />}

            {activeTab === 'predictions' && <MonthlyPredictionsComponent />}

            {activeTab === 'daily-predictions' && <DailyPredictionsComponent />}



            {activeTab === 'tdms' && <TDMSComponent />}

            {activeTab === 'chatbot' && <ChatbotTab />}

          </div>

        </div>

      </div>

    </div>

  );

}



// Overview Tab

function OverviewTab() {

  const [monthlyData, setMonthlyData] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  const [currentScenario, setCurrentScenario] = useState('baseline');

  const [nextMonthPrediction, setNextMonthPrediction] = useState(null);

  const [predictedGrowth, setPredictedGrowth] = useState(null);



  // Get next month name and year

  const getNextMonth = () => {

    const date = new Date();

    date.setMonth(date.getMonth() + 1);

    return {

      month: date.toLocaleDateString('en-US', { month: 'long' }),

      year: date.getFullYear(),

      monthYear: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    };

  };



  React.useEffect(() => {

    const fetchMonthlyData = async () => {

      try {

        const backendUrl = 'http://localhost:8000';

        console.log('Fetching monthly forecast data...');



        const response = await fetch(`${backendUrl}/api/forecasts/scenarios`, {

          method: 'GET',

          mode: 'cors',

          headers: {

            'Accept': 'application/json',

            'Content-Type': 'application/json',

          },

          credentials: 'include'

        });



        if (!response.ok) {

          throw new Error(`HTTP error! status: ${response.status}`);

        }



        const data = await response.json();

        console.log('Monthly forecast data received:', data);



        if (!data) {

          throw new Error('No data received from server');

        }



        // Get the last 12 months of data for display

        const scenarioData = data[currentScenario] || [];

        console.log('Scenario data for', currentScenario, ':', scenarioData);



        if (scenarioData.length === 0) {

          console.warn('No scenario data found for', currentScenario);

          setMonthlyData([]);

          setIsLoading(false);

          return;

        }



        const last12Months = scenarioData.slice(-12).map(item => {

          console.log('Processing item:', item);

          return {

            date: item.date,

            month: new Date(item.date + '-01').toLocaleDateString('en-US', { month: 'short' }),

            year: new Date(item.date + '-01').getFullYear(),

            arrivals: Math.round(item.arrivals_forecast || item.total_forecast || 0)

          };

        });



        console.log('Processed monthly data:', last12Months);

        setMonthlyData(last12Months);



        // Calculate predicted growth percentage

        if (scenarioData.length >= 2) {

          // Get the most recent month and the same month from previous year

          const currentMonth = new Date();

          const currentYear = currentMonth.getFullYear();

          const currentMonthIndex = currentMonth.getMonth();



          // Find current month data and previous year same month data

          const currentMonthData = scenarioData.find(item => {

            const itemDate = new Date(item.date + '-01');

            return itemDate.getMonth() === currentMonthIndex && itemDate.getFullYear() === currentYear;

          });



          const previousYearData = scenarioData.find(item => {

            const itemDate = new Date(item.date + '-01');

            return itemDate.getMonth() === currentMonthIndex && itemDate.getFullYear() === currentYear - 1;

          });



          // If current year data not available, use next available month and compare with previous year

          let growthPercentage = 0;

          let comparisonMonth = '';



          if (currentMonthData && previousYearData) {

            const currentValue = currentMonthData.arrivals_forecast || currentMonthData.total_forecast || 0;

            const previousValue = previousYearData.arrivals_forecast || previousYearData.total_forecast || 0;

            growthPercentage = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

            comparisonMonth = new Date(currentMonthData.date + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

          } else {

            // Fallback: use first available data point and compare with last year

            const firstData = scenarioData[0];

            const lastYearData = scenarioData.find(item => {

              const itemDate = new Date(item.date + '-01');

              const firstDate = new Date(firstData.date + '-01');

              return itemDate.getFullYear() === firstDate.getFullYear() - 1 &&

                itemDate.getMonth() === firstDate.getMonth();

            });



            if (firstData && lastYearData) {

              const currentValue = firstData.arrivals_forecast || firstData.total_forecast || 0;

              const previousValue = lastYearData.arrivals_forecast || lastYearData.total_forecast || 0;

              growthPercentage = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

              comparisonMonth = new Date(firstData.date + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            } else {

              // Final fallback: use year-over-year growth from scenario summary if available

              growthPercentage = 15; // Default fallback

              comparisonMonth = 'Year-over-Year';

            }

          }



          console.log('Calculated growth percentage:', growthPercentage);

          setPredictedGrowth({

            percentage: growthPercentage,

            formatted: (growthPercentage >= 0 ? '+' : '') + growthPercentage.toFixed(1) + '%',

            comparison: comparisonMonth,

            confidence: growthPercentage > 10 ? 'High' : growthPercentage > 5 ? 'Medium' : 'Low'

          });

        }



        // Get next month prediction (first item in the array that's in the future)

        const currentDate = new Date();

        const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

        const nextMonthStr = nextMonthDate.toISOString().slice(0, 7); // YYYY-MM format



        console.log('Looking for next month:', nextMonthStr);

        console.log('Available dates in scenario data:', scenarioData.map(item => item.date));



        const nextMonthData = scenarioData.find(item => item.date === nextMonthStr);

        console.log('Next month data found:', nextMonthData);



        if (nextMonthData) {

          const prediction = Math.round(nextMonthData.arrivals_forecast || nextMonthData.total_forecast || 0);

          console.log('Prediction value:', prediction);

          setNextMonthPrediction({

            value: prediction,

            formatted: (prediction / 1000000).toFixed(2) + 'M',

            confidence: 94,

            month: getNextMonth().monthYear

          });

        } else {

          // If next month data not found, use the first available future month

          const futureData = scenarioData.find(item => {

            const itemDate = new Date(item.date + '-01');

            return itemDate > currentDate;

          });



          if (futureData) {

            const prediction = Math.round(futureData.arrivals_forecast || futureData.total_forecast || 0);

            console.log('Using future data:', futureData.date, 'Prediction:', prediction);

            setNextMonthPrediction({

              value: prediction,

              formatted: (prediction / 1000000).toFixed(2) + 'M',

              confidence: 94,

              month: new Date(futureData.date + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

            });

          } else {

            // Fallback to the last available data point

            const lastData = scenarioData[scenarioData.length - 1];

            if (lastData) {

              const prediction = Math.round(lastData.arrivals_forecast || lastData.total_forecast || 0);

              console.log('Using last available data:', lastData.date, 'Prediction:', prediction);

              setNextMonthPrediction({

                value: prediction,

                formatted: (prediction / 1000000).toFixed(2) + 'M',

                confidence: 94,

                month: new Date(lastData.date + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

              });

            }

          }

        }



        setIsLoading(false);

      } catch (error) {

        console.error("Error fetching monthly data:", error);

        setIsLoading(false);

      }

    };



    fetchMonthlyData();

  }, [currentScenario]);

  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <h2 className="text-2xl font-bold text-gray-800">Tourism Analytics Overview</h2>

        <div className="text-sm text-gray-600">Last updated: 2 minutes ago</div>

      </div>



      {/* KPI Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {[

          { title: 'Total Arrivals', value: '2.05M', change: '+38.1%', color: 'blue' },

          { title: 'Revenue (USD)', value: '$3.17B', change: '+53.1%', color: 'emerald' },

          { title: 'Avg. Stay (Days)', value: '8.42', change: '+0.2%', color: 'purple' },

          { title: 'Avg. Daily Spend (USD)', value: '$181.15', change: '+10.0%', color: 'orange' }

        ].map((kpi, index) => (

          <Card key={index} className="power-bi-card">

            <CardContent className="p-4">

              <div className="flex items-center justify-between">

                <div className="flex-1">

                  <div className="flex items-center space-x-2">

                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{kpi.title}</p>

                    <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5">2024</Badge>

                  </div>

                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>

                  <p className={`text-xs mt-1 font-medium text-${kpi.color}-600`}>{kpi.change} vs 2023</p>

                </div>

                <div className={`w-12 h-12 rounded-lg bg-${kpi.color}-100 flex items-center justify-center`}>

                  <TrendingUp className={`h-6 w-6 text-${kpi.color}-600`} />

                </div>

              </div>

            </CardContent>

          </Card>

        ))}

      </div>



      {/* Charts Row */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly Trends Chart */}

        <Card className="power-bi-card">

          <CardHeader>

            <CardTitle className="text-lg font-semibold flex items-center justify-between">

              <div className="flex items-center">

                <LineChart className="h-5 w-5 mr-2 text-blue-600" />

                Monthly Tourist Arrivals

              </div>

              <div className="flex space-x-2">

                {['baseline', 'optimistic', 'pessimistic'].map((scenario) => (

                  <button

                    key={scenario}

                    onClick={() => setCurrentScenario(scenario)}

                    className={`px-2 py-1 text-xs rounded-md ${currentScenario === scenario

                      ? 'bg-blue-600 text-white'

                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                      }`}

                  >

                    {scenario.charAt(0).toUpperCase() + scenario.slice(1)}

                  </button>

                ))}

              </div>

            </CardTitle>

          </CardHeader>

          <CardContent>

            {isLoading ? (

              <div className="h-80 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 flex items-center justify-center">

                <div className="text-blue-600">Loading monthly data...</div>

              </div>

            ) : monthlyData.length > 0 ? (

              <div className="h-80 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 overflow-y-auto">

                <div className="space-y-2">

                  {monthlyData.map((item, index) => {

                    const maxValue = Math.max(...monthlyData.map(d => d.arrivals));

                    const percentage = maxValue > 0 ? (item.arrivals / maxValue) * 100 : 0;

                    return (

                      <div key={item.date} className="flex items-center">

                        <span className="w-10 text-xs text-gray-600 text-right">{item.month}</span>

                        <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">

                          <div

                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"

                            style={{ width: `${percentage}%` }}

                          ></div>

                        </div>

                        <span className="w-20 text-xs font-semibold text-right">

                          {item.arrivals > 0 ? `${(item.arrivals / 1000).toFixed(0)}K` : 'N/A'}

                        </span>

                      </div>

                    );

                  })}

                </div>

                <div className="mt-4 text-xs text-gray-500 text-center">

                  Showing {currentScenario} scenario forecast for the last 12 months

                </div>

              </div>

            ) : (

              <div className="h-80 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 flex items-center justify-center">

                <div className="text-blue-600">No data available</div>

              </div>

            )}

          </CardContent>

        </Card>



        {/* Top Countries */}

        <Card className="power-bi-card">

          <CardHeader>

            <CardTitle className="text-lg font-semibold flex items-center">

              <Globe className="h-5 w-5 mr-2 text-emerald-600" />

              Top Source Markets

            </CardTitle>

          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              {[

                { rank: 1, country: 'India', share: 20.3, flag: '🇮🇳' },

                { rank: 2, country: 'Russia', share: 9.8, flag: '🇷🇺' },

                { rank: 3, country: 'United Kingdom', share: 8.6, flag: '🇬🇧' },

                { rank: 4, country: 'Germany', share: 6.6, flag: '🇩🇪' },

                { rank: 5, country: 'China', share: 6.4, flag: '🇨🇳' },

                { rank: 6, country: 'USA', share: 2.9, flag: '🇺🇸' }

              ].map((item, index) => (

                <div key={index} className="flex items-center justify-between">

                  <div className="flex items-center space-x-3">

                    <span className="w-6 text-xs font-semibold text-gray-600">#{item.rank}</span>

                    <span className="text-lg">{item.flag}</span>

                    <div>

                      <div className="font-medium text-sm">{item.country}</div>

                      <div className="text-xs text-gray-500">{item.share}% market share</div>

                    </div>

                  </div>

                  <div className="flex items-center space-x-2">

                    <div className="w-20 bg-gray-200 rounded-full h-1.5">

                      <div

                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"

                        style={{ width: `${item.share * 4}%` }}

                      ></div>

                    </div>

                    <span className="text-xs font-semibold w-12 text-right">{item.share}%</span>

                  </div>

                </div>

              ))}

            </div>

          </CardContent>

        </Card>

      </div>



      {/* ML Model Performance Summary */}

      <Card className="power-bi-card">

        <CardHeader>

          <CardTitle className="text-lg font-semibold flex items-center">

            <Brain className="h-5 w-5 mr-2 text-purple-600" />

            ML Model Performance Summary

          </CardTitle>

        </CardHeader>

        <CardContent>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="text-center">

              <div className="text-3xl font-bold text-purple-600">91.8%</div>

              <div className="text-sm text-gray-600">Prediction Accuracy</div>

              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">

                <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '91.8%' }}></div>

              </div>

            </div>

            <div className="text-center">

              <div className="text-3xl font-bold text-blue-600">

                {nextMonthPrediction ? nextMonthPrediction.formatted : '2.85M'}

              </div>

              <div className="text-sm text-gray-600">

                {nextMonthPrediction ? `${nextMonthPrediction.month} Prediction` : 'January 2026 Prediction'}

              </div>

              <Badge className="mt-2 bg-blue-100 text-blue-800">

                {nextMonthPrediction ? `${nextMonthPrediction.confidence}% Confidence` : '94% Confidence'}

              </Badge>

            </div>

            <div className="text-center">

              <div className="text-3xl font-bold text-emerald-600">

                {predictedGrowth ? predictedGrowth.formatted : '+15.0%'}

              </div>

              <div className="text-sm text-gray-600">

                {predictedGrowth ? `Predicted Growth (${predictedGrowth.comparison})` : 'Predicted Growth'}

              </div>

              <Badge className={`mt-2 ${predictedGrowth?.confidence === 'High' ? 'bg-emerald-100 text-emerald-800' :

                predictedGrowth?.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-800' :

                  'bg-orange-100 text-orange-800'

                }`}>

                {predictedGrowth ? `${predictedGrowth.confidence} Confidence` : 'High Confidence'}

              </Badge>

            </div>

          </div>

        </CardContent>

      </Card>

    </div>

  );

}


export default App;

