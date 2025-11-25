import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MapPin, AlertTriangle, Download, RefreshCw, Calendar, BarChart3 } from 'lucide-react';

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
      try {
        const [datesResponse, sitesResponse] = await Promise.all([
          axios.get('http://localhost:8000/api/tdms/dates'),
          axios.get('http://localhost:8000/api/tdms/sites')
        ]);
        if (datesResponse.data.dates.length > 0) {
          setAvailableDates(datesResponse.data.dates);
          setSelectedDate(datesResponse.data.dates[0]);
        }
        if (sitesResponse.data.sites.length > 0) {
          setAvailableSites(sitesResponse.data.sites);
          setSelectedSite(sitesResponse.data.sites[0]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  // Load monthly data when site and year change
  useEffect(() => {
    if (selectedSite && selectedYear) {
      const fetchMonthlyData = async () => {
        try {
          const response = await axios.get(`http://localhost:8000/api/tdms/monthly/${selectedSite}/${selectedYear}`);
          setMonthlyData(response.data.monthly_data || []);
        } catch (error) {
          console.error('Error fetching monthly data:', error);
          setMonthlyData([]);
        }
      };
      fetchMonthlyData();
    }
  }, [selectedSite, selectedYear]);

  // Load dashboard data when date changes
  useEffect(() => {
    if (selectedDate) {
      const fetchDashboardData = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`http://localhost:8000/api/tdms/dashboard/${selectedDate}`);
          setDashboardData(response.data);
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchDashboardData();
    }
  }, [selectedDate]);

  // Helper function to get VLI color
  const getVLIColor = (score) => {
    if (score > 120) return 'bg-red-600';
    if (score > 100) return 'bg-orange-600';
    if (score > 80) return 'bg-yellow-600';
    return 'bg-green-600';
  };

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
                    <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="">Select a site...</option>
                      {availableSites.map(site => <option key={site} value={site}>{site}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Year</label>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Yearly Peak Demand</p>
                      <p className="text-xl font-bold text-blue-600">
                        {monthlyData.length > 0 ? Math.max(...monthlyData.map(m => m.total_visitors)).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Aggregation Chart</CardTitle>
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
                  <div className="flex items-center justify-center h-full text-gray-500">Select a site and year to view monthly data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* View 2: VLI Intelligence */}
        <TabsContent value="vli" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>National Grid Heatmap</CardTitle>
              <CardDescription>15-tile grid representing all sites in network - {selectedDate}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {dashboardData?.vli_scores?.map((site) => (
                  <div key={site.site} className={`${getVLIColor(site.vli_score)} p-4 rounded-lg text-white text-center`}>
                    <h3 className="font-semibold text-sm mb-2">{site.site}</h3>
                    <div className="text-2xl font-bold">{Math.round(site.vli_score)}%</div>
                    <div className="text-xs opacity-90">{site.visitors} visitors</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5-Year Trajectory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="visitors" stroke="#3B82F6" name="Visitors" />
                      <Line type="monotone" dataKey="vli_score" stroke="#EF4444" name="VLI Score" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">Select a site to view 5-year trend</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="redistribution"><div>Redistribution Placeholder</div></TabsContent>
      </Tabs>
    </div>
  );
}