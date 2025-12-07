import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MapPin, AlertTriangle, Download, RefreshCw, Calendar, BarChart3 } from 'lucide-react';

// TDMS Component
export default function TDMSComponent() {
  const [selectedDate, setSelectedDate] = useState('2026-01-01');
  const [availableDates, setAvailableDates] = useState([]);
  const [availableSites, setAvailableSites] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [monthlyData, setMonthlyData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [sourceSite, setSourceSite] = useState('');
  const [targetSite, setTargetSite] = useState('');
  const [distributionPercentage, setDistributionPercentage] = useState(0);
  const [simulatedData, setSimulatedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('insights');

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      console.log('TDMSComponent: Starting to fetch initial data...');
      try {
        const [datesResponse, sitesResponse] = await Promise.all([
          axios.get('http://localhost:8000/api/tdms/dates'),
          axios.get('http://localhost:8000/api/tdms/sites')
        ]);

        console.log('TDMSComponent: Dates response:', datesResponse.data);
        console.log('TDMSComponent: Sites response:', sitesResponse.data);

        if (datesResponse.data.dates.length > 0) {
          setAvailableDates(datesResponse.data.dates);
          setSelectedDate(datesResponse.data.dates[0]);
          console.log('TDMSComponent: Set dates and selected date');
        }

        if (sitesResponse.data.sites.length > 0) {
          setAvailableSites(sitesResponse.data.sites);
          setSelectedSite(sitesResponse.data.sites[0]);
          console.log('TDMSComponent: Set sites and selected site');
        }
      } catch (error) {
        console.error('TDMSComponent: Error fetching initial data:', error);
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  // Load dashboard data when date changes
  useEffect(() => {
    if (selectedDate) {
      const fetchDashboardData = async () => {
        setLoading(true);
        console.log('TDMSComponent: Fetching dashboard data for date:', selectedDate);
        try {
          const response = await axios.get(`http://localhost:8000/api/tdms/dashboard/${selectedDate}`);
          console.log('TDMSComponent: Dashboard response:', response.data);
          setDashboardData(response.data);
          console.log('TDMSComponent: Dashboard data set');
        } catch (error) {
          console.error('TDMSComponent: Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchDashboardData();
    }
  }, [selectedDate]);

  // Load monthly data when site and year change
  useEffect(() => {
    if (selectedSite && selectedYear) {
      const fetchMonthlyData = async () => {
        console.log('TDMSComponent: Fetching monthly data for site:', selectedSite, 'year:', selectedYear);
        try {
          const response = await axios.get(`http://localhost:8000/api/tdms/monthly/${selectedSite}/${selectedYear}`);
          console.log('TDMSComponent: Monthly data response:', response.data);
          setMonthlyData(response.data.monthly_data || []);
        } catch (error) {
          console.error('TDMSComponent: Error fetching monthly data:', error);
          setMonthlyData([]);
        }
      };
      fetchMonthlyData();
    }
  }, [selectedSite, selectedYear]);

  // Load simulated data when redistribution parameters change
  useEffect(() => {
    if (sourceSite && targetSite && distributionPercentage > 0 && dashboardData) {
      const fetchSimulatedData = async () => {
        console.log('TDMSComponent: Running simulation for source:', sourceSite, 'target:', targetSite, 'percentage:', distributionPercentage);
        try {
          // For now, create mock simulated data based on current dashboard data
          const originalData = dashboardData.vli_scores || [];
          const simulatedData = originalData.map(site => {
            if (site.site === sourceSite) {
              // Reduce visitors from source site
              const originalVisitors = site.visitors;
              const reductionAmount = Math.floor(originalVisitors * (distributionPercentage / 100));
              const newVisitors = originalVisitors - reductionAmount;
              const newVliScore = Math.max(0, site.vli_score * (newVisitors / originalVisitors));
              
              return {
                ...site,
                original_vli: site.vli_score,
                simulated_vli: newVliScore,
                visitors: newVisitors
              };
            } else if (site.site === targetSite) {
              // Add visitors to target site
              const sourceData = originalData.find(s => s.site === sourceSite);
              const originalVisitors = site.visitors;
              const sourceVisitors = sourceData ? sourceData.visitors : 0;
              const additionAmount = Math.floor(sourceVisitors * (distributionPercentage / 100));
              const newVisitors = originalVisitors + additionAmount;
              const newVliScore = site.vli_score * (newVisitors / originalVisitors);
              
              return {
                ...site,
                original_vli: site.vli_score,
                simulated_vli: newVliScore,
                visitors: newVisitors
              };
            } else {
              return {
                ...site,
                original_vli: site.vli_score,
                simulated_vli: site.vli_score,
                visitors: site.visitors
              };
            }
          });
          
          console.log('TDMSComponent: Simulated data calculated:', simulatedData);
          setSimulatedData(simulatedData);
        } catch (error) {
          console.error('TDMSComponent: Error calculating simulation:', error);
        }
      };
      fetchSimulatedData();
    }
  }, [sourceSite, targetSite, distributionPercentage, dashboardData]);

  // Helper function to get VLI color
  const getVLIColor = (score) => {
    if (score > 120) return 'bg-red-600';
    if (score > 100) return 'bg-orange-600';
    if (score > 80) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  if (loading && !dashboardData) {
    console.log('TDMSComponent: Showing loading state');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading TDMS data...</div>
      </div>
    );
  }

  console.log('TDMSComponent: Rendering main component');
  console.log('TDMSComponent: Available dates:', availableDates.length);
  console.log('TDMSComponent: Available sites:', availableSites.length);
  console.log('TDMSComponent: Dashboard data:', dashboardData ? 'present' : 'missing');
  console.log('TDMSComponent: Selected date:', selectedDate);
  console.log('TDMSComponent: Selected site:', selectedSite);

  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tourist Distribution Management System</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Select Date:</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => {}} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export System Report</span>
          </Button>
          <Button onClick={() => {}} variant="outline" className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Reload Data</span>
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">Prediction Insights</TabsTrigger>
          <TabsTrigger value="vli">VLI Intelligence</TabsTrigger>
          <TabsTrigger value="redistribution">Redistribution Simulator</TabsTrigger>
        </TabsList>

        {/* View 1: Prediction Insights */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Site & Year Selection</CardTitle>
                <CardDescription>Select a site and year to view prediction insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Site</label>
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a site...</option>
                      {availableSites.map(site => (
                        <option key={site} value={site}>{site}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2029">2029</option>
                      <option value="2030">2030</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>KPI Metrics</CardTitle>
                <CardDescription>Key performance indicators for selected site and year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Yearly Peak Demand</p>
                        <p className="text-xl font-bold text-blue-600">
                          {monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.total_visitors)).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <TrendingUp className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Average Monthly Volume</p>
                        <p className="text-xl font-bold text-green-600">
                          {monthlyData.length > 0 ? Math.round(monthlyData.reduce((sum, m) => sum + m.total_visitors, 0) / monthlyData.length).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <BarChart3 className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Aggregation Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Aggregation Chart</CardTitle>
              <CardDescription>Total predicted visitors per month for {selectedSite} - {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total_visitors" fill="#3B82F6" name="Total Visitors" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a site and year to view monthly data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* View 2: VLI Intelligence */}
        <TabsContent value="vli" className="space-y-6">
          {/* National Grid Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>National Grid Heatmap</CardTitle>
              <CardDescription>15-tile grid representing all sites in network - {selectedDate}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {dashboardData?.vli_scores?.map((site) => (
                  <div
                    key={site.site}
                    className={`${getVLIColor(site.vli_score)} p-4 rounded-lg text-white text-center`}
                  >
                    <h3 className="font-semibold text-sm mb-2">{site.site}</h3>
                    <div className="text-2xl font-bold">{Math.round(site.vli_score)}%</div>
                    <div className="text-xs opacity-90">{site.visitors} visitors</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 5-Year Trajectory */}
          <Card>
            <CardHeader>
              <CardTitle>5-Year Trajectory</CardTitle>
              <CardDescription>Growth trend for selected site (weekly downsampled data)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a site...</option>
                  {availableSites.map(site => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>

                <div className="h-80">
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="visitors" stroke="#3B82F6" name="Visitors" />
                        <Line type="monotone" dataKey="vli_score" stroke="#EF4444" name="VLI Score" />
                      </ReLineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Select a site to view 5-year trend
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* View 3: Redistribution Simulator */}
        <TabsContent value="redistribution" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Redistribution Controls</CardTitle>
                <CardDescription>Configure visitor redistribution between sites</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Source Node</label>
                      <select
                        value={sourceSite}
                        onChange={(e) => setSourceSite(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select source...</option>
                        {dashboardData?.vli_scores?.map((site) => (
                          <option key={site.site} value={site.site}>{site.site}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Node</label>
                      <select
                        value={targetSite}
                        onChange={(e) => setTargetSite(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select target...</option>
                        {dashboardData?.vli_scores?.map((site) => (
                          <option key={site.site} value={site.site}>{site.site}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distribution Percentage: {distributionPercentage}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={distributionPercentage}
                      onChange={(e) => setDistributionPercentage(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comparison Chart</CardTitle>
                <CardDescription>Original vs Simulated VLI Scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {simulatedData && sourceSite && targetSite ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simulatedData.filter(site => site.site === sourceSite || site.site === targetSite)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="site" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="original_vli" fill="#3B82F6" name="Original VLI" />
                        <Bar dataKey="simulated_vli" fill="#10B981" name="Simulated VLI" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Select source and target sites to view comparison
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
