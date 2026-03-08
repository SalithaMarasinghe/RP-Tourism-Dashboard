import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Download } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import GeopoliticalTile from './GeopoliticalTile';

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
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
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

  // Prepare chart data from filtered predictions
  const chartData = React.useMemo(() => {
    return forecastData.map(item => ({
      month: item.month,
      arrivals: typeof item.prediction === 'number' ? item.prediction : 0,
      externalFactors: item.externalFactors || []
    }));
  }, [forecastData]);

  // Helper functions for chart
  const formatNumberWithCommas = (value) => {
    return value.toLocaleString();
  };

  const formatTooltip = (value, name) => {
    return [formatNumberWithCommas(value), 'Predicted Arrivals'];
  };

  const formatFactor = (percentage) => {
    const value = parseFloat(percentage);
    const color = value >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{percentage}</span>;
  };

  // Custom Tooltip Component with External Factors
  const CustomTooltip = ({ active, payload, label }) => {
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

  // PDF Export Handler
  const handleExportPredictions = () => {
    // Check if predictions are available
    if (!forecastData || forecastData.length === 0 || isLoading) {
      alert('Please generate predictions first before exporting');
      return;
    }

    // Initialize PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Set colors
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
    doc.text('Sri Lanka Tourism Predictions Report', pageWidth / 2, 20, { align: 'center' });

    // Subtitle with scenario and date range
    const startMonthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    const endMonth = new Date(selectedYear, selectedMonth - 1 + forecastMonths);
    const endMonthName = endMonth.toLocaleString('default', { month: 'long' });
    const endYear = endMonth.getFullYear();

    doc.setFontSize(14);
    doc.setTextColor(60);
    doc.text(`${currentScenario.charAt(0).toUpperCase() + currentScenario.slice(1)} Scenario - ${startMonthName} ${selectedYear} to ${endMonthName} ${endYear}`, pageWidth / 2, 30, { align: 'center' });

    // Date generated
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 38, { align: 'center' });

    let yPosition = 50;

    // Process each month
    forecastData.forEach((monthData, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Month header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...headerColor);
      doc.text(`Month: ${monthData.month}`, 20, yPosition);
      yPosition += 10;

      // Predicted arrivals
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60);
      const arrivalsText = monthData.prediction !== '-'
        ? `Predicted Arrivals: ${monthData.prediction.toLocaleString()}`
        : 'Predicted Arrivals: -';
      doc.text(arrivalsText, 20, yPosition);
      yPosition += 12;

      // External factors table if available
      if (monthData.externalFactors && monthData.externalFactors.length > 0) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('External Factor Contributions:', 20, yPosition);
        yPosition += 8;

        // Create table data
        const tableData = monthData.externalFactors.map(factor => [
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
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    const filename = `SL_Tourism_Predictions_${monthName}_${selectedYear}_${forecastMonths}months.pdf`;

    // Save the PDF
    doc.save(filename);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Monthly <span className="text-blue-600">Predictions</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Executive monitoring of month-level forecasts and scenario signals.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
          {isLoading && <span className="text-sm text-gray-500">Loading data...</span>}
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleExportPredictions}>
            <Download className="h-4 w-4 mr-1" />
            Export Predictions
          </Button>
        </div>
      </div>

      {/* Geopolitical Situation-Adjusted Prediction Tile */}
      <GeopoliticalTile />

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

      {/* Monthly Tourist Arrival Forecast Chart - MOVED UP */}
      {forecastData.length > 0 && (
        <Card className="power-bi-card mt-6 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Monthly Tourist Arrival Forecast Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  angle={-45}
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={formatNumberWithCommas}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
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

      {/* Forecast Results - MOVED DOWN */}
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
