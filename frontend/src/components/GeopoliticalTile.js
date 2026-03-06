import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ─── Badge color config ──────────────────────────────────────────────────────
const BADGE_CONFIG = {
    GREEN: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        dot: 'bg-green-500',
        pill: 'bg-green-500',
        pulsing: false,
    },
    YELLOW: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        dot: 'bg-yellow-500',
        pill: 'bg-yellow-500',
        pulsing: false,
    },
    ORANGE: {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-300',
        dot: 'bg-orange-500',
        pill: 'bg-orange-500',
        pulsing: false,
    },
    RED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        dot: 'bg-red-500',
        pill: 'bg-red-500',
        pulsing: true,
    },
};

// ─── Pulsing animation style (injected once) ─────────────────────────────────
const PULSE_STYLE = `
  @keyframes geo-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .geo-badge-pulse {
    animation: geo-pulse 1.5s ease-in-out infinite;
  }
`;

function injectPulseStyle() {
    if (!document.getElementById('geo-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'geo-pulse-style';
        style.textContent = PULSE_STYLE;
        document.head.appendChild(style);
    }
}

// ─── Helper: get Firebase ID token ───────────────────────────────────────────
async function getIdToken() {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
}

// ─── SituationBadge ──────────────────────────────────────────────────────────
function SituationBadge({ badge, badgeText }) {
    const cfg = BADGE_CONFIG[badge] || BADGE_CONFIG.GREEN;
    const pulseClass = cfg.pulsing ? 'geo-badge-pulse' : '';
    return (
        <span
            id="geo-situation-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} ${pulseClass}`}
        >
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {badgeText}
        </span>
    );
}

// ─── DeltaBadge ──────────────────────────────────────────────────────────────
function DeltaBadge({ deltaValue, deltaDirection }) {
    const colorMap = {
        DOWN: 'bg-red-100 text-red-700 border border-red-200',
        UP: 'bg-green-100 text-green-700 border border-green-200',
        NEUTRAL: 'bg-gray-100 text-gray-600 border border-gray-200',
    };
    const cls = colorMap[deltaDirection] || colorMap.NEUTRAL;
    return (
        <span
            id="geo-delta-badge"
            className={`inline-block px-2.5 py-1 rounded-md text-sm font-bold ${cls}`}
        >
            {deltaDirection === 'DOWN' ? '↓' : deltaDirection === 'UP' ? '↑' : '→'} {deltaValue}
        </span>
    );
}

// ─── LoadingSkeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
    return (
        <div
            id="geo-loading-skeleton"
            className="animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm p-6"
            aria-label="Loading geopolitical tile"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-56 bg-gray-200 rounded" />
                <div className="h-8 w-28 bg-gray-200 rounded-lg" />
            </div>
            <div className="flex items-end gap-4 mb-4">
                <div className="h-12 w-40 bg-gray-200 rounded" />
                <div className="h-7 w-20 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-1/2 bg-gray-200 rounded mb-4" />
            <div className="h-3 w-1/3 bg-gray-200 rounded" />
        </div>
    );
}

// ─── FallbackTile ─────────────────────────────────────────────────────────────
function FallbackTile({ message }) {
    return (
        <div
            id="geo-fallback-tile"
            className="rounded-xl border border-gray-200 bg-white shadow-sm p-6"
        >
            <div className="flex items-center gap-3 text-gray-500">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-sm">{message}</p>
            </div>
        </div>
    );
}

