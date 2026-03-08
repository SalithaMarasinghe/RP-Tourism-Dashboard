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

    // Consolidate events: group by label and find min/max dates
    const consolidatedEvents = React.useMemo(() => {
        if (!events || events.length === 0) return [];
        
        const grouped = {};
        
        // Group events by their label
        events.forEach(ev => {
            const label = ev.label || 'Unknown';
            if (!grouped[label]) {
                grouped[label] = {
                    label,
                    dates: [],
                    type: ev.type
                };
            }
            grouped[label].dates.push(new Date(ev.ds));
        });
        
        // Convert to array and create date range display
        return Object.values(grouped).map(group => {
            const dates = group.dates.sort((a, b) => a - b);
            const startDate = dates[0];
            const endDate = dates[dates.length - 1];
            
            // If all dates are the same month/year, just show one date
            // Otherwise show date range
            const isSingleMonth = startDate.getFullYear() === endDate.getFullYear() && 
                                   startDate.getMonth() === endDate.getMonth();
            
            return {
                label: group.label,
                type: group.type,
                startDate,
                endDate,
                displayDate: isSingleMonth 
                    ? startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
            };
        });
    }, [events]);

    // Filter anomalies for the selected metric and sort by score (impact)
    const filteredAnomalies = (anomalies || [])
        .filter(a => a.metric === selectedMetric)
        .sort((a, b) => b.anomaly_score - a.anomaly_score)
        .slice(0, 10);

    const renderBadge = (type) => {
        switch (type?.toLowerCase()) {
            case 'shock':
                return <Badge className="text-[10px] bg-red-500/20 text-red-300 border border-red-700">SHOCK</Badge>;
            case 'recovery':
                return <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-700">RECOVERY</Badge>;
            default:
                return <Badge className="text-[10px] bg-[#1b1b1b] text-gray-300 border border-[#2a2a2a]">EVENT</Badge>;
        }
    };

    const formatDate = (ds) => {
        return new Date(ds).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return (
        <Card className="shadow-sm !bg-[#151515] !border-[#2a2a2a] h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-white flex items-center">
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
                        <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-2 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            Historical Milestones
                        </h4>

                        {(consolidatedEvents?.length > 0) ? (
                            <div className="space-y-2">
                                {consolidatedEvents.map((ev, i) => (
                                    <div key={i} className="flex items-start space-x-2 group">
                                        <div className="mt-0.5">
                                            {renderBadge(ev.label?.toLowerCase().includes('recovery') ? 'recovery' : (ev.label?.toLowerCase().includes('attacks') || ev.label?.toLowerCase().includes('crisis') || ev.label?.toLowerCase().includes('covid') ? 'shock' : 'event'))}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-100 group-hover:text-blue-400 transition-colors">{ev.label}</p>
                                            <p className="text-[10px] text-gray-400">{ev.displayDate}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-gray-400 italic">No events recorded for this range.</p>
                        )}
                    </div>

                    {/* 2. Statistical Anomalies */}
                    <div className="pt-2 border-t border-[#2a2a2a] mt-4">
                        <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest mb-2 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Detected Outliers
                        </h4>

                        {(filteredAnomalies.length > 0) ? (
                            <div className="space-y-3">
                                {filteredAnomalies.map((anom, i) => (
                                    <div key={i} className="bg-[#1b1b1b] p-2 rounded-lg border border-[#2a2a2a] hover:border-amber-700 transition-all">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-gray-100">{formatDate(anom.ds)}</span>
                                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                                                SCORE: {anom.anomaly_score.toFixed(1)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-300 leading-relaxed italic">
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

            <div className="p-3 bg-[#1b1b1b] border-t border-[#2a2a2a] flex items-center justify-between">
                <span className="text-[10px] text-blue-300 font-medium">Monitoring {selectedMetric}</span>
                <ArrowRight className="h-3 w-3 text-blue-300" />
            </div>
        </Card>
    );
};

export default RevenueInsightPanel;
