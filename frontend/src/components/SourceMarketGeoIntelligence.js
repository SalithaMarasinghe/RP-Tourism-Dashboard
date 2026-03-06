import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const LoadingSpinner = () => (
    <div className="p-12 text-center text-gray-500">
        <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="mt-4">Analyzing global intelligence...</p>
    </div>
);

export const SourceMarketGeoIntelligence = () => {
    const [status, setStatus] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [aviationOpen, setAviationOpen] = useState(false);
    const [dataQualityOpen, setDataQualityOpen] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/source-markets/geo-intelligence/status`);
            if (res.ok) {
                const json = await res.json();
                setStatus(json);
                if (json.cache_exists && !json.is_stale) {
                    fetchData();
                } else {
                    fetchData(true);
                }
            }
        } catch (err) {
            console.error("Failed to fetch geo status", err);
            setLoading(false);
        }
    };

    const fetchData = async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        try {
            const url = forceRefresh
                ? `${API_BASE}/api/source-markets/geo-intelligence?refresh=true`
                : `${API_BASE}/api/source-markets/geo-intelligence`;

            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                setStatus({
                    cache_exists: true,
                    cached_at: json.cache_metadata.cached_at,
                    overall_risk_level: json.intelligence_summary.overall_risk_level
                });
            }
        } catch (err) {
            console.error("Failed to fetch geo data", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleRefresh = () => {
        fetchData(true);
    };

    let daysAgoText = "Unknown";
    if (status?.cached_at) {
        const cachedAt = new Date(status.cached_at);
        const diffTime = Math.abs(new Date() - cachedAt);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        daysAgoText = diffDays === 0 ? "Updated today" : `Updated ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    const riskLevelText = {
        LOW: "Low Risk",
        MEDIUM: "Monitor",
        HIGH: "High Risk",
        CRITICAL: "Critical"
    };

    const getRiskColor = (level, type = 'bg') => {
        switch (level) {
            case 'LOW': return type === 'bg' ? 'bg-emerald-500' : 'text-emerald-500';
            case 'MEDIUM': return type === 'bg' ? 'bg-yellow-500' : 'text-yellow-500';
            case 'HIGH': return type === 'bg' ? 'bg-orange-500' : 'text-orange-500';
            case 'CRITICAL': return type === 'bg' ? 'bg-red-500' : 'text-red-500';
            default: return type === 'bg' ? 'bg-gray-500' : 'text-gray-500';
        }
    };

    const statusIcons = {
        AT_RISK: "⚠️",
        OPPORTUNITY: "✅",
        MONITOR: "👁️",
        UNAFFECTED: "✓"
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 w-full">
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Market Geo-Intelligence</h2>
                    <p className="text-sm text-gray-500 mb-2">AI-powered source market risk & opportunity analysis</p>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">Powered by Groq + Web Intelligence</span>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    {status?.overall_risk_level && (
                        <div className={`px-3 py-1 rounded-full font-semibold text-sm text-white ${getRiskColor(status.overall_risk_level)}`}>
                            {riskLevelText[status.overall_risk_level] || status.overall_risk_level}
                        </div>
                    )}
                    <span className="text-xs text-gray-500">{daysAgoText}</span>
                    <button
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                        {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
                    </button>
                </div>
            </div>

            <div className="p-6">
                {loading && !data ? (
                    <LoadingSpinner />
                ) : data ? (
                    <>
                        {/* SECTION A: Banner */}
                        <div className={`p-5 rounded-lg mb-8 border-l-4 ${data.intelligence_summary.overall_risk_level === 'LOW' ? 'bg-emerald-50 border-emerald-500' :
                            data.intelligence_summary.overall_risk_level === 'MEDIUM' ? 'bg-yellow-50 border-yellow-500' :
                                data.intelligence_summary.overall_risk_level === 'HIGH' ? 'bg-orange-50 border-orange-500' :
                                    'bg-red-50 border-red-500'
                            }`}>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{data.intelligence_summary.dominant_event}</h3>
                            <p className="text-sm text-gray-700 mb-4 leading-relaxed">{data.intelligence_summary.headline}</p>
                            <div className="flex gap-3 flex-wrap">
                                <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700">🌍 {data.intelligence_summary.markets_affected_count} Markets Affected</div>
                                <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700">⚠️ {data.intelligence_summary.markets_at_risk_count} At Risk</div>
                                <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700">✅ {data.intelligence_summary.markets_with_opportunity_count} Opportunities</div>
                            </div>
                        </div>

                        {/* SECTION B: Alert Markets */}
                        {data.alert_markets?.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-base font-semibold text-gray-900 mb-4">⚠️ Markets Requiring Attention</h3>
                                <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                                    {data.alert_markets.map(market => (
                                        <div key={market.iso3} className="min-w-[280px] w-72 bg-gray-50 border border-gray-200 rounded-lg p-4 shrink-0 snap-start">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-gray-900">{market.flag_emoji} {market.country}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${market.urgency === 'WATCH' ? 'bg-blue-500' :
                                                    market.urgency === 'ACT_NOW' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                                                    }`}>
                                                    {market.urgency.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2" title={market.alert_reason}>{market.alert_reason}</p>
                                            <p className="text-sm font-semibold text-red-600 m-0">Est. Impact: {market.estimated_impact}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SECTION C: Opportunity Markets */}
                        {data.opportunity_markets?.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-base font-semibold text-gray-900 mb-4">✅ Market Opportunities</h3>
                                <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                                    {data.opportunity_markets.map(market => (
                                        <div key={market.iso3} className="min-w-[280px] w-72 bg-gray-50 border border-gray-200 rounded-lg p-4 shrink-0 snap-start">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-gray-900">{market.flag_emoji} {market.country}</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-emerald-500">OPPORTUNITY</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2" title={market.opportunity_reason}>{market.opportunity_reason}</p>
                                            <p className="text-sm font-semibold text-emerald-600 m-0">Est. Upside: {market.estimated_upside}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SECTION D: All Markets Grid */}
                        <div className="mb-8">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">All Source Markets — Current Status</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {data.market_assessments.map(market => (
                                    <div key={market.iso3} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-blue-500 transition-colors cursor-pointer" title={market.market_insight}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-semibold text-gray-900">{market.flag_emoji} {market.country}</span>
                                            <span title={market.status} className="text-lg">{statusIcons[market.status] || "•"}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>{market.risk_level} Risk</span>
                                            <span className="flex items-center gap-1" title={`Connectivity: ${market.flight_connectivity_status}`}>
                                                <span className={`w-2 h-2 rounded-full ${market.flight_connectivity_status === 'NORMAL' || market.flight_connectivity_status === 'IMPROVED' ? 'bg-emerald-500' :
                                                    market.flight_connectivity_status === 'REDUCED' ? 'bg-amber-500' :
                                                        market.flight_connectivity_status === 'DISRUPTED' || market.flight_connectivity_status === 'SUSPENDED' ? 'bg-red-500' :
                                                            'bg-gray-400'
                                                    }`}></span>
                                                Flights
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SECTION E: Aviation Intelligence */}
                        <div className="border border-gray-200 rounded-lg mb-8 overflow-hidden">
                            <button
                                onClick={() => setAviationOpen(!aviationOpen)}
                                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors font-semibold text-sm text-gray-900"
                            >
                                <span>✈️ Aviation & Connectivity Intelligence</span>
                                <span className="text-gray-500">{aviationOpen ? '▲' : '▼'}</span>
                            </button>

                            {aviationOpen && (
                                <div className="p-4 bg-white border-t border-gray-200">
                                    <p className="text-sm font-medium text-gray-600 mb-4">
                                        Overall Status: <strong className="text-gray-900">{data.aviation_intelligence.overall_connectivity_status}</strong>
                                    </p>

                                    {data.aviation_intelligence.hub_alerts?.length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Transit Hub Alerts</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                                            <th className="p-2 font-semibold">Hub</th>
                                                            <th className="p-2 font-semibold">Status</th>
                                                            <th className="p-2 font-semibold">Markets</th>
                                                            <th className="p-2 font-semibold">Detail</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.aviation_intelligence.hub_alerts.map((hub, i) => (
                                                            <tr key={i} className="border-b border-gray-200 text-gray-800">
                                                                <td className="p-2 font-semibold">{hub.hub}</td>
                                                                <td className="p-2">{hub.status}</td>
                                                                <td className="p-2">{hub.affected_markets.join(', ')}</td>
                                                                <td className="p-2">{hub.detail}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {data.aviation_intelligence.route_changes?.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Specific Route Changes</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                                            <th className="p-2 font-semibold">Route</th>
                                                            <th className="p-2 font-semibold">Change</th>
                                                            <th className="p-2 font-semibold">Market</th>
                                                            <th className="p-2 font-semibold">Detail</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.aviation_intelligence.route_changes.map((route, i) => (
                                                            <tr key={i} className="border-b border-gray-200 text-gray-800">
                                                                <td className="p-2 font-semibold">{route.route}</td>
                                                                <td className="p-2">{route.change_type}</td>
                                                                <td className="p-2">{route.affected_market}</td>
                                                                <td className="p-2">{route.detail}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 mt-4 italic">Note: {data.aviation_intelligence.connectivity_note}</p>
                                </div>
                            )}
                        </div>

                        {/* SECTION F: Recommendations */}
                        <div className="mb-8">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
                            <div className="flex flex-col gap-4">
                                {data.strategic_recommendations.map(rec => (
                                    <div key={rec.priority} className={`flex gap-4 p-4 rounded-r-lg bg-gray-50 border-l-4 ${rec.timeframe === 'IMMEDIATE' ? 'border-red-500' :
                                        rec.timeframe === 'SHORT_TERM' ? 'border-orange-500' : 'border-blue-500'
                                        }`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${rec.timeframe === 'IMMEDIATE' ? 'bg-red-500' :
                                            rec.timeframe === 'SHORT_TERM' ? 'bg-orange-500' : 'bg-blue-500'
                                            }`}>
                                            {rec.priority}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-semibold text-gray-900">{rec.target_market}</span>
                                                <span className="text-xs font-bold text-gray-500">{rec.timeframe.replace('_', ' ')}</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900 mb-1">{rec.recommendation}</p>
                                            <p className="text-xs text-gray-600 mb-0">{rec.rationale}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FOOTER: Data Quality */}
                        <div className="border-t border-gray-200 pt-6 mt-6">
                            <button
                                onClick={() => setDataQualityOpen(!dataQualityOpen)}
                                className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors mb-4 flex justify-center items-center gap-2"
                            >
                                <span>Data Quality & Sources</span>
                                <span>{dataQualityOpen ? '▲' : '▼'}</span>
                            </button>

                            {dataQualityOpen && (
                                <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg mb-6 leading-relaxed">
                                    <p><strong>Queries:</strong> {data.data_quality.gcs_queries_executed} GCS, {data.data_quality.tavily_queries_executed} Tavily</p>
                                    <p><strong>Signals:</strong> {data.data_quality.confirmed_signals} confirmed out of {data.data_quality.total_signals_evaluated} evaluated</p>
                                    <p><strong>Domains Indexed:</strong> {data.data_quality.gcs_domains_with_results.join(', ')}</p>
                                    <p><strong>Confidence:</strong> {data.data_quality.confidence_note}</p>
                                </div>
                            )}

                            <p className="text-center text-xs text-gray-400">
                                Analysis sourced from 15 authoritative domains via Google Custom Search + Tavily real-time search. Powered by Groq LLM.
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-center text-gray-500">No data available.</p>
                )}
            </div>
        </div>
    );
};
