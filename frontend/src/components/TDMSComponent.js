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

  // Advanced Capacity Management State
  const [capacityAlerts, setCapacityAlerts] = useState([]);
  const [seasonalAnalysis, setSeasonalAnalysis] = useState({});
  const [infrastructureLoad, setInfrastructureLoad] = useState({});
  const [emergencyScenarios, setEmergencyScenarios] = useState([]);
  const [alertThreshold, setAlertThreshold] = useState(80);

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

  // Advanced Capacity Management - Real-time Alerts
  useEffect(() => {
    if (dashboardData?.vli_scores) {
      const alerts = dashboardData.vli_scores
        .filter(site => site.vli_score > alertThreshold)
        .map(site => ({
          site: site.site,
          vli_score: site.vli_score,
          severity: site.vli_score > 120 ? 'critical' : site.vli_score > 100 ? 'high' : 'moderate',
          visitors: site.visitors,
          capacity_utilization: ((site.vli_score / 100) * 100).toFixed(1),
          timestamp: new Date().toISOString()
        }));
      
      setCapacityAlerts(alerts);
      console.log('TDMSComponent: Capacity alerts generated:', alerts);
    }
  }, [dashboardData, alertThreshold]);

  // Seasonal Capacity Planning Analysis
  useEffect(() => {
    if (selectedSite && monthlyData.length > 0) {
      const monthlyAvg = monthlyData.reduce((sum, month) => sum + month.total_visitors, 0) / monthlyData.length;
      const peakMonth = monthlyData.reduce((max, month) => 
        month.total_visitors > max.total_visitors ? month : max, monthlyData[0]);
      const offPeakMonth = monthlyData.reduce((min, month) => 
        month.total_visitors < min.total_visitors ? month : min, monthlyData[0]);
      
      const seasonalVariation = ((peakMonth.total_visitors - offPeakMonth.total_visitors) / offPeakMonth.total_visitors) * 100;
      
      setSeasonalAnalysis({
        site: selectedSite,
        monthly_average: Math.round(monthlyAvg),
        peak_month: peakMonth.month,
        peak_visitors: peakMonth.total_visitors,
        off_peak_month: offPeakMonth.month,
        off_peak_visitors: offPeakMonth.total_visitors,
        seasonal_variation_percent: seasonalVariation.toFixed(1),
        strategy: seasonalVariation > 50 ? 'high_variation' : seasonalVariation > 25 ? 'moderate_variation' : 'stable'
      });
    }
  }, [selectedSite, monthlyData]);

  // Infrastructure Load Balancing Analysis
  useEffect(() => {
    if (dashboardData?.vli_scores) {
      const loadAnalysis = dashboardData.vli_scores.map(site => {
        const utilizationRate = (site.vli_score / 100) * 100;
        const loadCategory = utilizationRate > 100 ? 'overloaded' : 
                           utilizationRate > 80 ? 'high_load' : 
                           utilizationRate > 60 ? 'moderate_load' : 'optimal';
        
        return {
          ...site,
          utilization_rate: utilizationRate.toFixed(1),
          load_category: loadCategory,
          recommended_action: getRecommendedAction(loadCategory),
          infrastructure_stress: utilizationRate > 100 ? 'critical' : utilizationRate > 80 ? 'high' : 'normal'
        };
      });
      
      setInfrastructureLoad({
        analysis_date: selectedDate,
        total_sites: loadAnalysis.length,
        overloaded_sites: loadAnalysis.filter(s => s.load_category === 'overloaded').length,
        high_load_sites: loadAnalysis.filter(s => s.load_category === 'high_load').length,
        optimal_sites: loadAnalysis.filter(s => s.load_category === 'optimal').length,
        site_analysis: loadAnalysis
      });
    }
  }, [dashboardData, selectedDate]);

  // Helper function for infrastructure recommendations
  const getRecommendedAction = (loadCategory) => {
    const actions = {
      'overloaded': 'Immediate visitor redistribution required',
      'high_load': 'Consider visitor flow management',
      'moderate_load': 'Monitor capacity utilization',
      'optimal': 'Current load is acceptable'
    };
    return actions[loadCategory] || 'Monitor capacity levels';
  };

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

        {/* View 1: Prediction Insights with Advanced Capacity Management */}
        <TabsContent value="insights" className="space-y-6">
          {/* Real-time Capacity Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                  Real-time Capacity Alerts
                </span>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Alert Threshold:</label>
                  <select 
                    value={alertThreshold} 
                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value={70}>70%</option>
                    <option value={80}>80%</option>
                    <option value={90}>90%</option>
                    <option value={100}>100%</option>
                  </select>
                </div>
              </CardTitle>
              <CardDescription>
                Sites exceeding VLI threshold - {capacityAlerts.length} sites affected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {capacityAlerts.length > 0 ? (
                <div className="space-y-3">
                  {capacityAlerts.map((alert, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'bg-red-50 border-red-600' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-600' :
                      'bg-yellow-50 border-yellow-600'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-800">{alert.site}</h4>
                          <p className="text-sm text-gray-600">
                            VLI: {alert.vli_score.toFixed(1)}% | 
                            Visitors: {alert.visitors.toLocaleString()} | 
                            Utilization: {alert.capacity_utilization}%
                          </p>
                        </div>
                        <Badge className={
                          alert.severity === 'critical' ? 'bg-red-600' :
                          alert.severity === 'high' ? 'bg-orange-600' :
                          'bg-yellow-600'
                        }>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-green-600 text-lg mb-2">✓ All Sites Operating Normally</div>
                  <p>No sites exceeding {alertThreshold}% VLI threshold</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seasonal Capacity Planning */}
          {seasonalAnalysis.site && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Seasonal Capacity Planning - {seasonalAnalysis.site}
                </CardTitle>
                <CardDescription>
                  Peak/off-season analysis for strategic resource allocation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {seasonalAnalysis.monthly_average.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Monthly Average</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-800">{seasonalAnalysis.peak_month}</div>
                    <div className="text-2xl font-bold text-green-600">
                      {seasonalAnalysis.peak_visitors.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Peak Month</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-lg font-semibold text-orange-800">{seasonalAnalysis.off_peak_month}</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {seasonalAnalysis.off_peak_visitors.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Off-Peak Month</div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">Seasonal Variation:</span>
                    <Badge className={
                      seasonalAnalysis.strategy === 'high_variation' ? 'bg-red-100 text-red-800' :
                      seasonalAnalysis.strategy === 'moderate_variation' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {seasonalAnalysis.seasonal_variation_percent}%
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Recommended Strategy:</strong> {
                      seasonalAnalysis.strategy === 'high_variation' ? 'Implement aggressive visitor redistribution during peak months' :
                      seasonalAnalysis.strategy === 'moderate_variation' ? 'Consider seasonal pricing adjustments' :
                      'Maintain current capacity levels'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Infrastructure Load Balancing */}
          {infrastructureLoad.total_sites && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                  Infrastructure Load Balancing
                </CardTitle>
                <CardDescription>
                  System-wide capacity utilization and recommended actions - {infrastructureLoad.analysis_date}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{infrastructureLoad.optimal_sites}</div>
                    <div className="text-sm text-gray-600">Optimal Sites</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{infrastructureLoad.high_load_sites}</div>
                    <div className="text-sm text-gray-600">High Load Sites</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{infrastructureLoad.overloaded_sites}</div>
                    <div className="text-sm text-gray-600">Overloaded Sites</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{infrastructureLoad.total_sites}</div>
                    <div className="text-sm text-gray-600">Total Sites</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {infrastructureLoad.site_analysis?.map((site, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      site.load_category === 'overloaded' ? 'bg-red-50 border-red-200' :
                      site.load_category === 'high_load' ? 'bg-orange-50 border-orange-200' :
                      site.load_category === 'moderate_load' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-800">{site.site}</h4>
                          <div className="text-sm text-gray-600">
                            VLI: {site.vli_score.toFixed(1)}% | 
                            Utilization: {site.utilization_rate}% | 
                            Visitors: {site.visitors.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={`mb-2 ${
                            site.load_category === 'overloaded' ? 'bg-red-600' :
                            site.load_category === 'high_load' ? 'bg-orange-600' :
                            site.load_category === 'moderate_load' ? 'bg-yellow-600' :
                            'bg-green-600'
                          }`}>
                            {site.load_category.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div className="text-xs text-gray-600 mt-1 max-w-xs">
                            {site.recommended_action}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Response Planning */}
          {dashboardData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Emergency Response Planning
              </CardTitle>
              <CardDescription>
                Overcrowding mitigation scenarios and response strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Critical Overcrowding</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Trigger:</strong> VLI &gt; 120% for 2+ hours</p>
                      <p><strong>Immediate Actions:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Activate visitor flow control</li>
                        <li>Deploy additional staff</li>
                        <li>Initiate redistribution to nearby sites</li>
                        <li>Activate emergency transport</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-2">High Capacity Strain</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Trigger:</strong> VLI &gt; 100-120% for 4+ hours</p>
                      <p><strong>Response Actions:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Implement timed entry system</li>
                        <li>Increase security presence</li>
                        <li>Prepare contingency transport</li>
                        <li>Alert nearby facilities</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Proactive Mitigation Strategies</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Dynamic Pricing:</span>
                      <Badge className="bg-green-600">Recommended</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Visitor Caps:</span>
                      <Badge className="bg-green-600">Implement</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Real-time Monitoring:</span>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span>Alternative Routes:</span>
                      <Badge className="bg-yellow-600">Plan</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mt-4">
                  <Button className="bg-red-600 hover:bg-red-700">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Run Emergency Simulation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

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