// ─── CollapsibleSection ──────────────────────────────────────────────────────
function CollapsibleSection({ id, title, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-t border-gray-100 mt-4">
            <button
                id={id}
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                aria-expanded={open}
            >
                {title}
                <svg
                    className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <div className="pb-3">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Main GeopoliticalTile Component ─────────────────────────────────────────
function GeopoliticalTile() {
    const { currentUser } = useAuth();

    const [tileData, setTileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [staleWarning, setStaleWarning] = useState(false);
    const [error, setError] = useState(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);

    // Inject CSS once
    useEffect(() => { injectPulseStyle(); }, []);

    // ─── Fetch tile on mount ────────────────────────────────────────────────
    const fetchTile = useCallback(async () => {
        setLoading(true);
        setError(null);
        setStaleWarning(false);
        try {
            const resp = await fetch(`${API_BASE}/api/geopolitical-tile`);
            const json = await resp.json();

            if (resp.status === 503) {
                if (json.last_cached_tile) {
                    setTileData(json.last_cached_tile);
                    setStaleWarning(true);
                } else {
                    setError(json.message || 'Situation analysis currently unavailable. Baseline forecast is shown below.');
                }
                return;
            }

            if (!resp.ok) {
                setError('Situation analysis currently unavailable. Baseline forecast is shown below.');
                return;
            }

            setTileData(json);
        } catch (e) {
            console.error('[GeopoliticalTile] Fetch error:', e);
            setError('Situation analysis currently unavailable. Baseline forecast is shown below.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTile(); }, [fetchTile]);

    // ─── Refresh handler ─────────────────────────────────────────────────────
    const handleRefresh = async () => {
        if (refreshing) return;
        setRefreshing(true);
        setError(null);
        try {
            const token = await getIdToken();
            const resp = await fetch(`${API_BASE}/api/geopolitical-tile/refresh`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await resp.json();
            if (!resp.ok) {
                setError('Refresh failed. Please try again.');
                return;
            }
            setTileData(json);
            setStaleWarning(false);
        } catch (e) {
            console.error('[GeopoliticalTile] Refresh error:', e);
            setError('Refresh failed. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    // ─── Render loading ──────────────────────────────────────────────────────
    if (loading) return <LoadingSkeleton />;

    // ─── Render fallback ─────────────────────────────────────────────────────
    if (error && !tileData) {
        return <FallbackTile message={error} />;
    }

    const td = tileData?.tile_display || {};
    const ss = tileData?.situation_summary || {};
    const adj = tileData?.adjustment || {};
    const dq = tileData?.data_quality || {};
    const suggestions = tileData?.suggestions || [];
    const badge = td.situation_badge || 'GREEN';
    const badgeCfg = BADGE_CONFIG[badge] || BADGE_CONFIG.GREEN;

    return (
        <div
            id="geo-tile-wrapper"
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6"
        >
            {/* ── Stale / error banners ────────────────────────────────────────── */}
            {staleWarning && (
                <div
                    id="geo-stale-banner"
                    className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm flex items-center gap-2"
                >
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Live analysis unavailable. Showing last known data.
                </div>
            )}
            {td.staleness_warning && !staleWarning && (
                <div
                    id="geo-staleness-warning"
                    className="px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm flex items-center gap-2"
                >
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    {td.staleness_warning}
                </div>
            )}
            {error && tileData && (
                <div
                    id="geo-inline-error"
                    className="px-5 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm"
                >
                    {error}
                </div>
            )}

            {/* ── Main tile content ────────────────────────────────────────────── */}
            <div className="p-6">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                {td.primary_label || 'Situation-Adjusted Forecast'}
                            </p>
                            {tileData?.forecast_month && (
                                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium border border-blue-100">
                                    {tileData.forecast_month}
                                </span>
                            )}
                        </div>
                        <div className="flex items-end gap-3">
                            {/* Primary value with tooltip trigger */}
                            <div
                                className="relative"
                                onMouseEnter={() => setTooltipVisible(true)}
                                onMouseLeave={() => setTooltipVisible(false)}
                            >
                                <span
                                    id="geo-primary-value"
                                    className="text-4xl font-extrabold text-gray-900 tracking-tight cursor-default select-none"
                                >
                                    {td.primary_value || '—'}
                                </span>
                                {/* Tooltip */}
                                {tooltipVisible && td.tooltip_summary && (
                                    <div
                                        id="geo-tooltip"
                                        className="absolute bottom-full left-0 mb-2 z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs"
                                        style={{ minWidth: '220px' }}
                                    >
                                        {td.tooltip_summary}
                                        <div className="absolute bottom-0 left-4 -mb-1 w-2 h-2 bg-gray-900 rotate-45" />
                                    </div>
                                )}
                            </div>
                            <DeltaBadge
                                deltaValue={td.delta_value}
                                deltaDirection={td.delta_direction}
                            />
                        </div>
                    </div>

                    {/* Right side: badge + refresh */}
                    <div className="flex flex-col items-end gap-2">
                        <SituationBadge badge={badge} badgeText={td.situation_badge_text} />
                        {currentUser && (
                            <button
                                id="geo-refresh-btn"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                  ${refreshing
                                        ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                        : 'border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                                    }`}
                                aria-label="Refresh geopolitical analysis"
                            >
                                <svg
                                    className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {refreshing ? 'Refreshing…' : 'Refresh Now'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Loading overlay during refresh */}
                {refreshing && (
                    <div
                        id="geo-refresh-overlay"
                        className="flex items-center justify-center py-2 mb-3"
                    >
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Running geopolitical analysis pipeline…
                        </div>
                    </div>
                )}

                {/* Headline */}
                {ss.headline && (
                    <p
                        id="geo-headline"
                        className="text-sm text-gray-600 mb-3 leading-relaxed"
                    >
                        {ss.headline}
                    </p>
                )}

                {/* Confidence range + freshness */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    {td.confidence_range_value && (
                        <span id="geo-confidence-range">
                            <span className="font-medium text-gray-600">Estimated Range:</span>{' '}
                            {td.confidence_range_value}
                        </span>
                    )}
                    {td.data_freshness_label && (
                        <span
                            id="geo-freshness-label"
                            className="text-gray-400"
                        >
                            {td.data_freshness_label}
                        </span>
                    )}
                </div>

                {/* ── Recommendations (collapsible) ──────────────────────────────── */}
                {suggestions.length > 0 && (
                    <CollapsibleSection
                        id="geo-recommendations-toggle"
                        title={`Recommendations (${suggestions.length})`}
                    >
                        <ul
                            id="geo-recommendations-list"
                            className="space-y-2 text-sm text-gray-700"
                        >
                            {suggestions.map((s, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="mt-1 w-4 h-4 flex-shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                        {i + 1}
                                    </span>
                                    <span>{s}</span>
                                </li>
                            ))}
                        </ul>
                    </CollapsibleSection>
                )}

                {/* ── Data Sources (collapsible) ──────────────────────────────────── */}
                {dq.domains_with_no_results && dq.domains_with_no_results.length > 0 && (
                    <CollapsibleSection
                        id="geo-data-sources-toggle"
                        title="Data Sources"
                    >
                        <div className="text-xs text-gray-500 space-y-1">
                            <p className="text-gray-400 mb-2">
                                Domains that returned no results in this analysis run:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {dq.domains_with_no_results.map((d, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </CollapsibleSection>
                )}
            </div>
        </div>
    );
}

export default GeopoliticalTile;
