/**
 * RevenueGeoAdjustmentTile.jsx
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Geopolitical Revenue-Adjusted Forecast Tile Component
 *
 * Displays:
 * - Situation-adjusted revenue forecast (USD + LKR)
 * - Delta vs baseline with color coding
 * - Revenue at risk (monthly and weekly)
 * - Confidence range
 * - Severity status badge
 * - Active geopolitical signals (top 3-5)
 * - Actionable suggestions
 * - Cache freshness and staleness warnings
 * - Manual refresh button
 */

import React, { useState } from 'react';
import {
    AlertCircle,
    TrendingDown,
    TrendingUp,
    RefreshCw,
    Clock,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle2,
    Signal
} from 'lucide-react';
import { Card } from '../ui/card';
import { useRevenueGeoAnalysis } from '../../hooks/useRevenueGeoAnalysis';

const RevenueGeoAdjustmentTile = ({ className = '' }) => {
    const {
        tileData,
        loading,
        error,
        isStale,
        refresh
    } = useRevenueGeoAnalysis();

    const [showDetails, setShowDetails] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Handle manual refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    };

    // Get severity badge styling
    const getSeverityStyles = (level) => {
        const styles = {
            GREEN: {
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
                badgeBg: 'bg-emerald-100',
                badgeText: 'text-emerald-800',
                icon: 'text-emerald-600'
            },
            YELLOW: {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                badgeBg: 'bg-yellow-100',
                badgeText: 'text-yellow-800',
                icon: 'text-yellow-600'
            },
            ORANGE: {
                bg: 'bg-orange-50',
                border: 'border-orange-200',
                badgeBg: 'bg-orange-100',
                badgeText: 'text-orange-800',
                icon: 'text-orange-600'
            },
            RED: {
                bg: 'bg-red-50',
                border: 'border-red-200',
                badgeBg: 'bg-red-100',
                badgeText: 'text-red-800',
                icon: 'text-red-600'
            }
        };
        return styles[level] || styles.GREEN;
    };

    // Delta direction icon
    const getDeltaIcon = (direction) => {
        if (direction === 'DOWN') return <TrendingDown className="w-4 h-4" />;
        if (direction === 'UP') return <TrendingUp className="w-4 h-4" />;
        return null;
    };

    // Loading state
    if (loading) {
        return (
            <Card className={`${className} border-l-4 border-l-blue-500`}>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Geopolitical Revenue Analysis
                        </h3>
                        <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                    <div className="h-12 bg-gray-200 rounded animate-pulse" />
                    <div className="h-8 bg-gray-200 rounded animate-pulse" />
                </div>
            </Card>
        );
    }

    // Error state
    if (error || !tileData) {
        return (
            <Card className={`${className} border-l-4 border-l-red-500`}>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-gray-900">
                            Analysis Unavailable
                        </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                        {error || 'Could not load geopolitical revenue analysis.'}
                    </p>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {refreshing ? 'Refreshing...' : 'Retry'}
                    </button>
                </div>
            </Card>
        );
    }

    const {
        tile_display,
        situation_summary,
        adjustment,
        suggestions,
        cache_metadata
    } = tileData;

    const severity_level = situation_summary.severity_level;
    const styles = getSeverityStyles(severity_level);

    return (
        <Card className={`${className} border-l-4 ${styles.border.replace('border-', 'border-l-')}`}>
            <div className={`p-6 space-y-6 ${styles.bg}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {tile_display.primary_label}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {situation_summary.headline}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                            title="Refresh analysis"
                        >
                            <RefreshCw
                                className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`}
                            />
                        </button>
                        <div
                            className={`${styles.badgeBg} ${styles.badgeText} px-3 py-1 rounded-full text-sm font-medium cursor-help`}
                            title={situation_summary.severity_rationale}
                        >
                            {tile_display.situation_badge_text}
                        </div>
                    </div>
                </div>

                {/* Primary Metrics */}
                <div className="grid grid-cols-2 gap-6 py-4 border-y border-gray-300">
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            USD (Primary)
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                            {tile_display.primary_value}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            LKR (Secondary)
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                            {tile_display.secondary_value}
                        </p>
                    </div>
                </div>

                {/* Delta & Risk */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                            {tile_display.delta_label}
                        </p>
                        <div className="flex items-center gap-2">
                            <div className={styles.icon}>
                                {getDeltaIcon(tile_display.delta_direction)}
                            </div>
                            <p className={`text-xl font-bold ${
                                tile_display.delta_direction === 'DOWN' ? 'text-red-600' :
                                tile_display.delta_direction === 'UP' ? 'text-green-600' :
                                'text-gray-600'
                            }`}>
                                {tile_display.delta_value}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                            {tile_display.risk_label}
                        </p>
                        <p className="text-lg font-bold text-red-600">
                            {tile_display.risk_value}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                            {tile_display.weekly_risk_value} / week
                        </p>
                    </div>
                </div>

                {/* Confidence Range */}
                <div className="bg-white bg-opacity-60 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                        {tile_display.confidence_range_label}
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                        {tile_display.confidence_range_value}
                    </p>
                </div>

                {/* Staleness Warning */}
                {isStale && tile_display.staleness_warning && (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex gap-3">
                        <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-900">
                            {tile_display.staleness_warning}
                        </p>
                    </div>
                )}

                {/* Active Signals (Collapsible) */}
                {situation_summary.active_signals && situation_summary.active_signals.length > 0 && (
                    <div className="border-t pt-4">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center justify-between w-full p-2 hover:bg-white hover:bg-opacity-40 rounded transition"
                        >
                            <div className="flex items-center gap-2">
                                <Signal className="w-4 h-4 text-gray-700" />
                                <span className="font-semibold text-gray-900">
                                    Active Signals ({situation_summary.active_signals.length})
                                </span>
                            </div>
                            {showDetails ? (
                                <ChevronUp className="w-5 h-5 text-gray-600" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                            )}
                        </button>

                        {showDetails && (
                            <div className="mt-3 space-y-2">
                                {situation_summary.active_signals.slice(0, 5).map((signal, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white bg-opacity-70 p-3 rounded border-l-2 border-l-gray-400"
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <p className="font-medium text-gray-900 text-sm">
                                                {signal.signal_name}
                                            </p>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                                signal.confirmed
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {signal.confirmed ? 'Confirmed' : 'Unconfirmed'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            {signal.source_summary}
                                        </p>
                                        {signal.impact_channel && signal.impact_channel.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {signal.impact_channel.map((channel, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded"
                                                    >
                                                        {channel.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Suggestions */}
                {suggestions && suggestions.length > 0 && (
                    <div className="border-t pt-4">
                        <p className="font-semibold text-gray-900 mb-3">Suggested Actions</p>
                        <div className="space-y-2">
                            {suggestions.map((suggestion, idx) => (
                                <div key={idx} className="flex gap-3 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-gray-700">{suggestion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer: Data Freshness */}
                <div className="flex items-center justify-between text-xs text-gray-600 border-t pt-4">
                    <span>
                        {tile_display.data_freshness_label} • {
                            new Date(tileData.generated_at).toLocaleDateString()
                        }
                    </span>
                    <span className="text-gray-500">
                        Refreshes {cache_metadata.next_scheduled_refresh}
                    </span>
                </div>
            </div>
        </Card>
    );
};

export default RevenueGeoAdjustmentTile;
