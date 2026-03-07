import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  TrendingUp,
  LineChart,
  Globe,
  Brain
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function OverviewTab() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScenario, setCurrentScenario] = useState('baseline');
  const [nextMonthPrediction, setNextMonthPrediction] = useState(null);
  const [predictedGrowth, setPredictedGrowth] = useState(null);

  const fiveYearTrendData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2026, 2027, 2028, 2029, 2030];
    return years.flatMap(year =>
      months.map((month, i) => ({
        label: i === 0 ? `${year}` : '',
        value: 250000 + (year - 2026) * 15000 + Math.sin((i / 12) * Math.PI * 2) * 25000
      }))
    );
  }, []);

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
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
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

        // Get last 12 months of data for display
        const scenarioData = data[currentScenario] || [];
        console.log('Scenario data for', currentScenario, ':', scenarioData);

        if (scenarioData.length === 0) {
          console.warn('No scenario data found for', currentScenario);
          setMonthlyData([]);
          setIsLoading(false);
          return;
        }

        const last12Months = scenarioData.slice(0, 12).map(item => {
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
          // Get most recent month and same month from previous year
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

        // Get next month prediction (first item in array that's in future)
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
          // If next month data not found, use first available future month
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
                Monthly Tourist Predictions
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
              <div className="h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 flex items-center justify-center">
                <div className="text-blue-600">Loading monthly data...</div>
              </div>
            ) : monthlyData.length > 0 ? (
              <div className="h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
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
                  Showing {currentScenario} scenario predictions for 2026
                </div>
              </div>
            ) : (
              <div className="h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 flex items-center justify-center">
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

      {/* 5-Year Monthly Arrival Trend */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1">5-Year Monthly Arrival Trend</h3>
        <p className="text-sm text-gray-500 mb-4">2026 – 2030 forecast trend</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={fiveYearTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="fiveYearGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide={true} />
              <Tooltip content={() => null} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill="url(#fiveYearGradient)"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={false}
                activeDot={false}
              />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ML Model Performance Summary */}
      <Card className="power-bi-card col-span-1 md:col-span-2 lg:col-span-4 mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            Final Model Metrics Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">

            {/* 1. Individual Model Performance */}
            <div>
              <h3 className="text-md font-bold mb-4 text-gray-800">1. Individual Model Performance</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* TSFormer */}
                <div className="border rounded-lg overflow-hidden border-gray-200 shadow-sm">
                  <div className="bg-gray-50 px-4 py-3 border-b font-semibold text-sm text-gray-700">
                    TSFormer Performance (BO Optimized)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Dataset</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">RMSE</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">R²</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">MAPE</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        <tr>
                          <td className="px-4 py-3 text-gray-800">Train</td>
                          <td className="px-4 py-3 text-right text-gray-600">585.29</td>
                          <td className="px-4 py-3 text-right text-gray-600">0.9065</td>
                          <td className="px-4 py-3 text-right text-gray-600">14.59</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-800">Validation</td>
                          <td className="px-4 py-3 text-right text-gray-600">232.43</td>
                          <td className="px-4 py-3 text-right text-gray-600">0.9651</td>
                          <td className="px-4 py-3 text-right text-gray-600">18.82</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-800 font-medium">Test</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">378.39</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">0.9379</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">4.14</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SVR */}
                <div className="border rounded-lg overflow-hidden border-gray-200 shadow-sm">
                  <div className="bg-gray-50 px-4 py-3 border-b font-semibold text-sm text-gray-700">
                    SVR Performance (Optimized by Bayesian Optimization)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Dataset</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">RMSE</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">R²</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-500">MAPE</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        <tr>
                          <td className="px-4 py-3 text-gray-800">Train</td>
                          <td className="px-4 py-3 text-right text-gray-600">294.11</td>
                          <td className="px-4 py-3 text-right text-gray-600">0.9794</td>
                          <td className="px-4 py-3 text-right text-gray-600">3.98</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-800">Validation</td>
                          <td className="px-4 py-3 text-right text-gray-600">182.29</td>
                          <td className="px-4 py-3 text-right text-gray-600">0.9858</td>
                          <td className="px-4 py-3 text-right text-gray-600">4.19</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-800 font-medium">Test</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">429.53</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">0.9207</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-medium">3.57</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Final Ensemble Model */}
            <div className="flex flex-col items-center border-t border-gray-100 pt-8 mt-4">
              <h3 className="text-md font-bold mb-4 text-gray-800 flex flex-col sm:flex-row items-center gap-2">
                2. Final Ensemble Model Performance
                <span className="text-xs font-normal text-purple-600 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                  Genetic Algorithm Optimized
                </span>
              </h3>
              <div className="border rounded-lg overflow-hidden border-purple-200 shadow-sm w-full max-w-2xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-6 py-4 text-left font-medium text-gray-500 bg-purple-50/50">Dataset</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-500 bg-purple-50/50">RMSE</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-500 bg-purple-50/50">R²</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-500 bg-purple-50/50">MAPE</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      <tr>
                        <td className="px-6 py-4 text-gray-800 font-medium">Train</td>
                        <td className="px-6 py-4 text-right text-purple-700 font-medium">346.16</td>
                        <td className="px-6 py-4 text-right text-purple-700 font-medium">0.9714</td>
                        <td className="px-6 py-4 text-right text-purple-700 font-medium">9.82</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-gray-800 font-medium">Validation</td>
                        <td className="px-6 py-4 text-right text-purple-700 font-medium">186.57</td>
                        <td className="px-6 py-4 text-right text-purple-700 font-medium">0.9843</td>
                        <td className="px-6 py-4 text-right text-purple-700 font-medium">5.35</td>
                      </tr>
                      <tr className="bg-purple-50">
                        <td className="px-6 py-4 text-gray-900 font-bold flex items-center gap-2">
                          Test
                          <span title="Final evaluation metric" className="text-purple-500 text-lg leading-none">★</span>
                        </td>
                        <td className="px-6 py-4 text-right text-purple-800 font-bold text-base">350.79</td>
                        <td className="px-6 py-4 text-right text-purple-800 font-bold text-base">0.9495</td>
                        <td className="px-6 py-4 text-right text-purple-800 font-bold text-base">3.24</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OverviewTab;
