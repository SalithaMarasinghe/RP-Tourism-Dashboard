import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
    AlertCircle,
    Info,
    Zap,
    RefreshCw,
    Calendar,
    ArrowRight
} from 'lucide-react';

/**
 * RevenueInsightPanel
 * 
 * Provides a structured, textual summary of tourism shocks, 
 * recovery periods, and statistical anomalies.
 * 
 * @param {Object} props
 * @param {Array} props.events - Historical event markers
 * @param {Array} props.anomalies - Statistical anomaly records
 * @param {string} props.selectedMetric - The metric being focused on
 */
const RevenueInsightPanel = ({ events, anomalies, selectedMetric = 'revenue_usd_mn' }) => {

    // Filter anomalies for the selected metric and sort by score (impact)
    const filteredAnomalies = (anomalies || [])
        .filter(a => a.metric === selectedMetric)
        .sort((a, b) => b.anomaly_score - a.anomaly_score)
        .slice(0, 10);

    // Group events by type for better organization
    const groupedEvents = (events || []).reduce((acc, ev) => {
        const type = ev.type || 'event';
        if (!acc[type]) acc[type] = [];
        acc[type].push(ev);
        return acc;
    }, {});

    const renderBadge = (type) => {
        switch (type?.toLowerCase()) {
            case 'shock': return <Badge variant="destructive" className="text-[10px]">SHOCK</Badge>;
            case 'recovery': return <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-emerald-200">RECOVERY</Badge>;
            default: return <Badge variant="secondary" className="text-[10px]">EVENT</Badge>;
        }
    };

    const formatDate = (ds) => {
        return new Date(ds).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return (
        <Card className="shadow-sm border-gray-100 h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-3 border-b border-gray-50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-gray-800 flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-amber-500" />
                        Intelligence Insights
                    </CardTitle>
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                        Anomalies & Events
                    </div>
                </div>
            </CardHeader>

            <ScrollArea className="flex-1">
                <CardContent className="p-4 space-y-6">

                    {/* 1. Historical Shocks & Events */}
                    <div>
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Historical Milestones
                        </h4>

                        {(events?.length > 0) ? (
                            <div className="space-y-3">
                                {events.map((ev, i) => (
                                    <div key={i} className="flex items-start space-x-3 group">
                                        <div className="mt-1">
                                            {renderBadge(ev.label?.toLowerCase().includes('recovery') ? 'recovery' : (ev.label?.toLowerCase().includes('attacks') || ev.label?.toLowerCase().includes('crisis') || ev.label?.toLowerCase().includes('covid') ? 'shock' : 'event'))}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{ev.label}</p>
                                            <p className="text-[10px] text-gray-400">{formatDate(ev.ds)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-gray-400 italic">No events recorded for this range.</p>
                        )}
                    </div>

                    {/* 2. Statistical Anomalies */}
                    <div className="pt-2 border-t border-gray-50 mt-4">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Detected Outliers
                        </h4>

                        {(filteredAnomalies.length > 0) ? (
                            <div className="space-y-4">
                                {filteredAnomalies.map((anom, i) => (
                                    <div key={i} className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/50 hover:border-amber-200 transition-all">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-gray-900">{formatDate(anom.ds)}</span>
                                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                                                SCORE: {anom.anomaly_score.toFixed(1)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 leading-relaxed italic">
                                            "{anom.anomaly_reason}"
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                                <RefreshCw className="h-5 w-5 text-emerald-300 animate-spin-slow" />
                                <p className="text-[10px] text-gray-400">Data within normal variance.</p>
                            </div>
                        )}
                    </div>

                </CardContent>
            </ScrollArea>

            <div className="p-3 bg-blue-50/30 border-t border-blue-50 flex items-center justify-between">
                <span className="text-[10px] text-blue-600 font-medium">Monitoring {selectedMetric}</span>
                <ArrowRight className="h-3 w-3 text-blue-400" />
            </div>
        </Card>
    );
};

export default RevenueInsightPanel;
