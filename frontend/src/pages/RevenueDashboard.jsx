import React from 'react';
import {
    useRevenueDashboard
} from '../hooks/useRevenueDashboard';

// UI Components
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import { AlertCircle, RefreshCcw, Download } from 'lucide-react';

// Feature Components
import RevenueKpiCards from '../components/revenue/RevenueKpiCards';
import RevenueScenarioToggle from '../components/revenue/RevenueScenarioToggle';
import RevenueDualAxisChart from '../components/revenue/RevenueDualAxisChart';
import RevenueDriversChart from '../components/revenue/RevenueDriversChart';
import RevenueInsightPanel from '../components/revenue/RevenueInsightPanel';
import RevenueGeoAdjustmentTile from '../components/revenue/RevenueGeoAdjustmentTile';

/**
 * RevenueDashboard
 * 
 * The main page component for Tourism Revenue Intelligence.
 * Integrates all specialized components and manages global dashboard filters.
 */
const RevenueDashboard = () => {
    const {
        scenario,
        updateScenario,
        selectedYear,
        updateYear,
        startYear,
        endYear,
        updateRange,
        data,
        loading,
        error,
        forecastPivotYear,
        refreshAllData
    } = useRevenueDashboard();

    // Generate year options for the selector (2013-2030)
    const yearOptions = Array.from({ length: 2030 - 2013 + 1 }, (_, i) => 2013 + i).reverse();

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
                <div className="bg-red-50 p-4 rounded-full">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard Unreachable</h2>
                    <p className="text-gray-500 max-w-md mt-1">
                        We encountered an error while fetching revenue intelligence data.
                        Please check your connection or try again later.
                    </p>
                </div>
                <Button onClick={refreshAllData} variant="outline" className="mt-4">
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Retry Connection
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">

            {/* 1. Header & Global Controls */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Revenue <span className="text-blue-600">Intelligence</span>
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">
                        Executive monitoring of tourism revenue, arrivals, and ML-driven forecasts.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    {/* Scenario Toggle */}
                    <RevenueScenarioToggle
                        value={scenario}
                        onChange={updateScenario}
                        isForecastYear={selectedYear >= forecastPivotYear}
                    />

                    <div className="h-10 w-px bg-gray-100 hidden md:block" />

                    {/* Year Selector */}
                    <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Focus Year</label>
                        <Select value={selectedYear.toString()} onValueChange={(val) => updateYear(parseInt(val))}>
                            <SelectTrigger className="w-[120px] h-9 font-semibold text-xs border-gray-100 hover:bg-gray-50 transition-colors">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {yearOptions.map(year => (
                                    <SelectItem key={year} value={year.toString()} className="text-xs">
                                        {year} {year >= forecastPivotYear ? '(Forecast)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-blue-600 rounded-lg" title="Export Data">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* 2. KPI Cards Row */}
            <section>
                <RevenueKpiCards summary={data.summary} loading={loading} />
            </section>

            {/* 2.5. Geopolitical Revenue Adjustment Tile */}
            <section>
                <RevenueGeoAdjustmentTile />
            </section>

            {/* 3. Main Visualization Row */}
            <section className="grid grid-cols-1 gap-6">
                <RevenueDualAxisChart
                    monthlyData={data.kpis?.monthly}
                    anomalies={data.anomalies?.anomalies}
                    events={data.anomalies?.events}
                    loading={loading}
                />
            </section>

            {/* 4. Deep Insights & Drivers Row */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Drivers breakdown (Takes 2/3 width) */}
                <div className="lg:col-span-2">
                    <RevenueDriversChart driverData={data.drivers} loading={loading} />
                </div>

                {/* Right: Insight Panel (Takes 1/3 width) */}
                <div className="lg:col-span-1">
                    <RevenueInsightPanel
                        events={data.anomalies?.events}
                        anomalies={data.anomalies?.anomalies}
                        selectedMetric="revenue_usd_mn"
                    />
                </div>
            </section>

            {/* Footer Branding */}
            <footer className="pt-8 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                <p>© 2026 Sri Lanka Tourism Development Authority | Revenue Intelligence v2.0</p>
                <div className="flex space-x-4">
                    <span>ML ENGINE: PROPHET v1.1</span>
                    <span>DATA SOURCE: CANONICAL_ANNUAL.CSV</span>
                </div>
            </footer>
        </div>
    );
};

export default RevenueDashboard;
