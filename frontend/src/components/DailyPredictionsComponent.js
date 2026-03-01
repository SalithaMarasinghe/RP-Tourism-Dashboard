import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';

// Daily Predictions Tab Component
function DailyPredictionsComponent() {
  // Set default date to TODAY (current date when user views dashboard)
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // JavaScript months are 0-11, we need 1-12
  const [selectedDay, setSelectedDay] = useState(today.getDate());
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

  // Prepare chart data from filtered daily predictions
  const dailyChartData = React.useMemo(() => {
    return forecastData.map(item => ({
      date: item.day,
      arrivals: typeof item.prediction === 'number' ? item.prediction : 0,
      externalFactors: item.externalFactors || []
    }));
  }, [forecastData]);

  // Helper functions for chart (matching monthly implementation)
  const formatNumberWithCommas = (value) => {
    return value.toLocaleString();
  };

  const formatTooltip = (value, name) => {
    return [formatNumberWithCommas(value), 'Predicted Arrivals'];
  };

  const truncateDate = (dateString) => {
    // "Friday, January 2, 2026" → "Fri, Jan 2"
    if (typeof dateString !== 'string') return dateString;
    const parts = dateString.split(', ');
    if (parts.length >= 2) {
      return parts[0].substring(0, 3) + ', ' + parts[1].replace(/ 20\d{2}$/, '');
    }
    return dateString;
  };

  const formatFactor = (percentage) => {
    const value = parseFloat(percentage);
    const color = value >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{percentage}</span>;
  };

  // Custom Tooltip Component for Daily Chart (same as monthly)
  const DailyCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Convert external factors array to object for easier access
      const factorsMap = {};
      if (data.externalFactors && Array.isArray(data.externalFactors)) {
        data.externalFactors.forEach(factor => {
          // Convert factor names to match expected keys
          const key = factor.name.toLowerCase().replace(/\s+/g, '_');
          factorsMap[key] = factor.value;
        });
      }

      return (
        <div className="bg-white p-4 shadow-lg rounded-lg" style={{ minWidth: '280px', maxWidth: '320px' }}>
          <div className="font-semibold text-gray-900 mb-2">{label}</div>
          <div className="font-medium text-purple-600 mb-3">
            Predicted Arrivals: {data.arrivals.toLocaleString()}
          </div>
          <div className="space-y-1 text-sm">
            <div className="font-medium text-gray-700 mb-1">External Factor Contributions:</div>
            <div>• Economic Indicators: {formatFactor(factorsMap.economic_indicators || '0%')}</div>
            <div>• Exchange Rates: {formatFactor(factorsMap.exchange_rates || '0%')}</div>
            <div>• Weather: {formatFactor(factorsMap.weather || '0%')}</div>
            <div>• Google Trends: {formatFactor(factorsMap.google_trends || '0%')}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Generate years array (current year to 3 years ahead)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear + i);

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

  // PDF Export Handler for Daily Predictions
  const handleExportDailyPredictions = () => {
    // Check if predictions are available
    if (!forecastData || forecastData.length === 0 || isLoading) {
      alert('Please generate daily predictions first before exporting');
      return;
    }

    // Initialize PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Set colors (matching monthly export)
    const headerColor = [44, 62, 80]; // Dark header background (#2c3e50)
    const accentColor = [147, 51, 234]; // Purple accent (#9333ea)
    
    // Helper function to add page numbers
    const addPageNumbers = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
      }
    };

    // Title and Header
    doc.setFontSize(18);
    doc.setTextColor(...headerColor);
    doc.text('Sri Lanka Tourism Daily Predictions Report', pageWidth / 2, 20, { align: 'center' });
    
    // Subtitle with scenario and date range
    const startMonthName = months[selectedMonth - 1].name;
    const startDate = `${selectedDay} ${startMonthName} ${selectedYear}`;
    
    doc.setFontSize(14);
    doc.setTextColor(60);
    doc.text(`${currentScenario.charAt(0).toUpperCase() + currentScenario.slice(1)} Scenario - ${startDate} for ${forecastDays} Days`, pageWidth / 2, 30, { align: 'center' });
    
    // Date generated
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 38, { align: 'center' });
    
    let yPosition = 50;
    
    // Process each day
    forecastData.forEach((dayData, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Date header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...headerColor);
      doc.text(`Date: ${dayData.day}`, 20, yPosition);
      yPosition += 10;
      
      // Predicted arrivals
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60);
      const arrivalsText = dayData.prediction !== undefined && dayData.prediction !== null
        ? `Predicted Arrivals: ${dayData.prediction.toLocaleString()}`
        : 'Predicted Arrivals: -';
      doc.text(arrivalsText, 20, yPosition);
      yPosition += 12;
      
      // External factors table if available (check if data has external factors)
      if (dayData.externalFactors && dayData.externalFactors.length > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('External Factor Contributions:', 20, yPosition);
        yPosition += 8;
        
        // Create table data
        const tableData = dayData.externalFactors.map(factor => [
          factor.name,
          `${factor.value}%`
        ]);
        
        // Add table using autoTable
        autoTable(doc, {
          head: [['Factor', 'Contribution']],
          body: tableData,
          startY: yPosition,
          margin: { left: 20, right: 20 },
          styles: {
            fontSize: 10,
            cellPadding: 3,
            textColor: [60, 60, 60]
          },
          headStyles: {
            fillColor: headerColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245]
          }
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
      } else {
        yPosition += 8;
      }
      
      // Add separator line
      if (index < forecastData.length - 1) {
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }
    });
    
    // Add page numbers
    addPageNumbers();
    
    // Generate filename
    const filename = `SL_Tourism_Daily_Predictions_${selectedDay}_${startMonthName}_${selectedYear}_${forecastDays}Days.pdf`;
    
    // Save the PDF
    doc.save(filename);
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading daily predictions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="power-bi-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Daily Forecast Filters</CardTitle>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleExportDailyPredictions}>
              <Download className="h-4 w-4 mr-1" />
              Export Predictions
            </Button>
          </div>
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

      {/* Daily Tourist Arrival Forecast Chart - MOVED UP */}
      {forecastData.length > 0 && (
        <Card className="power-bi-card mt-6 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Daily Tourist Arrival Forecast Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  height={80}
                  tickFormatter={truncateDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={formatNumberWithCommas}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<DailyCustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="arrivals" 
                  stroke="#9333ea" 
                  fill="#f3e8ff" 
                  fillOpacity={0.6}
                />
                <Line 
                  type="monotone" 
                  dataKey="arrivals" 
                  stroke="#9333ea" 
                  strokeWidth={3}
                  dot={{ fill: '#9333ea', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Daily Predictions Table - MOVED DOWN */}
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
