import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import { TrendingUp, Users, MapPin, AlertTriangle, Download, RefreshCw, Calendar, BarChart3, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
  const [activeView, setActiveView] = useState('predictions'); // Default to predictions tab

  // Advanced Capacity Management State
  const [capacityAlerts, setCapacityAlerts] = useState([]);
  const [seasonalAnalysis, setSeasonalAnalysis] = useState({});
  const [infrastructureLoad, setInfrastructureLoad] = useState({});
  const [emergencyScenarios, setEmergencyScenarios] = useState([]);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [selectedSeasonalSite, setSelectedSeasonalSite] = useState('');
  const [selectedSeasonalYear, setSelectedSeasonalYear] = useState('2026');
  const [visitorCaps, setVisitorCaps] = useState([]);
  const [selectedEmergencySite, setSelectedEmergencySite] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [dailyData, setDailyData] = useState([]);
  const [showDailyChart, setShowDailyChart] = useState(false);
  const [trajectoryView, setTrajectoryView] = useState('visitors'); // 'visitors' or 'vli'
  const [autoCappedSites, setAutoCappedSites] = useState([]);
  const [infrastructureView, setInfrastructureView] = useState('cards'); // 'cards' or 'grid'
  const [vliView, setVliView] = useState('heatmap'); // 'heatmap' or 'loadbalancing'
  const [appliedStrategies, setAppliedStrategies] = useState([]); // Track applied strategies
  const [notification, setNotification] = useState(null); // User-friendly notifications

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      console.log('TDMSComponent: Starting to fetch initial data...');
      try {
        const [datesResponse, sitesResponse] = await Promise.all([
          axios.get(`${API_BASE}/api/tdms/dates`),
          axios.get(`${API_BASE}/api/tdms/sites`)
        ]);

        console.log('TDMSComponent: Dates response:', datesResponse.data);
        console.log('TDMSComponent: Sites response:', sitesResponse.data);

        if (datesResponse.data.dates.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const availableDateStrings = datesResponse.data.dates;
          
          // Filter to only include today and future dates
          const todayAndFutureDates = availableDateStrings.filter(date => date >= today);
          
          if (todayAndFutureDates.length > 0) {
            setAvailableDates(todayAndFutureDates);
            
            // Set today's date if available, otherwise the next available date
            let defaultDate = today;
            if (!todayAndFutureDates.includes(today)) {
              defaultDate = todayAndFutureDates[0];
            }
            
            setSelectedDate(defaultDate);
            console.log('TDMSComponent: Set default date to:', defaultDate);
          } else {
            // Fallback: use all dates if no future dates available
            setAvailableDates(availableDateStrings);
            setSelectedDate(availableDateStrings[0]);
            console.log('TDMSComponent: No future dates available, using all dates');
          }
        }

        if (sitesResponse.data.sites.length > 0) {
          setAvailableSites(sitesResponse.data.sites);
          // Don't auto-select first site to prevent hardcoded values
          // setSelectedSite(sitesResponse.data.sites[0]);
          // setSelectedSeasonalSite(sitesResponse.data.sites[0]);
          console.log('TDMSComponent: Sites loaded, user will select manually');
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
    if (selectedSeasonalSite && selectedSeasonalYear && monthlyData.length > 0) {
      const monthlyAvg = monthlyData.reduce((sum, month) => sum + month.total_visitors, 0) / monthlyData.length;
      const peakMonth = monthlyData.reduce((max, month) =>
        month.total_visitors > max.total_visitors ? month : max, monthlyData[0]);
      const offPeakMonth = monthlyData.reduce((min, month) =>
        month.total_visitors < min.total_visitors ? month : min, monthlyData[0]);

      setSeasonalAnalysis({
        site: selectedSeasonalSite,
        year: selectedSeasonalYear,
        monthly_average: Math.round(monthlyAvg),
        peak_month: peakMonth.month,
        peak_visitors: peakMonth.total_visitors,
        off_peak_month: offPeakMonth.month,
        off_peak_visitors: offPeakMonth.total_visitors,
        strategy: 'stable_capacity'
      });
    }
  }, [selectedSeasonalSite, selectedSeasonalYear, monthlyData]);

  // Load monthly data for seasonal planning when site and year change
  useEffect(() => {
    if (selectedSeasonalSite && selectedSeasonalYear) {
      const fetchSeasonalMonthlyData = async () => {
        console.log('TDMSComponent: Fetching seasonal monthly data for site:', selectedSeasonalSite, 'year:', selectedSeasonalYear);
        try {
          const response = await axios.get(`${API_BASE}/api/tdms/monthly/${selectedSeasonalSite}/${selectedSeasonalYear}`);
          console.log('TDMSComponent: Seasonal monthly data response:', response.data);
          setMonthlyData(response.data.monthly_data || []);
        } catch (error) {
          console.error('TDMSComponent: Error fetching seasonal monthly data:', error);
          setMonthlyData([]);
        }
      };
      fetchSeasonalMonthlyData();
    }
  }, [selectedSeasonalSite, selectedSeasonalYear]);

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

  // Notification helper functions
  const showNotification = (message, type = 'success') => {
    setNotification({
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    });
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification(prev => prev?.id === notification?.id ? null : prev);
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  // TDMS PDF Export Handler
  const handleExportTDMSReport = () => {
    // Check if data is available
    if (!dashboardData || loading) {
      showNotification('⚠️ Please load TDMS data first before exporting', 'warning');
      return;
    }

    // Initialize PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Enhanced color scheme
    const headerColor = [44, 62, 80]; // Dark header background (#2c3e50)
    const accentColor = [147, 51, 234]; // Purple accent (#9333ea)
    const successColor = [16, 185, 129]; // Green (#10b981)
    const warningColor = [245, 158, 11]; // Amber (#f59e0b)
    const dangerColor = [239, 68, 68]; // Red (#ef4444)
    const primaryColor = [59, 130, 246]; // Blue (#3b82f6)

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

    // Helper function to add colored header
    const addColoredHeader = (text, color, yPosition) => {
      doc.setFillColor(...color);
      doc.rect(20, yPosition - 5, pageWidth - 40, 10, 'F');
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(text, pageWidth / 2, yPosition, { align: 'center' });
      doc.setTextColor(0);
      return yPosition + 15;
    };

    // Cover Page
    doc.setFillColor(...headerColor);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Main title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('Tourist Distribution', pageWidth / 2, 80, { align: 'center' });
    doc.text('Management System', pageWidth / 2, 95, { align: 'center' });
    
    // Accent line
    doc.setFillColor(...accentColor);
    doc.rect(pageWidth / 2 - 50, 105, 100, 3, 'F');
    
    // Subtitle
    doc.setFontSize(16);
    doc.text('Comprehensive Analytics Report', pageWidth / 2, 125, { align: 'center' });
    
    // Report details
    doc.setFontSize(12);
    doc.text(`Analysis Date: ${selectedDate}`, pageWidth / 2, 160, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 175, { align: 'center' });
    
    // Add decorative elements
    doc.setFillColor(...accentColor);
    doc.circle(30, 30, 15, 'F');
    doc.circle(pageWidth - 30, 30, 15, 'F');
    doc.circle(30, pageHeight - 30, 15, 'F');
    doc.circle(pageWidth - 30, pageHeight - 30, 15, 'F');
    
    // Add new page for content
    doc.addPage();
    let yPosition = 20;

    // Table of Contents
    yPosition = addColoredHeader('Table of Contents', headerColor, yPosition);
    
    const tocData = [
      ['1. Executive Summary', 'Page 2'],
      ['2. System Overview', 'Page 3'],
      ['3. Site Performance Analysis', 'Page 4'],
      ['4. Capacity Alerts', 'Page 5'],
      ['5. Infrastructure Load Analysis', 'Page 6'],
      ['6. Seasonal Planning', 'Page 7'],
      ['7. Applied Strategies', 'Page 8'],
      ['8. Recommendations', 'Page 9']
    ];

    autoTable(doc, {
      head: [['Section', 'Page']],
      body: tocData,
      startY: yPosition,
      margin: { left: 30, right: 30 },
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

    // Executive Summary Page
    doc.addPage();
    yPosition = 20;
    
    yPosition = addColoredHeader('Executive Summary', headerColor, yPosition);
    
    // Key metrics with visual indicators
    const totalSites = dashboardData.vli_scores?.length || 0;
    const criticalSites = dashboardData.vli_scores?.filter(site => site.vli_score > 120).length || 0;
    const highLoadSites = dashboardData.vli_scores?.filter(site => site.vli_score > 100).length || 0;
    const optimalSites = dashboardData.vli_scores?.filter(site => site.vli_score <= 80).length || 0;
    const totalVisitors = dashboardData.vli_scores?.reduce((sum, site) => sum + site.visitors, 0) || 0;
    const avgVLI = dashboardData.vli_scores?.reduce((sum, site) => sum + site.vli_score, 0) / totalSites || 0;

    // Create visual metric boxes
    const metrics = [
      { label: 'Total Sites', value: totalSites, color: primaryColor, icon: 'SITE' },
      { label: 'Total Visitors', value: totalVisitors.toLocaleString(), color: successColor, icon: 'VISITORS' },
      { label: 'Critical Sites', value: criticalSites, color: dangerColor, icon: 'CRITICAL' },
      { label: 'Average VLI', value: `${avgVLI.toFixed(1)}%`, color: warningColor, icon: 'VLI' }
    ];

    metrics.forEach((metric, index) => {
      const xPos = 30 + (index % 2) * (pageWidth - 80) / 2;
      const yPos = yPosition + Math.floor(index / 2) * 40;
      
      // Metric box
      doc.setFillColor(...metric.color);
      doc.rect(xPos, yPos, (pageWidth - 80) / 2, 30, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(metric.icon + ' ' + metric.label, xPos + 5, yPos + 12);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(String(metric.value), xPos + 5, yPos + 25);
    });

    yPosition += 90;

    // Detailed summary table
    const summaryData = [
      ['System Status', criticalSites > 0 ? 'Critical Attention Required' : highLoadSites > 0 ? 'Monitor Closely' : 'Operating Normally'],
      ['Sites Requiring Action', String(`${criticalSites + highLoadSites} of ${totalSites}`)],
      ['Optimal Performance', `${((optimalSites / totalSites) * 100).toFixed(1)}%`],
      ['Active Strategies', appliedStrategies.length.toString()],
      ['Last Updated', new Date().toLocaleDateString()],
      ['Data Source', 'TDMS Real-time Monitoring']
    ];

    autoTable(doc, {
      head: [['Metric', 'Status/Value']],
      body: summaryData,
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

    // System Overview Page
    doc.addPage();
    yPosition = 20;
    
    yPosition = addColoredHeader('System Overview', headerColor, yPosition);
    
    // System description
    doc.setFontSize(11);
    doc.setTextColor(60);
    const overviewText = `The Tourist Distribution Management System (TDMS) provides real-time monitoring and management of tourist flow across Sri Lanka's key destinations. This report analyzes system performance for ${selectedDate}, focusing on Visitor Load Index (VLI) metrics, capacity utilization, and redistribution strategies.`;
    
    const splitText = doc.splitTextToSize(overviewText, pageWidth - 40);
    doc.text(splitText, 20, yPosition);
    yPosition += splitText.length * 5 + 10;

    // System health indicators
    const healthIndicators = [
      ['Overall System Health', criticalSites === 0 ? 'Good' : criticalSites <= 2 ? 'Fair' : 'Poor'],
      ['Capacity Utilization', avgVLI > 100 ? 'Over Capacity' : avgVLI > 80 ? 'High' : 'Optimal'],
      ['Response Strategy', appliedStrategies.length > 0 ? 'Active' : 'Standby'],
      ['Alert Level', capacityAlerts.length > 5 ? 'High' : capacityAlerts.length > 0 ? 'Moderate' : 'Low']
    ];

    autoTable(doc, {
      head: [['Indicator', 'Status']],
      body: healthIndicators,
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

    // Site Performance Analysis Page
    doc.addPage();
    yPosition = 20;
    
    yPosition = addColoredHeader('Site Performance Analysis', headerColor, yPosition);

    if (dashboardData.vli_scores && dashboardData.vli_scores.length > 0) {
      // Sort sites by VLI score for better visualization
      const sortedSites = [...dashboardData.vli_scores].sort((a, b) => b.vli_score - a.vli_score);
      
      // Create detailed site table with color coding
      const vliTableData = sortedSites.map(site => {
        const status = site.vli_score > 120 ? 'CRITICAL' : site.vli_score > 100 ? 'HIGH' : site.vli_score > 80 ? 'MODERATE' : 'OPTIMAL';
        const statusColor = site.vli_score > 120 ? dangerColor : site.vli_score > 100 ? warningColor : site.vli_score > 80 ? [255, 193, 7] : successColor;
        
        return [
          site.site,
          site.visitors.toLocaleString(),
          `${site.vli_score.toFixed(1)}%`,
          status,
          site.vli_score > 80 ? 'Action Required' : 'Normal'
        ];
      });

      autoTable(doc, {
        head: [['Site', 'Visitors', 'VLI Score', 'Status', 'Action Required']],
        body: vliTableData,
        startY: yPosition,
        margin: { left: 20, right: 20 },
        styles: {
          fontSize: 9,
          cellPadding: 2,
          textColor: [60, 60, 60]
        },
        headStyles: {
          fillColor: headerColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        didParseCell: (data) => {
          // Color code status cells
          if (data.column.index === 3) {
            if (data.cell.raw === 'CRITICAL') {
              data.cell.styles.fillColor = dangerColor;
              data.cell.styles.textColor = [255, 255, 255];
            } else if (data.cell.raw === 'HIGH') {
              data.cell.styles.fillColor = warningColor;
              data.cell.styles.textColor = [255, 255, 255];
            } else if (data.cell.raw === 'MODERATE') {
              data.cell.styles.fillColor = [255, 193, 7];
              data.cell.styles.textColor = [0, 0, 0];
            } else {
              data.cell.styles.fillColor = successColor;
              data.cell.styles.textColor = [255, 255, 255];
            }
          }
        }
      });
    }

    // Capacity Alerts Page
    if (capacityAlerts && capacityAlerts.length > 0) {
      doc.addPage();
      yPosition = 20;
      
      yPosition = addColoredHeader('Capacity Alerts & Critical Issues', headerColor, yPosition);
      
      // Alert summary
      doc.setFontSize(11);
      doc.setTextColor(60);
      doc.text(`Total Active Alerts: ${capacityAlerts.length}`, 20, yPosition);
      yPosition += 10;

      const alertsTableData = capacityAlerts.map(alert => [
        alert.site,
        `${alert.vli_score.toFixed(1)}%`,
        alert.severity.toUpperCase(),
        alert.capacity_utilization,
        alert.visitors.toLocaleString(),
        new Date(alert.timestamp).toLocaleTimeString()
      ]);

      autoTable(doc, {
        head: [['Site', 'VLI Score', 'Severity', 'Utilization', 'Visitors', 'Time']],
        body: alertsTableData,
        startY: yPosition,
        margin: { left: 20, right: 20 },
        styles: {
          fontSize: 9,
          cellPadding: 2,
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
    }

    // Infrastructure Load Analysis Page
    if (infrastructureLoad && infrastructureLoad.site_analysis) {
      doc.addPage();
      yPosition = 20;
      
      yPosition = addColoredHeader('Infrastructure Load Analysis', headerColor, yPosition);
      
      // Load distribution summary
      const loadSummary = [
        ['Total Sites Analyzed', infrastructureLoad.total_sites.toString()],
        ['Overloaded Sites', infrastructureLoad.overloaded_sites.toString()],
        ['High Load Sites', infrastructureLoad.high_load_sites.toString()],
        ['Optimal Sites', infrastructureLoad.optimal_sites.toString()],
        ['System Efficiency', `${((infrastructureLoad.optimal_sites / infrastructureLoad.total_sites) * 100).toFixed(1)}%`]
      ];

      autoTable(doc, {
        head: [['Load Metric', 'Count/Percentage']],
        body: loadSummary,
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

      // Detailed site analysis
      const infrastructureTableData = infrastructureLoad.site_analysis.map(site => [
        site.site,
        `${site.vli_score.toFixed(1)}%`,
        site.utilization_rate,
        site.load_category.replace('_', ' ').toUpperCase(),
        site.recommended_action,
        site.infrastructure_stress
      ]);

      autoTable(doc, {
        head: [['Site', 'VLI Score', 'Utilization', 'Load Category', 'Recommended Action', 'Stress Level']],
        body: infrastructureTableData,
        startY: yPosition,
        margin: { left: 20, right: 20 },
        styles: {
          fontSize: 8,
          cellPadding: 2,
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
    }

    // Applied Strategies Page
    if (appliedStrategies && appliedStrategies.length > 0) {
      doc.addPage();
      yPosition = 20;
      
      yPosition = addColoredHeader('Applied Redistribution Strategies', headerColor, yPosition);
      
      // Strategy summary
      const totalRedistributed = appliedStrategies.reduce((sum, strategy) => sum + strategy.visitorsToRedistribute, 0);
      const strategySummary = [
        ['Total Strategies Applied', appliedStrategies.length.toString()],
        ['Total Visitors Redistributed', totalRedistributed.toLocaleString()],
        ['Average Redistribution', Math.round(totalRedistributed / appliedStrategies.length).toLocaleString()],
        ['Most Recent Strategy', new Date(Math.max(...appliedStrategies.map(s => new Date(s.timestamp)))).toLocaleDateString()]
      ];

      autoTable(doc, {
        head: [['Strategy Metric', 'Value']],
        body: strategySummary,
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

      // Detailed strategies table
      const strategiesTableData = appliedStrategies.map(strategy => [
        strategy.site,
        strategy.type,
        strategy.action.substring(0, 50) + (strategy.action.length > 50 ? '...' : ''),
        strategy.visitorsToRedistribute.toLocaleString(),
        strategy.targetSite || 'N/A',
        new Date(strategy.timestamp).toLocaleDateString(),
        strategy.status
      ]);

      autoTable(doc, {
        head: [['Source Site', 'Type', 'Action', 'Visitors', 'Target', 'Date Applied', 'Status']],
        body: strategiesTableData,
        startY: yPosition,
        margin: { left: 20, right: 20 },
        styles: {
          fontSize: 8,
          cellPadding: 2,
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
    }

    // Recommendations Page
    doc.addPage();
    yPosition = 20;
    
    yPosition = addColoredHeader('Recommendations & Action Items', headerColor, yPosition);
    
    // Generate recommendations based on data
    const recommendations = [];
    
    if (criticalSites > 0) {
      recommendations.push({
        priority: 'URGENT',
        action: `Immediate visitor redistribution required for ${criticalSites} critical sites`,
        details: 'Implement emergency protocols to prevent overcrowding'
      });
    }
    
    if (highLoadSites > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: `Monitor ${highLoadSites} high-load sites closely`,
        details: 'Prepare contingency plans for potential capacity issues'
      });
    }
    
    if (appliedStrategies.length === 0 && (criticalSites > 0 || highLoadSites > 0)) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'No active redistribution strategies implemented',
        details: 'Consider proactive visitor management strategies'
      });
    }
    
    recommendations.push({
      priority: 'LOW',
      action: 'Continue routine monitoring',
      details: 'Maintain current system performance and optimize as needed'
    });

    const recommendationsTableData = recommendations.map(rec => [
      rec.priority,
      rec.action,
      rec.details
    ]);

    autoTable(doc, {
      head: [['Priority', 'Recommended Action', 'Details']],
      body: recommendationsTableData,
      startY: yPosition,
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 9,
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
      },
      didParseCell: (data) => {
        // Color code priority cells
        if (data.column.index === 0) {
          if (data.cell.raw === 'URGENT') {
            data.cell.styles.fillColor = dangerColor;
            data.cell.styles.textColor = [255, 255, 255];
          } else if (data.cell.raw === 'HIGH') {
            data.cell.styles.fillColor = warningColor;
            data.cell.styles.textColor = [255, 255, 255];
          } else if (data.cell.raw === 'MEDIUM') {
            data.cell.styles.fillColor = primaryColor;
            data.cell.styles.textColor = [255, 255, 255];
          } else {
            data.cell.styles.fillColor = successColor;
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    });

    // Footer on last page
    yPosition = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('--- End of Report ---', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text(`Report generated by TDMS on ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });

    // Add page numbers to all pages
    addPageNumbers();

    // Generate filename
    const filename = `TDMS_Comprehensive_Report_${selectedDate.replace(/-/g, '_')}.pdf`;

    // Save the PDF
    doc.save(filename);
    showNotification('📄 Comprehensive TDMS report exported successfully!', 'success');
  };

  // Load dashboard data when date changes
  useEffect(() => {
    if (selectedDate) {
      const fetchDashboardData = async () => {
        setLoading(true);
        console.log('TDMSComponent: Fetching dashboard data for date:', selectedDate);
        try {
          const response = await axios.get(`${API_BASE}/api/tdms/dashboard/${selectedDate}`);
          console.log('TDMSComponent: Dashboard response:', response.data);
          setDashboardData(response.data);
          console.log('TDMSComponent: Dashboard data set');
        } catch (error) {
          console.error('TDMSComponent: Error fetching dashboard data:', error);
          // Don't set any fallback data to prevent hardcoded values
          setDashboardData(null);
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
          const response = await axios.get(`${API_BASE}/api/tdms/monthly/${selectedSite}/${selectedYear}`);
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

  // Load trend data when selected site changes
  useEffect(() => {
    if (selectedSite) {
      const fetchTrendData = async () => {
        console.log('TDMSComponent: Fetching trend data for site:', selectedSite);
        try {
          const response = await axios.get(`${API_BASE}/api/tdms/weekly-trend/${encodeURIComponent(selectedSite)}`);
          console.log('TDMSComponent: Trend data response:', response.data);
          setTrendData(response.data.trend_data || []);
        } catch (error) {
          console.error('TDMSComponent: Error fetching trend data:', error);
          setTrendData([]);
        }
      };
      fetchTrendData();
    }
  }, [selectedSite]);

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
                visitors: newVisitors,
                original_visitors: originalVisitors
              };
            } else if (site.site === targetSite) {
              // Add visitors to target site
              const sourceData = originalData.find(s => s.site === sourceSite);
              const originalVisitors = site.visitors;
              const sourceVisitors = sourceData ? sourceData.visitors : 0;
              const additionAmount = Math.floor(sourceVisitors * (distributionPercentage / 100));
              const newVisitors = originalVisitors + additionAmount;
              const newVliScore = Math.min(150, site.vli_score * (newVisitors / originalVisitors));

              return {
                ...site,
                original_vli: site.vli_score,
                simulated_vli: newVliScore,
                visitors: newVisitors,
                original_visitors: originalVisitors
              };
            } else {
              return {
                ...site,
                original_vli: site.vli_score,
                simulated_vli: site.vli_score,
                visitors: site.visitors,
                original_visitors: site.visitors
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

  // Helper function to get VLI color (matching existing standards)
  const getVLIColor = (score) => {
    if (score > 120) return '#dc2626'; // Critical - dark red
    if (score > 100) return '#ef4444'; // High - red
    if (score > 80) return '#f59e0b'; // Moderate - amber/yellow
    return '#10b981'; // Optimal - green
  };

  // Calculate visitor caps for overcrowding reduction
  const calculateVisitorCaps = () => {
    if (!dashboardData?.vli_scores) return [];
    
    return dashboardData.vli_scores.map(site => {
      const currentVLI = site.vli_score;
      let recommendedCap;
      let reductionPercentage;
      
      if (currentVLI > 120) {
        // Critical: Reduce to 85% VLI
        recommendedCap = Math.floor(site.visitors * 0.85);
        reductionPercentage = 15;
      } else if (currentVLI > 100) {
        // High: Reduce to 90% VLI
        recommendedCap = Math.floor(site.visitors * 0.90);
        reductionPercentage = 10;
      } else if (currentVLI > 80) {
        // Moderate: Reduce to 95% VLI
        recommendedCap = Math.floor(site.visitors * 0.95);
        reductionPercentage = 5;
      } else {
        // No reduction needed
        recommendedCap = site.visitors;
        reductionPercentage = 0;
      }
      
      return {
        site: site.site,
        current_visitors: site.visitors,
        current_vli: currentVLI,
        recommended_cap: recommendedCap,
        reduction_percentage: reductionPercentage,
        visitors_to_redistribute: site.visitors - recommendedCap,
        severity: currentVLI > 120 ? 'critical' : currentVLI > 100 ? 'high' : currentVLI > 80 ? 'moderate' : 'normal'
      };
    });
  };

  // Update visitor caps when dashboard data changes
  useEffect(() => {
    if (dashboardData) {
      const caps = calculateVisitorCaps();
      setVisitorCaps(caps);
    }
  }, [dashboardData]);

  // Fetch daily data for a specific site, month, and year
  const fetchDailyData = async (site, year, month) => {
    try {
      // Generate mock daily data for now
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyData = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        dailyData.push({
          day: day,
          visitors: Math.floor(Math.random() * 1000) + 500 // Random visitors between 500-1500
        });
      }
      
      setDailyData(dailyData);
    } catch (error) {
      console.error('Error fetching daily data:', error);
      setDailyData([]);
    }
  };

  // Find optimal redistribution strategy for a given overcrowded site
  const findOptimalRedistributionStrategy = (overcrowdedSite) => {
    if (!dashboardData?.vli_scores?.length) {
      console.error('No dashboard data available for strategy calculation');
      return null;
    }
    
    const sourceSiteData = dashboardData.vli_scores.find(site => site.site === overcrowdedSite);
    if (!sourceSiteData) {
      console.error('Overcrowded site not found in dashboard data');
      return null;
    }
    
    // Find suitable target sites with VLI < 75% (to ensure available capacity)
    const availableTargets = dashboardData.vli_scores.filter(site => 
      site.vli_score < 75 && site.site !== overcrowdedSite);
    
    if (availableTargets.length === 0) {
      console.log('No suitable target sites found');
      return null;
    }
    
    // Choose the target with lowest VLI for maximum capacity
    const bestTargetSite = availableTargets.reduce((min, site) => 
      site.vli_score < min.vli_score ? site : min, availableTargets[0]);
    
    // Calculate optimal distribution percentage
    const sourceTargetVLI = 90; // Target VLI for source site
    const targetMaxVLI = 80; // Maximum acceptable VLI for target site
    
    // Calculate percentage needed to bring source to target VLI
    const sourceReductionNeeded = sourceSiteData.vli_score - sourceTargetVLI;
    const percentageNeededForSource = (sourceReductionNeeded / sourceSiteData.vli_score) * 100;
    
    // Calculate maximum percentage target can absorb
    const targetCapacityAvailable = targetMaxVLI - bestTargetSite.vli_score;
    const maxPercentageTargetCanTake = targetCapacityAvailable > 0 ? 
      (targetCapacityAvailable / bestTargetSite.vli_score) * 100 : 0;
    
    // Use the smaller of the two percentages, but cap at 50%
    let optimalPercentage = Math.min(percentageNeededForSource, maxPercentageTargetCanTake, 50);
    
    // Ensure minimum of 5% if there's any overcrowding to address
    if (optimalPercentage < 5 && percentageNeededForSource > 0) {
      optimalPercentage = 5;
    }
    
    // Validate the percentage is reasonable
    if (optimalPercentage <= 0 || isNaN(optimalPercentage) || !isFinite(optimalPercentage)) {
      console.error('Invalid optimal percentage calculated:', optimalPercentage);
      return null;
    }
    
    const visitorsToRedistribute = Math.floor(sourceSiteData.visitors * (optimalPercentage / 100));
    const projectedSourceVLI = sourceSiteData.vli_score * (1 - optimalPercentage/100);
    const projectedTargetVLI = bestTargetSite.vli_score * (1 + optimalPercentage/100);
    
    return {
      sourceSite: overcrowdedSite,
      targetSite: bestTargetSite.site,
      distributionPercentage: optimalPercentage,
      visitorsToRedistribute: visitorsToRedistribute,
      sourceCurrentVLI: sourceSiteData.vli_score,
      targetCurrentVLI: bestTargetSite.vli_score,
      projectedSourceVLI: projectedSourceVLI,
      projectedTargetVLI: projectedTargetVLI,
      vliReduction: sourceSiteData.vli_score - projectedSourceVLI,
      vliIncrease: projectedTargetVLI - bestTargetSite.vli_score,
      strategy: `Redistribute ${visitorsToRedistribute.toLocaleString()} visitors (${optimalPercentage.toFixed(1)}%) from ${overcrowdedSite} to ${bestTargetSite.site}`
    };
  };

  // Automatic visitor capping for all overcrowded sites
  const calculateAutoCappedSites = () => {
    if (!dashboardData?.vli_scores) return [];
    
    const overcrowdedSites = dashboardData.vli_scores.filter(site => site.vli_score > 80);
    
    return overcrowdedSites.map(site => {
      const currentVLI = site.vli_score;
      let recommendedCap;
      let reductionPercentage;
      
      if (currentVLI > 120) {
        // Critical: Reduce to 85% VLI
        recommendedCap = Math.floor(site.visitors * 0.85);
        reductionPercentage = 15;
      } else if (currentVLI > 100) {
        // High: Reduce to 90% VLI
        recommendedCap = Math.floor(site.visitors * 0.90);
        reductionPercentage = 10;
      } else if (currentVLI > 80) {
        // Moderate: Reduce to 95% VLI
        recommendedCap = Math.floor(site.visitors * 0.95);
        reductionPercentage = 5;
      } else {
        // No reduction needed
        recommendedCap = site.visitors;
        reductionPercentage = 0;
      }
      
      return {
        site: site.site,
        current_visitors: site.visitors,
        current_vli: currentVLI,
        recommended_cap: recommendedCap,
        reduction_percentage: reductionPercentage,
        visitors_to_redistribute: site.visitors - recommendedCap,
        severity: currentVLI > 120 ? 'critical' : currentVLI > 100 ? 'high' : 'moderate'
      };
    });
  };


  // Update auto-capped sites when dashboard data changes
  useEffect(() => {
    if (dashboardData) {
      const cappedSites = calculateAutoCappedSites();
      setAutoCappedSites(cappedSites);
    }
  }, [dashboardData]);


  // Add strategy to daily assessments
  const addStrategyToAssessments = (strategy) => {
    const newStrategy = {
      id: Date.now(),
      site: strategy.site,
      type: strategy.type,
      action: strategy.action,
      visitorsToRedistribute: strategy.visitorsToRedistribute,
      targetSite: strategy.targetSite,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    
    setAppliedStrategies(prev => [...prev, newStrategy]);
    
    // Show success message
    showNotification(`✅ Strategy added successfully: ${strategy.type} for ${strategy.site}`, 'success');
  };

  // Remove strategy from assessments
  const removeStrategyFromAssessments = (strategyId) => {
    setAppliedStrategies(prev => prev.filter(s => s.id !== strategyId));
    showNotification('🗑️ Strategy removed from daily assessments', 'info');
    // Note: setDistributionPercentage should be removed or handled differently
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
      {/* Notification Component */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border transform transition-all duration-300 ease-in-out ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                {notification.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                {notification.type === 'info' && <AlertTriangle className="h-5 w-5 text-blue-600" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs mt-1 opacity-75">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={hideNotification}
              className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header with Export Button */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-1">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Tourist Flow <span className="text-blue-600">Distribution</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Executive monitoring of site capacity, visitor load, and redistribution strategy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
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
          <Button onClick={handleExportTDMSReport} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export TDMS Report</span>
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions">Predictions & Analytics</TabsTrigger>
          <TabsTrigger value="vli">VLI & Infrastructure</TabsTrigger>
          <TabsTrigger value="emergency">Emergency & Redistribution</TabsTrigger>
        </TabsList>

        {/* View 1: Predictions & Analytics */}
        <TabsContent value="predictions" className="space-y-6">
          {/* Real-time Capacity Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                  Real-time Capacity Alerts
                </span>
              </CardTitle>
              <CardDescription>
                Sites exceeding VLI threshold - {capacityAlerts.length} sites affected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {capacityAlerts.length > 0 ? (
                <div className="space-y-3">
                  {capacityAlerts.map((alert, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${alert.severity === 'critical' ? 'bg-red-50 border-red-600' :
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

          {/* Monthly Aggregation Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Aggregation Chart</CardTitle>
              <CardDescription>Total predicted visitors per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Site:</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Year:</label>
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
              
              {/* Month Selection - Moved below chart for better UX */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">Daily View Options</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Month:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        if (e.target.value && selectedSite && selectedYear) {
                          fetchDailyData(selectedSite, selectedYear, e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select month for daily view...</option>
                      <option value="01">January</option>
                      <option value="02">February</option>
                      <option value="03">March</option>
                      <option value="04">April</option>
                      <option value="05">May</option>
                      <option value="06">June</option>
                      <option value="07">July</option>
                      <option value="08">August</option>
                      <option value="09">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    {selectedMonth && (
                      <div className="text-sm text-gray-500 italic">
                        Daily chart showing below
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedMonth && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">
                      Daily Aggregation - {selectedSite} - {new Date(selectedYear + '-' + selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h4>
                  </div>
                  
                  <div className="h-80">
                    {dailyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="visitors" stroke="#10B981" name="Daily Visitors" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Loading daily data...
                        </div>
                      )}
                    </div>
                  </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* View 2: VLI & Infrastructure */}
        <TabsContent value="vli" className="space-y-6">
          {/* View Toggle */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <label className="text-sm font-medium text-gray-700">View Mode:</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setVliView('heatmap')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    vliView === 'heatmap'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  National Grid Heatmap
                </button>
                <button
                  onClick={() => setVliView('loadbalancing')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    vliView === 'loadbalancing'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Infrastructure Load Balancing
                </button>
              </div>
            </div>
          </div>

          {vliView === 'heatmap' ? (
            /* National Grid Heatmap */
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
                      style={{ backgroundColor: getVLIColor(site.vli_score) }}
                    >
                      <h3 className="font-semibold text-sm mb-2">{site.site}</h3>
                      <div className="text-2xl font-bold">{Math.round(site.vli_score)}%</div>
                      <div className="text-xs opacity-90">{site.visitors} visitors</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Infrastructure Load Balancing */
            infrastructureLoad.total_sites && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                      Infrastructure Load Balancing
                    </span>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium">View:</label>
                      <select
                        value={infrastructureView}
                        onChange={(e) => setInfrastructureView(e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="cards">Cards</option>
                        <option value="grid">Grid</option>
                      </select>
                    </div>
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

                  {infrastructureView === 'cards' ? (
                    <div className="space-y-3">
                      {infrastructureLoad.site_analysis?.map((site, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${site.load_category === 'overloaded' ? 'bg-red-50 border-red-200' : site.load_category === 'high_load' ? 'bg-orange-50 border-orange-200' : site.load_category === 'moderate_load' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
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
                              <Badge className={`mb-2 ${site.load_category === 'overloaded' ? 'bg-red-600' :
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
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Site</th>
                            <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">VLI Score</th>
                            <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">Utilization</th>
                            <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">Visitors</th>
                            <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">Load Category</th>
                            <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Recommended Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {infrastructureLoad.site_analysis?.map((site, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-2 font-medium text-gray-800">{site.site}</td>
                              <td className="border border-gray-200 px-4 py-2 text-center">
                                <span className={`font-semibold ${site.vli_score > 120 ? 'text-red-600' : site.vli_score > 100 ? 'text-orange-600' : site.vli_score > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                                  {site.vli_score.toFixed(1)}%
                                </span>
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-center">{site.utilization_rate}%</td>
                              <td className="border border-gray-200 px-4 py-2 text-center">{site.visitors.toLocaleString()}</td>
                              <td className="border border-gray-200 px-4 py-2 text-center">
                              <Badge className={`text-xs ${site.load_category === 'overloaded' ? 'bg-red-600' : site.load_category === 'high_load' ? 'bg-orange-600' : site.load_category === 'moderate_load' ? 'bg-yellow-600' : 'bg-green-600'}`}>
                                  {site.load_category.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">{site.recommended_action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          )}

          {/* Seasonal Capacity Planning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Seasonal Capacity Planning
              </CardTitle>
              <CardDescription>
                Strategic resource allocation and capacity management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Site:</label>
                  <select
                    value={selectedSeasonalSite}
                    onChange={(e) => setSelectedSeasonalSite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a site...</option>
                    {availableSites.map(site => (
                      <option key={site} value={site}>{site}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Year:</label>
                  <select
                    value={selectedSeasonalYear}
                    onChange={(e) => setSelectedSeasonalYear(e.target.value)}
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
              
              {seasonalAnalysis.site && (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">Analysis for {seasonalAnalysis.site} - {seasonalAnalysis.year}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-white rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                          {seasonalAnalysis.monthly_average.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Monthly Average</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                        <div className="text-lg font-semibold text-green-800">{seasonalAnalysis.peak_month}</div>
                        <div className="text-2xl font-bold text-green-600">
                          {seasonalAnalysis.peak_visitors.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Peak Month</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border border-orange-200">
                        <div className="text-lg font-semibold text-orange-800">{seasonalAnalysis.off_peak_month}</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {seasonalAnalysis.off_peak_visitors.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Off-Peak Month</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      <strong>Recommended Strategy:</strong> Maintain stable capacity levels with seasonal staffing adjustments
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* View 3: Infrastructure & Load Balancing */}
        <TabsContent value="infrastructure" className="space-y-6">
          {/* Infrastructure Load Balancing */}
          {infrastructureLoad.total_sites && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                    Infrastructure Load Balancing
                  </span>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">View:</label>
                    <select
                      value={infrastructureView}
                      onChange={(e) => setInfrastructureView(e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="cards">Cards</option>
                      <option value="grid">Grid</option>
                    </select>
                  </div>
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

                {infrastructureView === 'cards' ? (
                  <div className="space-y-3">
                    {infrastructureLoad.site_analysis?.map((site, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${site.load_category === 'overloaded' ? 'bg-red-50 border-red-200' :
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
                            <Badge className={`mb-2 ${site.load_category === 'overloaded' ? 'bg-red-600' :
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
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Site</th>
                          <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">VLI Score</th>
                          <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">Utilization</th>
                          <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">Visitors</th>
                          <th className="border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700">Load Category</th>
                          <th className="border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700">Recommended Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {infrastructureLoad.site_analysis?.map((site, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2 font-medium text-gray-800">{site.site}</td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              <span className={`font-semibold ${
                                site.vli_score > 120 ? 'text-red-600' :
                                site.vli_score > 100 ? 'text-orange-600' :
                                site.vli_score > 80 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {site.vli_score.toFixed(1)}%
                              </span>
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">{site.utilization_rate}%</td>
                            <td className="border border-gray-200 px-4 py-2 text-center">{site.visitors.toLocaleString()}</td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              <Badge className={`text-xs ${
                                site.load_category === 'overloaded' ? 'bg-red-600' :
                                site.load_category === 'high_load' ? 'bg-orange-600' :
                                  site.load_category === 'moderate_load' ? 'bg-yellow-600' :
                                    'bg-green-600'
                              }`}>
                                {site.load_category.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">{site.recommended_action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
                {/* View 3: Emergency & Redistribution */}
        <TabsContent value="emergency" className="space-y-6">
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
                        <p><strong>Trigger:</strong> VLI {'>'} 120% for 2+ hours</p>
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
                        <p><strong>Trigger:</strong> VLI {'>'} 100-120% for 4+ hours</p>
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

                  {/* Automatic Visitor Capping - Daily Assessment */}
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-4">Automatic Visitor Capping - Daily Assessment</h4>
                    <div className="text-sm text-gray-700 mb-4">
                      <p>The following sites exceed 80% VLI threshold and require visitor capping:</p>
                    
                    {autoCappedSites.length > 0 ? (
                      <div className="space-y-3">
                        {autoCappedSites.map((site, index) => (
                          <div key={index} className={`p-4 rounded-lg border ${
                            site.severity === 'critical' ? 'bg-red-100 border-red-300' :
                            site.severity === 'high' ? 'bg-orange-100 border-orange-300' :
                            'bg-yellow-100 border-yellow-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-2">{site.site}</h5>
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Current Visitors:</span> {site.current_visitors.toLocaleString()}
                                  </div>
                                  <div>
                                    <span className="font-medium">Current VLI:</span> {site.current_vli.toFixed(1)}%
                                  </div>
                                  <div>
                                    <span className="font-medium">Recommended Cap:</span> {site.recommended_cap.toLocaleString()}
                                  </div>
                                  <div>
                                    <span className="font-medium">To Redistribute:</span> {site.visitors_to_redistribute.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={`mb-2 ${
                                  site.severity === 'critical' ? 'bg-red-600' :
                                  site.severity === 'high' ? 'bg-orange-600' :
                                    'bg-yellow-600'
                                }`}>
                                  {site.severity.toUpperCase()}
                                </Badge>
                                <div className="text-center">
                                  <Button
                                    onClick={() => {
                                      console.log('Redistribute button clicked for site:', site.site);
                                      
                                      // Find optimal strategy for this overcrowded site
                                      const optimalStrategy = findOptimalRedistributionStrategy(site.site);
                                      
                                      if (optimalStrategy) {
                                        // Set the redistribution parameters based on optimal strategy
                                        setSourceSite(optimalStrategy.sourceSite);
                                        setTargetSite(optimalStrategy.targetSite);
                                        setDistributionPercentage(optimalStrategy.distributionPercentage);
                                        
                                        // Scroll to redistribution controls to show the strategy
                                        setTimeout(() => {
                                          const chartElement = document.getElementById('redistribution-chart');
                                          if (chartElement) {
                                            chartElement.scrollIntoView({ behavior: 'smooth' });
                                          }
                                        }, 100);
                                      } else {
                                        showNotification('⚠️ No suitable target sites available for redistribution. All sites are at or near capacity.', 'warning');
                                      }
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    Redistribute
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-800">
                            <strong>Total Visitors to Redistribute:</strong> {autoCappedSites.reduce((sum, site) => sum + site.visitors_to_redistribute, 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <div className="text-green-600 text-lg mb-2">✓ No Sites Require Capping</div>
                        <p>All sites are operating within acceptable VLI thresholds</p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Redistribution Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Redistribution Controls</CardTitle>
                <CardDescription>Configure visitor redistribution between sites</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Optimal Strategy Display */}
                  {sourceSite && targetSite && distributionPercentage > 0 && (() => {
                    const strategy = findOptimalRedistributionStrategy(sourceSite);
                    return strategy && strategy.targetSite === targetSite ? (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="font-semibold text-green-800 mb-3">Optimal Strategy To Apply</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-600"><strong>Strategy:</strong></p>
                            <p className="font-medium text-gray-800">{strategy.strategy}</p>
                          </div>
                          <div>
                            <p className="text-gray-600"><strong>Expected Outcomes:</strong></p>
                            <ul className="text-gray-800 space-y-1">
                              <li>• Source VLI reduction: {strategy.vliReduction.toFixed(1)}%</li>
                              <li>• Target VLI increase: {strategy.vliIncrease.toFixed(1)}%</li>
                              <li>• Source projected VLI: {strategy.projectedSourceVLI.toFixed(1)}%</li>
                              <li>• Target projected VLI: {strategy.projectedTargetVLI.toFixed(1)}%</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
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
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                    </div>
                  </div>
                  
                  {sourceSite && targetSite && distributionPercentage > 0 && dashboardData?.vli_scores ? (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">Redistribution Summary</h5>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>From:</strong> {sourceSite}</p>
                        <p><strong>To:</strong> {targetSite}</p>
                        <p><strong>Visitors to Move:</strong> {distributionPercentage}%</p>
                      </div>
                      <Button 
                        onClick={() => {
                          // Find source site data to get visitor count
                          const sourceSiteData = dashboardData.vli_scores.find(site => site.site === sourceSite);
                          const visitorsToRedistribute = sourceSiteData ? Math.floor(sourceSiteData.visitors * (distributionPercentage / 100)) : 0;
                          
                          // Create strategy object
                          const strategy = {
                            id: Date.now(),
                            site: sourceSite,
                            type: 'Redistribution',
                            action: `Redistribute ${visitorsToRedistribute.toLocaleString()} visitors to ${targetSite}`,
                            visitorsToRedistribute: visitorsToRedistribute,
                            targetSite: targetSite,
                            timestamp: new Date().toISOString(),
                            status: 'active'
                          };
                          
                          // Add to applied strategies
                          addStrategyToAssessments(strategy);
                        }}
                        className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Apply Strategy
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Please select source and target sites, and set a distribution percentage to create a strategy.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  VLI Impact Analysis
                </CardTitle>
                <CardDescription>
                  Before and after redistribution comparison with VLI threshold indicators
                </CardDescription>
              </CardHeader>
              <CardContent id="redistribution-chart">
                <div className="h-96">
                  {simulatedData && sourceSite && targetSite ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={(() => {
                          const filteredData = simulatedData.filter(site => site.site === sourceSite || site.site === targetSite);
                          // Ensure source is first, target is second
                          return [
                            filteredData.find(site => site.site === sourceSite),
                            filteredData.find(site => site.site === targetSite)
                          ].filter(Boolean);
                        })()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="site" 
                          tick={{ fill: '#374151' }}
                        />
                        <YAxis 
                          tick={{ fill: '#374151' }}
                          label={{ value: 'VLI Score (%)', angle: -90, position: 'insideLeft', fill: '#374151' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                          formatter={(value, name) => [
                            `${Number(value).toFixed(1)}%`, 
                            name === 'original_vli' ? 'Original VLI' : 'Simulated VLI'
                          ]}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '10px' }}
                        />
                        
                        {/* Reference lines for VLI thresholds */}
                        <ReferenceLine 
                          y={80} 
                          stroke="#f59e0b" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label="80% Threshold"
                        />
                        <ReferenceLine 
                          y={100} 
                          stroke="#ef4444" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label="100% Threshold"
                        />
                        <ReferenceLine 
                          y={120} 
                          stroke="#dc2626" 
                          strokeDasharray="5 5" 
                          strokeWidth={2}
                          label="120% Critical"
                        />
                        
                        {/* Custom bars with dynamic VLI color coding */}
                        <Bar 
                          dataKey="original_vli" 
                          name="Original VLI" 
                          fill="#ef4444"
                        >
                          <LabelList 
                            dataKey="original_vli" 
                            position="top" 
                            formatter={(value) => `${Number(value).toFixed(1)}%`}
                            style={{ fill: '#374151', fontSize: '12px' }}
                          />
                        </Bar>
                        
                        <Bar 
                          dataKey="simulated_vli" 
                          name="Simulated VLI" 
                          fill="#10b981"
                        >
                          <LabelList 
                            dataKey="simulated_vli" 
                            position="top" 
                            formatter={(value) => `${Number(value).toFixed(1)}%`}
                            style={{ fill: '#374151', fontSize: '12px' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <BarChart3 className="h-12 w-12 mb-4 text-gray-300" />
                      <div className="text-center">
                        <p className="text-lg font-medium mb-2">Select sites to view VLI impact</p>
                        <p className="text-sm">Choose source and target sites to see redistribution effects</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {simulatedData && sourceSite && targetSite && (
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Source Site Analysis */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="font-semibold text-blue-800 mb-3">Source: {sourceSite}</h5>
                        {(() => {
                          const sourceData = simulatedData.find(s => s.site === sourceSite);
                          const vliReduction = sourceData ? sourceData.original_vli - sourceData.simulated_vli : 0;
                          return (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Original VLI:</span>
                                <span className="font-medium">{sourceData?.original_vli.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Simulated VLI:</span>
                                <span className="font-medium text-green-600">{sourceData?.simulated_vli.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">VLI Reduction:</span>
                                <span className="font-medium text-blue-600">{vliReduction.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Visitors Moved:</span>
                                <span className="font-medium">{(sourceData?.original_visitors * (distributionPercentage/100)).toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Target Site Analysis */}
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="font-semibold text-green-800 mb-3">Target: {targetSite}</h5>
                        {(() => {
                          const targetData = simulatedData.find(s => s.site === targetSite);
                          const sourceData = simulatedData.find(s => s.site === sourceSite);
                          const vliIncrease = targetData ? targetData.simulated_vli - targetData.original_vli : 0;
                          const visitorsAdded = sourceData ? (sourceData.original_visitors * (distributionPercentage/100)) : 0;
                          return (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Original VLI:</span>
                                <span className="font-medium">{targetData?.original_vli.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Simulated VLI:</span>
                                <span className="font-medium text-orange-600">{targetData?.simulated_vli.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">VLI Increase:</span>
                                <span className="font-medium text-green-600">{vliIncrease.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Visitors Added:</span>
                                <span className="font-medium">{visitorsAdded.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Applied Strategies Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
                Applied Strategies - Daily Assessments
              </CardTitle>
              <CardDescription>
                Track and manage redistribution strategies that have been implemented
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appliedStrategies.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-700 mb-4">
                    <strong>Active Strategies ({appliedStrategies.length}):</strong>
                  </div>
                  {appliedStrategies.map((strategy, index) => (
                    <div key={strategy.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-green-800">{strategy.type} - {strategy.site}</h4>
                          <div className="text-sm text-gray-600">
                            <p><strong>Action:</strong> {strategy.action}</p>
                            <p><strong>Visitors to Redistribute:</strong> {strategy.visitorsToRedistribute.toLocaleString()}</p>
                            <p><strong>Target Site:</strong> {strategy.targetSite}</p>
                            <p><strong>Applied:</strong> {new Date(strategy.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => removeStrategyFromAssessments(strategy.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-gray-600">No strategies applied yet</div>
                  <p>Redistribution strategies will appear here once added from daily assessments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
