import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar } from 'lucide-react';

// Daily Predictions Tab Component
function DailyPredictionsComponent() {
  // Set default date to January 1, 2026
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(1); // January
  const [selectedDay, setSelectedDay] = useState(1); // 1st
  const [forecastDays, setForecastDays] = useState(7);
  const [scenariosData, setScenariosData] = useState({});
  const [currentScenario, setCurrentScenario] = useState('baseline');
  const [isLoading, setIsLoading] = useState(true);
  const [forecastData, setForecastData] = useState([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const backendUrl = 'http://localhost:8000';
        console.log('Fetching daily forecast data...');

        const response = await fetch(`${backendUrl}/api/forecasts/daily`, {
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
        console.log('Daily forecast data received:', data);

        if (!data) {
          throw new Error('No data received from server');
        }

        setScenariosData(data);

        // Keep the default date as January 1, 2026
        // No need to change the date based on data

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching daily forecast data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate forecast period based on selections
  const generateForecastPeriod = () => {
    if (isLoading || !scenariosData[currentScenario]) {
      console.log('No daily data available - loading:', isLoading, 'scenario data:', scenariosData[currentScenario]);
      return [];
    }

    const result = [];
    const currentDate = new Date(selectedYear, selectedMonth - 1, selectedDay);

    // Get the data for the current scenario
    const scenarioData = scenariosData[currentScenario] || [];

    // Create a map for fast lookup: "YYYY-MM-DD" -> data object
    const dataMap = new Map();
    scenarioData.forEach(item => {
      dataMap.set(item.date, item);
    });

    for (let i = 0; i < forecastDays; i++) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + i);

      const dateStr = nextDate.toISOString().split('T')[0];
      const dataPoint = dataMap.get(dateStr);

      if (dataPoint) {
        result.push({
          date: dateStr,
          day: nextDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          prediction: dataPoint.total_forecast,
          confidence: 95 // Default confidence value
        });
      }
    }

    return result;
  };

  // Update forecast data when dependencies change
  React.useEffect(() => {
    const data = generateForecastPeriod();
    setForecastData(data);
  }, [selectedYear, selectedMonth, selectedDay, forecastDays, currentScenario, scenariosData]);

  // Generate years array (2026 to 2030)
  const years = Array.from({ length: 5 }, (_, i) => 2026 + i);

  // Generate months array
  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  // Generate days array based on selected month and year
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Handle scenario change
  const handleScenarioChange = (scenario) => {
    setCurrentScenario(scenario);
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading daily predictions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="power-bi-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Daily Forecast Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scenario</label>
              <div className="flex space-x-2">
                {['baseline', 'optimistic', 'pessimistic'].map((scenario) => (
                  <button
                    key={scenario}
                    onClick={() => handleScenarioChange(scenario)}
                    className={`px-3 py-1 text-sm rounded-md ${currentScenario === scenario
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    {scenario.charAt(0).toUpperCase() + scenario.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Duration</label>
              <select
                value={forecastDays}
                onChange={(e) => setForecastDays(parseInt(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              Showing <strong>{currentScenario}</strong> forecast starting from {selectedDay} {months[selectedMonth - 1].name} {selectedYear} for the next {forecastDays} days
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Daily Predictions Table */}
      <Card className="power-bi-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-purple-600" />
            {forecastDays}-Day Tourist Arrival Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {forecastData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="font-semibold text-gray-800">{item.day}</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {item.prediction.toLocaleString()}
                  </div>
                  <Badge variant="outline">
                    Confidence: {item.confidence}%
                  </Badge>
                </div>
              </div>
            ))}
            {forecastData.length === 0 && !isLoading && (
              <div className="p-4 text-center text-gray-500">No data available for the selected period.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DailyPredictionsComponent;
