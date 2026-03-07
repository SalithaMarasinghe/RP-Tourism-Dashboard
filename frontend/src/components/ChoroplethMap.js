import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ── Annotation banner colour by year ─────────────────────────────────────────
const BANNER_COLORS = {
    2018: { bg: '#FF6B35', text: '#fff' },              // orange – peak
    2019: { bg: '#FF4444', text: '#fff' },              // red    – crisis
    2020: { bg: '#FF4444', text: '#fff' },
    2021: { bg: '#FF4444', text: '#fff' },
    2022: { bg: '#2A9D8F', text: '#fff' },              // teal   – recovery
    2023: { bg: '#2A9D8F', text: '#fff' },
    2024: { bg: '#2A9D8F', text: '#fff' },
};

const SEGMENTS = [
    { label: 'Mature', color: '#457B9D' },
    { label: 'Emerging', color: '#80B918' },
    { label: 'Declining', color: '#FB8500' },
];

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());
const fmtYoy = (v) => {
    if (v == null) return 'N/A';
    return `${v > 0 ? '+' : ''}${v.toFixed(1)}% vs prior year`;
};

// ── Build Plotly choropleth figure ────────────────────────────────────────────
function buildChoropleth(apiData, activeFrameIdx) {
    const { frames } = apiData;
    const frame = frames[activeFrameIdx];

    const iso3List = frame.data.map((d) => d.iso3);
    const zList = frame.data.map((d) => d.arrivals);
    const textList = frame.data.map((d) => {
        const yoy = fmtYoy(d.yoy_pct);
        return (
            `<b>${d.country}</b><br>` +
            `${fmt(d.arrivals)} tourists<br>` +
            `${yoy}<br>` +
            `${d.segment} market  ·  #${d.rank} source market`
        );
    });

    // Add Sri Lanka as a separate highlighted trace
    const traces = [
        {
            type: 'choropleth',
            locationmode: 'ISO-3',
            locations: iso3List,
            z: zList,
            text: textList,
            hovertemplate: '%{text}<extra></extra>',
            colorscale: 'YlOrRd',
            zmin: 0,
            zmax: 480000,
            colorbar: {
                title: { text: 'Arrivals', font: { size: 11 } },
                thickness: 12,
                len: 0.6,
                tickformat: ',.0s',
            },
            marker: { line: { color: 'rgba(255,255,255,0.3)', width: 0.5 } },
        },
        // Sri Lanka overlay — green outlined dot
        {
            type: 'scattergeo',
            lon: [80.7718],
            lat: [7.8731],
            mode: 'markers+text',
            text: ['🇱🇰 Sri Lanka'],
            textposition: 'top center',
            textfont: { size: 10, color: '#16a34a' },
            marker: {
                size: 12,
                color: '#22c55e',
                symbol: 'star',
                line: { color: '#15803d', width: 2 },
            },
            hoverinfo: 'text',
            hovertext: 'Sri Lanka — Tourist Destination',
            showlegend: false,
        },
    ];

    const layout = {
        autosize: true,
        height: 420,
        margin: { l: 0, r: 0, t: 0, b: 0 },
        paper_bgcolor: 'transparent',
        geo: {
            showframe: false,
            showcoastlines: true,
            coastlinecolor: 'rgba(148,163,184,0.4)',
            showland: true,
            landcolor: '#e2e8f0',
            showocean: true,
            oceancolor: '#f0f9ff',
            showlakes: false,
            showcountries: true,
            countrycolor: 'rgba(148,163,184,0.3)',
            projection: { type: 'natural earth' },
            bgcolor: 'transparent',
        },
        dragmode: false,
    };

    return { traces, layout };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChoroplethMap() {
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const plotDivRef = useRef(null);
    const intervalRef = useRef(null);
    const plotReadyRef = useRef(false);

    // ── 1. Fetch ───────────────────────────────────────────────────────────────
    useEffect(() => {
        axios
            .get(`${API_BASE}/api/source-markets/choropleth`)
            .then((res) => setApiData(res.data))
            .catch((err) => {
                console.error('Choropleth API error:', err);
                setError(err?.response?.data?.error || 'Failed to load choropleth data.');
            })
            .finally(() => setLoading(false));
    }, []);

    // ── 2. Render / update Plotly when active frame changes ───────────────────
    const renderPlot = useCallback((div, data, idx) => {
        const Plotly = window.Plotly;
        if (!Plotly || !div || !data) return;

        const { traces, layout } = buildChoropleth(data, idx);

        if (!plotReadyRef.current) {
            Plotly.newPlot(div, traces, layout, {
                displayModeBar: false,
                responsive: true,
                scrollZoom: false,
            }).then(() => { plotReadyRef.current = true; });
        } else {
            Plotly.react(div, traces, layout, {
                displayModeBar: false,
                responsive: true,
                scrollZoom: false,
            });
        }
    }, []);

    const plotDivCallback = useCallback(
        (node) => {
            plotDivRef.current = node;
            if (node && apiData) renderPlot(node, apiData, activeIdx);
        },
        [apiData], // activeIdx intentionally omitted — init only on first data load
    );

    // Re-render on frame change
    useEffect(() => {
        if (apiData && plotDivRef.current) {
            renderPlot(plotDivRef.current, apiData, activeIdx);
        }
    }, [activeIdx, apiData, renderPlot]);

    // ── 3. Auto-play logic ─────────────────────────────────────────────────────
    useEffect(() => {
        if (playing && apiData) {
            intervalRef.current = setInterval(() => {
                setActiveIdx((prev) => {
                    const next = prev + 1;
                    if (next >= apiData.frames.length) {
                        setPlaying(false);
                        return prev;
                    }
                    return next;
                });
            }, 1200);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [playing, apiData]);

    // Auto-start on load (run only when apiData first arrives)
    useEffect(() => {
        if (apiData && !playing) {
            setTimeout(() => setPlaying(true), 600);
        }
    }, [apiData]); // playing intentionally omitted to avoid re-triggering

    // Cleanup
    useEffect(() => {
        return () => {
            clearInterval(intervalRef.current);
            if (plotDivRef.current && window.Plotly) {
                window.Plotly.purge(plotDivRef.current);
            }
        };
    }, []);

    // ── Loading / error states ─────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Loading geographic data…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 border border-red-200 p-5 text-center">
                <p className="text-red-700 font-medium text-sm">⚠️ {error}</p>
            </div>
        );
    }

    if (!apiData) return null;

    const activeFrame = apiData.frames[activeIdx];
    const years = apiData.years;
    const banner = BANNER_COLORS[activeFrame.year];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            {/* Card header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Geographic Source Distribution</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Where Sri Lanka's tourists come from — by year
                    </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 pt-1">
                    {SEGMENTS.map((seg) => (
                        <span key={seg.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                            {seg.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Active year display */}
            <div className="px-6 pt-3 pb-1 flex items-center gap-3">
                <span className="text-4xl font-bold text-gray-200 select-none">{activeFrame.year}</span>
                {banner && activeFrame.annotation && (
                    <div
                        className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium leading-snug"
                        style={{ backgroundColor: banner.bg, color: banner.text }}
                    >
                        {activeFrame.annotation}
                    </div>
                )}
            </div>

            {/* Choropleth map */}
            <div className="px-2 flex-1">
                <div ref={plotDivCallback} style={{ width: '100%', minHeight: '420px' }} />
            </div>

            {/* KPI strip */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3">
                {[
                    { icon: '🌍', label: 'Total Arrivals', value: fmt(activeFrame.total_arrivals) },
                    { icon: '🥇', label: 'Top Market', value: activeFrame.top_market },
                    { icon: '📊', label: 'Markets Tracked', value: activeFrame.markets_tracked },
                ].map((kpi) => (
                    <div key={kpi.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                        <span>{kpi.icon}</span>
                        <span className="text-gray-500">{kpi.label}:</span>
                        <span className="font-semibold text-gray-800">{kpi.value}</span>
                    </div>
                ))}
            </div>

            {/* Year controls */}
            <div className="px-5 pb-4 pt-3 space-y-2">
                {/* Slider */}
                <input
                    type="range"
                    min={0}
                    max={years.length - 1}
                    value={activeIdx}
                    onChange={(e) => {
                        setPlaying(false);
                        setActiveIdx(Number(e.target.value));
                    }}
                    className="w-full accent-blue-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 px-0.5">
                    {years.map((y, i) => (
                        <span
                            key={y}
                            className={`cursor-pointer transition-colors ${i === activeIdx ? 'text-blue-600 font-bold' : 'hover:text-gray-600'}`}
                            onClick={() => { setPlaying(false); setActiveIdx(i); }}
                        >
                            {y}
                        </span>
                    ))}
                </div>

                {/* Play / Pause */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={() => setPlaying((p) => !p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors text-gray-700"
                    >
                        {playing ? '⏸  Pause' : '▶  Play'}
                    </button>
                    <span className="text-xs text-gray-400">1.2 s per frame</span>
                </div>
            </div>
        </div>
    );
}
