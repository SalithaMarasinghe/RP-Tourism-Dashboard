import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Download, RefreshCw } from 'lucide-react';
import axios from 'axios';

// Monthly Predictions Tab Component
function MonthlyPredictionsComponent() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [forecastMonths, setForecastMonths] = useState(6);
  const [scenariosData, setScenariosData] = useState({});
  const [currentScenario, setCurrentScenario] = useState('baseline');
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = 'http://localhost:8000';
        console.log('Fetching data from:', `${backendUrl}/api/forecasts/scenarios`);

        // First test the CORS connection
        try {
          const testResponse = await fetch(`${backendUrl}/api/test`, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          console.log('Test endpoint response:', await testResponse.json());
        } catch (testError) {
          console.error('Test endpoint error:', testError);
        }

        // Fetch the actual scenario data
        const response = await axios.get(`${backendUrl}/api/forecasts/scenarios`);
        console.log('API Response:', response.data);

        // Transform the data to the expected format
        const transformedData = {
          baseline: response.data.baseline || [],
          optimistic: response.data.optimistic || [],
          pessimistic: response.data.pessimistic || []
        };

        console.log('Transformed data:', transformedData);
        setScenariosData(transformedData);
        setIsLoading(false);

      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate forecast period data
  const generateForecastPeriod = () => {
    const result = [];
    const scenarioData = scenariosData[currentScenario] || [];
    
    console.log('Generating forecast for:', { currentScenario, currentYear: selectedYear, currentMonth: selectedMonth, forecastMonths });
    console.log('Scenario data:', scenarioData);

    let currentMonth = selectedMonth;
    let currentYear = selectedYear;

    for (let i = 0; i < forecastMonths; i++) {
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }

      const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });

      // Find the data point for this month and year
      const dataPoint = scenarioData.find(
        item => {
          const itemDate = new Date(item.date);
          return itemDate.getFullYear() === currentYear && itemDate.getMonth() + 1 === currentMonth;
        }
      );

      if (dataPoint) {
        // Get external factors, defaulting to an empty object if not present
        const externalFactors = dataPoint.external_factor_contributions_pct || {};

        // Filter out factors with 0% contribution for cleaner display
        const activeFactors = Object.entries(externalFactors)
          .filter(([_, value]) => value && parseFloat(value) !== 0)
          .map(([key, value]) => ({
            name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
            value: parseFloat(value).toFixed(1) // Format to 1 decimal place
          }));

        result.push({
          month: `${monthName} ${currentYear}`,
          monthValue: currentMonth,
          year: currentYear,
          prediction: dataPoint.total_forecast,
          confidence: 95, // Default confidence value
          externalFactors: activeFactors
        });
      } else {
        // If no data point is found, add a placeholder
        result.push({
          month: `${monthName} ${currentYear}`,
          monthValue: currentMonth,
          year: currentYear,
          prediction: '-',
          confidence: 0,
          externalFactors: []
        });
      }

      currentMonth++;
    }

    return result;
  };

  const forecastData = React.useMemo(() => generateForecastPeriod(), [selectedYear, selectedMonth, forecastMonths, currentScenario, scenariosData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Machine Learning Predictions</h2>
        {isLoading && <span className="text-sm text-gray-500 ml-4">Loading data...</span>}
        <div className="flex space-x-2">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-1" />
            Export Predictions
          </Button>
          <Button size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-1" />
            Retrain Model
          </Button>
        </div>
      </div>

      {/* Date and Scenario Selector */}
      <Card className="power-bi-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Forecast Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={2026 + i} value={2026 + i}>
                    {2026 + i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Months</label>
              <select
                value={forecastMonths}
                onChange={(e) => setForecastMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
                <option value={24}>24 Months</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scenario</label>
              <select
                value={currentScenario}
                onChange={(e) => setCurrentScenario(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="baseline">Baseline</option>
                <option value="optimistic">Optimistic</option>
                <option value="pessimistic">Pessimistic</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Results */}
      <Card className="power-bi-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Forecast Results</CardTitle>
          <CardDescription>
            Predicted visitor numbers for the next {forecastMonths} months under {currentScenario} scenario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {forecastData.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <div className="font-semibold text-gray-800">{item.month}</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {item.prediction !== '-' ? item.prediction.toLocaleString() : '-'}
                    </div>
                    <Badge variant="outline" className="bg-white">
                      Confidence: {item.confidence}%
                    </Badge>
                  </div>
                </div>

                {/* External Factors Section */}
                {item.externalFactors && item.externalFactors.length > 0 && (
                  <div className="px-4 pb-3 pt-1 bg-gray-100 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">External Factors:</div>
                    <div className="flex flex-wrap gap-2">
                      {item.externalFactors.map((factor, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-white">
                          {factor.name}: {factor.value}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {forecastData.length === 0 && !isLoading && (
              <div className="p-4 text-center text-gray-500">No data available for the selected period.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placeholder for future charts if needed */}
      </div>
    </div>
  );
}

export default MonthlyPredictionsComponent;
