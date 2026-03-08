import React, { useMemo } from 'react';
import { AlertCircle, RefreshCcw, SlidersHorizontal } from 'lucide-react';

import { useDemographicCohortTracker } from '../hooks/useDemographicCohortTracker';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../components/ui/select';
import { Button } from '../components/ui/button';

import DemographicKpiCards from '../components/demographic/DemographicKpiCards';
import AgeCohortAreaChart from '../components/demographic/AgeCohortAreaChart';
import DemographicPopulationPyramid from '../components/demographic/DemographicPopulationPyramid';
import DemographicHeatmap from '../components/demographic/DemographicHeatmap';
import RisingSegmentAlerts from '../components/demographic/RisingSegmentAlerts';

const TREND_GROUP_OPTIONS = [
    { value: 'age', label: 'Age' },
    { value: 'gender', label: 'Gender' },
    { value: 'purpose', label: 'Purpose' }
];

const HEATMAP_GROUP_OPTIONS = [
    { value: 'age', label: 'Age' },
    { value: 'purpose', label: 'Purpose' }
];

const DemographicCohortTracker = () => {
    const {
        selectedYear,
        selectedTrendGroup,
        selectedHeatmapGroup,
        loading,
        isLoading,
        error,
        errors,
        kpi,
        trendPoints,
        pyramidRows,
        heatmapCells,
        alerts,
        availableYears,
        setSelectedYear,
        setSelectedTrendGroup,
        setSelectedHeatmapGroup,
        refreshAll
    } = useDemographicCohortTracker({
        initialTrendGroup: 'age',
        initialHeatmapGroup: 'age'
    });

    const yearOptions = useMemo(() => {
        if (!Array.isArray(availableYears) || availableYears.length === 0) return [];
        return [...availableYears].sort((a, b) => b - a);
    }, [availableYears]);

    const summaryForCards = useMemo(() => {
        return {
            ...kpi,
            rising_alert_count: Array.isArray(alerts) ? alerts.length : 0
        };
    }, [alerts, kpi]);

    const hasAnyData = Boolean(
        kpi ||
        (Array.isArray(trendPoints) && trendPoints.length > 0) ||
        (Array.isArray(pyramidRows) && pyramidRows.length > 0) ||
        (Array.isArray(heatmapCells) && heatmapCells.length > 0) ||
        (Array.isArray(alerts) && alerts.length > 0)
    );

    if (error && !hasAnyData && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
                <div className="bg-red-500/15 border border-red-800 p-4 rounded-full">
                    <AlertCircle className="h-12 w-12 text-red-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Demographic Tracker Unavailable</h2>
                    <p className="text-gray-300 max-w-xl mt-1">
                        We could not load demographic cohort data at this time. Please retry.
                    </p>
                </div>
                <Button
                    onClick={refreshAll}
                    variant="outline"
                    className="mt-4 bg-[#151515] border-[#2a2a2a] text-gray-100 hover:bg-[#1b1b1b] hover:text-white"
                >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        Demographic <span className="text-blue-600">Cohort Tracker</span>
                    </h1>
                    <p className="text-sm text-gray-300 font-medium">
                        Multi-year demographic segment monitoring using share-based intelligence.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-3 bg-[#151515] p-3 rounded-xl border border-[#2a2a2a] shadow-sm">
                    <div className="flex items-center gap-2 text-gray-300 pr-1">
                        <SlidersHorizontal className="h-4 w-4" />
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-1">
                            Year
                        </label>
                        <Select
                            value={selectedYear ? String(selectedYear) : undefined}
                            onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
                            disabled={yearOptions.length === 0}
                        >
                            <SelectTrigger className="w-[120px] h-9 text-xs border-[#2a2a2a] bg-[#1b1b1b] text-gray-100 hover:bg-[#222222]">
                                <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#151515] border-[#2a2a2a] text-gray-100">
                                {yearOptions.map((year) => (
                                    <SelectItem key={year} value={String(year)} className="text-xs text-gray-100 focus:bg-[#1b1b1b] focus:text-gray-100">
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-1">
                            Trend Group
                        </label>
                        <Select value={selectedTrendGroup} onValueChange={setSelectedTrendGroup}>
                            <SelectTrigger className="w-[130px] h-9 text-xs border-[#2a2a2a] bg-[#1b1b1b] text-gray-100 hover:bg-[#222222]">
                                <SelectValue placeholder="Trend group" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#151515] border-[#2a2a2a] text-gray-100">
                                {TREND_GROUP_OPTIONS.map((item) => (
                                    <SelectItem key={item.value} value={item.value} className="text-xs text-gray-100 focus:bg-[#1b1b1b] focus:text-gray-100">
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col space-y-1">
                        <label className="text-[10px] font-bold text-gray-300 uppercase tracking-widest px-1">
                            Heatmap Group
                        </label>
                        <Select value={selectedHeatmapGroup} onValueChange={setSelectedHeatmapGroup}>
                            <SelectTrigger className="w-[160px] h-9 text-xs border-[#2a2a2a] bg-[#1b1b1b] text-gray-100 hover:bg-[#222222]">
                                <SelectValue placeholder="Heatmap group" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#151515] border-[#2a2a2a] text-gray-100">
                                {HEATMAP_GROUP_OPTIONS.map((item) => (
                                    <SelectItem key={item.value} value={item.value} className="text-xs text-gray-100 focus:bg-[#1b1b1b] focus:text-gray-100">
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="outline"
                        className="h-9 text-xs bg-[#151515] border-[#2a2a2a] text-gray-100 hover:bg-[#1b1b1b] hover:text-white"
                        onClick={refreshAll}
                    >
                        <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                        Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-amber-700 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    <p className="font-medium">Some demographic data could not be loaded.</p>
                    <p className="text-xs mt-1 opacity-90">
                        {error}
                    </p>
                    {Object.values(errors || {}).some(Boolean) && (
                        <p className="text-xs mt-1">
                            Partial sections may show empty states until retry.
                        </p>
                    )}
                </div>
            )}

            <section>
                <DemographicKpiCards summary={summaryForCards} loading={loading.kpis} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                    <AgeCohortAreaChart
                        data={selectedTrendGroup === 'age' ? trendPoints : []}
                        loading={loading.trends}
                    />
                </div>
                <div>
                    <DemographicPopulationPyramid
                        data={pyramidRows}
                        loading={loading.pyramid}
                    />
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="xl:col-span-1">
                    <DemographicHeatmap
                        data={{ cells: heatmapCells }}
                        group={selectedHeatmapGroup}
                        loading={loading.heatmap}
                    />
                </div>
                <div className="xl:col-span-1">
                    <RisingSegmentAlerts
                        alerts={alerts}
                        loading={loading.alerts}
                    />
                </div>
            </section>
        </div>
    );
};

export default DemographicCohortTracker;
