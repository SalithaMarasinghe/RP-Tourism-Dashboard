import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  TrendingUp,
  LineChart,
  Globe,
  Brain
} from 'lucide-react';
import OverviewArrivalsTimelineChart from './OverviewArrivalsTimelineChart';

function OverviewTab() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentScenario, setCurrentScenario] = useState('baseline');
  const [nextMonthPrediction, setNextMonthPrediction] = useState(null);
  const [predictedGrowth, setPredictedGrowth] = useState(null);
  const [arrivalsTimeline, setArrivalsTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState('');

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

  React.useEffect(() => {
    const fetchArrivalsTimeline = async () => {
      try {
        setTimelineLoading(true);
        setTimelineError('');
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/forecasts/arrivals-timeline`, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setArrivalsTimeline(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching arrivals timeline:', error);
        setTimelineError('Failed to load arrivals timeline data.');
        setArrivalsTimeline([]);
      } finally {
        setTimelineLoading(false);
      }
    };

    fetchArrivalsTimeline();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Tourism <span className="text-blue-500">Overview</span>
          </h1>
          <p className="text-sm text-gray-300 font-medium">
            Executive monitoring of arrivals, revenue, and forecast movement.
          </p>
        </div>
        <div className="text-sm text-gray-300">Last updated: 2 minutes ago</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Arrivals', value: '2.05M', change: '+38.1%', color: 'blue', badgeClass: 'bg-blue-900 text-blue-200', chipClass: 'bg-blue-900/40', accentClass: 'text-blue-400' },
          { title: 'Revenue (USD)', value: '$3.17B', change: '+53.1%', color: 'emerald', badgeClass: 'bg-emerald-900 text-emerald-200', chipClass: 'bg-emerald-900/40', accentClass: 'text-emerald-400' },
          { title: 'Avg. Stay (Days)', value: '8.42', change: '+0.2%', color: 'purple', badgeClass: 'bg-purple-900 text-purple-200', chipClass: 'bg-purple-900/40', accentClass: 'text-purple-400' },
          { title: 'Avg. Daily Spend (USD)', value: '$181.15', change: '+10.0%', color: 'orange', badgeClass: 'bg-orange-900 text-orange-200', chipClass: 'bg-orange-900/40', accentClass: 'text-orange-400' }
        ].map((kpi, index) => (
          <Card key={index} className="power-bi-card !bg-[#151515] !border-[#2a2a2a] shadow-lg shadow-black/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-xs font-medium text-gray-300 uppercase tracking-wide">{kpi.title}</p>
                    <Badge className={`${kpi.badgeClass} text-xs px-2 py-0.5`}>2024</Badge>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
                  <p className={`text-xs mt-1 font-medium ${kpi.accentClass}`}>{kpi.change} vs 2023</p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${kpi.chipClass} flex items-center justify-center border border-gray-800`}>
                  <TrendingUp className={`h-6 w-6 ${kpi.accentClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <Card className="power-bi-card !bg-[#151515] !border-[#2a2a2a] shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center justify-between">
              <div className="flex items-center">
                <LineChart className="h-5 w-5 mr-2 text-blue-400" />
                Monthly Tourist Predictions
              </div>
              <div className="flex space-x-2">
                {['baseline', 'optimistic', 'pessimistic'].map((scenario) => (
                  <button
                    key={scenario}
                    onClick={() => setCurrentScenario(scenario)}
                    className={`px-2 py-1 text-xs rounded-md ${currentScenario === scenario
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1b1b1b] text-slate-200 hover:bg-[#222222]'
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
              <div className="h-96 bg-gradient-to-br from-[#151515] to-[#1b1b1b] rounded-lg p-4 flex items-center justify-center border border-[#2a2a2a]">
                <div className="text-blue-300">Loading monthly data...</div>
              </div>
            ) : monthlyData.length > 0 ? (
              <div className="h-96 bg-gradient-to-br from-[#151515] to-[#1b1b1b] rounded-lg p-4 border border-[#2a2a2a]">
                <div className="space-y-2">
                  {monthlyData.map((item, index) => {
                    const maxValue = Math.max(...monthlyData.map(d => d.arrivals));
                    const percentage = maxValue > 0 ? (item.arrivals / maxValue) * 100 : 0;
                    return (
                      <div key={item.date} className="flex items-center">
                        <span className="w-10 text-xs text-gray-300 text-right">{item.month}</span>
                        <div className="flex-1 mx-2 bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="w-20 text-xs font-semibold text-gray-100 text-right">
                          {item.arrivals > 0 ? `${(item.arrivals / 1000).toFixed(0)}K` : 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-xs text-gray-400 text-center">
                  Showing {currentScenario} scenario predictions for 2026
                </div>
              </div>
            ) : (
              <div className="h-96 bg-gradient-to-br from-[#151515] to-[#1b1b1b] rounded-lg p-4 flex items-center justify-center border border-[#2a2a2a]">
                <div className="text-blue-300">No data available</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card className="power-bi-card !bg-[#151515] !border-[#2a2a2a] shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center">
              <Globe className="h-5 w-5 mr-2 text-emerald-400" />
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
                    <span className="w-6 text-xs font-semibold text-gray-300">#{item.rank}</span>
                    <span className="text-lg">{item.flag}</span>
                    <div>
                      <div className="font-medium text-sm text-white">{item.country}</div>
                      <div className="text-xs text-gray-400">{item.share}% market share</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${item.share * 4}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-gray-100 w-12 text-right">{item.share}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Arrivals Trend */}
      <div className="bg-[#151515] border border-[#2a2a2a] rounded-xl shadow-lg shadow-black/20 p-6 mt-6">
        <h3 className="text-base font-semibold text-white mb-1">Historical Arrivals (2010–2025)</h3>
        <p className="text-sm text-gray-300 mb-4">Monthly tourist arrivals across the historical period</p>
        <OverviewArrivalsTimelineChart
          data={arrivalsTimeline}
          isLoading={timelineLoading}
          error={timelineError}
          darkMode
        />
      </div>

      {/* ML Model Performance Summary */}
      <Card className="power-bi-card col-span-1 md:col-span-2 lg:col-span-4 mt-6 !bg-[#151515] !border-[#2a2a2a] shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-400" />
            Final Model Metrics Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">

            {/* 1. Individual Model Performance */}
            <div>
              <h3 className="text-md font-bold mb-4 text-gray-100">1. Individual Model Performance</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* TSFormer */}
                <div className="border rounded-lg overflow-hidden border-[#2a2a2a] bg-[#151515] shadow-sm">
                  <div className="bg-[#1b1b1b] px-4 py-3 border-b border-[#2a2a2a] font-semibold text-sm text-gray-200">
                    TSFormer Performance (BO Optimized)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700 text-sm">
                      <thead className="bg-[#151515]">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">Dataset</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-300">RMSE</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-300">R²</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-300">MAPE</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#151515] divide-y divide-[#2a2a2a]">
                        <tr>
                          <td className="px-4 py-3 text-gray-200">Train</td>
                          <td className="px-4 py-3 text-right text-gray-300">585.29</td>
                          <td className="px-4 py-3 text-right text-gray-300">0.9065</td>
                          <td className="px-4 py-3 text-right text-gray-300">14.59</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-200">Validation</td>
                          <td className="px-4 py-3 text-right text-gray-300">232.43</td>
                          <td className="px-4 py-3 text-right text-gray-300">0.9651</td>
                          <td className="px-4 py-3 text-right text-gray-300">18.82</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-white font-medium">Test</td>
                          <td className="px-4 py-3 text-right text-white font-medium">378.39</td>
                          <td className="px-4 py-3 text-right text-white font-medium">0.9379</td>
                          <td className="px-4 py-3 text-right text-white font-medium">4.14</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SVR */}
                <div className="border rounded-lg overflow-hidden border-[#2a2a2a] bg-[#151515] shadow-sm">
                  <div className="bg-[#1b1b1b] px-4 py-3 border-b border-[#2a2a2a] font-semibold text-sm text-gray-200">
                    SVR Performance (Optimized by Bayesian Optimization)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700 text-sm">
                      <thead className="bg-[#151515]">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">Dataset</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-300">RMSE</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-300">R²</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-300">MAPE</th>
                        </tr>
                      </thead>
                      <tbody className="bg-[#151515] divide-y divide-[#2a2a2a]">
                        <tr>
                          <td className="px-4 py-3 text-gray-200">Train</td>
                          <td className="px-4 py-3 text-right text-gray-300">294.11</td>
                          <td className="px-4 py-3 text-right text-gray-300">0.9794</td>
                          <td className="px-4 py-3 text-right text-gray-300">3.98</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-gray-200">Validation</td>
                          <td className="px-4 py-3 text-right text-gray-300">182.29</td>
                          <td className="px-4 py-3 text-right text-gray-300">0.9858</td>
                          <td className="px-4 py-3 text-right text-gray-300">4.19</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 text-white font-medium">Test</td>
                          <td className="px-4 py-3 text-right text-white font-medium">429.53</td>
                          <td className="px-4 py-3 text-right text-white font-medium">0.9207</td>
                          <td className="px-4 py-3 text-right text-white font-medium">3.57</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Final Ensemble Model */}
            <div className="flex flex-col items-center border-t border-[#2a2a2a] pt-8 mt-4">
              <h3 className="text-md font-bold mb-4 text-gray-100 flex flex-col sm:flex-row items-center gap-2">
                2. Final Ensemble Model Performance
                <span className="text-xs font-normal text-purple-200 bg-purple-900/40 px-3 py-1 rounded-full border border-purple-700">
                  Genetic Algorithm Optimized
                </span>
              </h3>
              <div className="border rounded-lg overflow-hidden border-purple-700 bg-[#151515] shadow-sm w-full max-w-2xl">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700 text-sm">
                    <thead className="bg-[#151515]">
                      <tr>
                        <th className="px-6 py-4 text-left font-medium text-gray-300 bg-purple-900/30">Dataset</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-300 bg-purple-900/30">RMSE</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-300 bg-purple-900/30">R²</th>
                        <th className="px-6 py-4 text-right font-medium text-gray-300 bg-purple-900/30">MAPE</th>
                      </tr>
                    </thead>
                    <tbody className="bg-[#151515] divide-y divide-[#2a2a2a]">
                      <tr>
                        <td className="px-6 py-4 text-gray-200 font-medium">Train</td>
                        <td className="px-6 py-4 text-right text-purple-300 font-medium">346.16</td>
                        <td className="px-6 py-4 text-right text-purple-300 font-medium">0.9714</td>
                        <td className="px-6 py-4 text-right text-purple-300 font-medium">9.82</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-gray-200 font-medium">Validation</td>
                        <td className="px-6 py-4 text-right text-purple-300 font-medium">186.57</td>
                        <td className="px-6 py-4 text-right text-purple-300 font-medium">0.9843</td>
                        <td className="px-6 py-4 text-right text-purple-300 font-medium">5.35</td>
                      </tr>
                      <tr className="bg-purple-900/30">
                        <td className="px-6 py-4 text-white font-bold flex items-center gap-2">
                          Test
                          <span title="Final evaluation metric" className="text-purple-300 text-lg leading-none">★</span>
                        </td>
                        <td className="px-6 py-4 text-right text-purple-200 font-bold text-base">350.79</td>
                        <td className="px-6 py-4 text-right text-purple-200 font-bold text-base">0.9495</td>
                        <td className="px-6 py-4 text-right text-purple-200 font-bold text-base">3.24</td>
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



