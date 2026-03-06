import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import ChoroplethMap from './ChoroplethMap';
import SparklineTable from './SparklineTable';
import { SourceMarketGeoIntelligence } from './SourceMarketGeoIntelligence';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ── Landmark annotations for specific years ───────────────────────────────────
const LANDMARKS = {
    2018: '📈 Peak Year — 2.33M total arrivals',
    2019: '⚠️ Easter Sunday Attack — arrivals fell 18%',
    2020: '🦠 COVID-19 — arrivals collapsed 73.5%',
    2021: '🦠 COVID-19 continues — lowest: 194K arrivals',
    2022: '✈️ Recovery begins — +270% YoY',
    2024: '🏆 Post-COVID record — 2.05M arrivals',
};

// ── Segment legend config ─────────────────────────────────────────────────────
const SEGMENTS = [
    { label: 'Mature', color: '#457B9D' },
    { label: 'Emerging', color: '#80B918' },
    { label: 'Declining', color: '#FB8500' },
];

const fmt = (n) => (n == null ? '' : n.toLocaleString());

// ── Build Plotly bar-chart-race figure ────────────────────────────────────────
function buildFigure(apiData) {
    const { years, countries, rankings } = apiData;
    const colorOf = {};
    countries.forEach((c) => { colorOf[c.country] = c.color; });

    const frames = years.map((yr) => {
        const yrKey = String(yr);
        const topNames = (rankings[yrKey] || []).slice(0, 10);
        const topCountries = topNames
            .map((name) => countries.find((c) => c.country === name))
            .filter(Boolean);

        const sorted = [...topCountries].sort(
            (a, b) => (a.arrivals[yrKey] || 0) - (b.arrivals[yrKey] || 0),
        );

        const xVals = sorted.map((c) => c.arrivals[yrKey] || 0);
        const yVals = sorted.map((c) => c.country);
        const colors = sorted.map((c) => colorOf[c.country] || '#888');
        const text = sorted.map((c) => fmt(c.arrivals[yrKey]));

        const landmark = LANDMARKS[yr];
        const annotations = [
            {
                x: 1, y: 0,
                xref: 'paper', yref: 'paper',
                xanchor: 'right', yanchor: 'bottom',
                text: `<b>${yr}</b>`,
                showarrow: false,
                font: { size: 72, color: 'rgba(30,30,60,0.10)', family: 'Inter, sans-serif' },
            },
        ];

        if (landmark) {
            annotations.push({
                x: 0.99, y: 0.98,
                xref: 'paper', yref: 'paper',
                xanchor: 'right', yanchor: 'top',
                text: landmark,
                showarrow: false,
                bgcolor: 'rgba(255,251,230,0.95)',
                bordercolor: '#f59e0b',
                borderwidth: 1.5,
                borderpad: 8,
                font: { size: 12, color: '#92400e', family: 'Inter, sans-serif' },
            });
        }

        return {
            name: String(yr),
            data: [{
                type: 'bar',
                orientation: 'h',
                x: xVals,
                y: yVals,
                text,
                textposition: 'outside',
                cliponaxis: false,
                marker: { color: colors, line: { width: 0 } },
                hovertemplate: '%{y}: %{x:,}<extra></extra>',
            }],
            layout: { annotations },
        };
    });

    const firstFrame = frames[0];
    const layout = {
        autosize: true,
        height: 520,
        margin: { l: 130, r: 110, t: 20, b: 100 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'rgba(248,250,252,0.6)',
        font: { family: 'Inter, system-ui, sans-serif', size: 13, color: '#1e293b' },
        xaxis: {
            title: { text: 'Annual Arrivals', font: { size: 12, color: '#64748b' } },
            tickformat: ',.0f',
            gridcolor: 'rgba(203,213,225,0.5)',
            zeroline: false,
            fixedrange: true,
        },
        yaxis: { tickfont: { size: 13, color: '#1e293b' }, fixedrange: true, automargin: true },
        annotations: firstFrame.layout.annotations,
        updatemenus: [{
            type: 'buttons',
            showactive: false,
            x: 0, y: -0.24,
            xanchor: 'left', yanchor: 'top',
            buttons: [
                {
                    label: '▶  Play',
                    method: 'animate',
                    args: [null, { fromcurrent: true, frame: { duration: 1000, redraw: true }, transition: { duration: 600, easing: 'cubic-in-out' } }],
                },
                {
                    label: '⏸  Pause',
                    method: 'animate',
                    args: [[null], { mode: 'immediate', frame: { duration: 0 }, transition: { duration: 0 } }],
                },
            ],
            bgcolor: '#f1f5f9', bordercolor: '#cbd5e1', borderwidth: 1,
            font: { size: 13 }, pad: { l: 4, r: 4, t: 4, b: 4 },
        }],
        sliders: [{
            active: 0,
            steps: years.map((yr) => ({
                label: String(yr),
                method: 'animate',
                args: [[String(yr)], { mode: 'immediate', frame: { duration: 500, redraw: true }, transition: { duration: 300 } }],
            })),
            x: 0.08, y: -0.16, len: 0.92,
            xanchor: 'left', yanchor: 'top',
            currentvalue: { prefix: 'Year: ', visible: true, xanchor: 'center', font: { size: 13, color: '#475569' } },
            pad: { t: 20 },
            bgcolor: '#e2e8f0', bordercolor: '#94a3b8', tickcolor: '#64748b',
            font: { color: '#475569', size: 11 },
        }],
    };

    return { data: firstFrame.data, layout, frames };
}

// ── Bar Chart Race card ───────────────────────────────────────────────────────
function BarChartRace({ apiData }) {
    const [plotReady, setPlotReady] = useState(false);
    const plotDivRef = useRef(null);

    const initPlot = useCallback((div, data) => {
        const Plotly = window.Plotly;
        if (!Plotly || !div || !data) return;
        const { data: traceData, layout, frames } = buildFigure(data);
        Plotly.newPlot(div, traceData, layout, { displayModeBar: false, responsive: true }).then(() => {
            Plotly.addFrames(div, frames);
            setPlotReady(true);
            Plotly.animate(div, null, {
                fromcurrent: true,
                frame: { duration: 1000, redraw: true },
                transition: { duration: 600, easing: 'cubic-in-out' },
            });
        });
    }, []);

    const plotDivCallback = useCallback(
        (node) => { plotDivRef.current = node; if (node && apiData) initPlot(node, apiData); },
        [apiData, initPlot],
    );

    useEffect(() => {
        if (apiData && plotDivRef.current && !plotReady) initPlot(plotDivRef.current, apiData);
    }, [apiData, plotReady, initPlot]);

    useEffect(() => {
        return () => { if (plotDivRef.current && window.Plotly) window.Plotly.purge(plotDivRef.current); };
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Source Market Race (2010–2025)</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Top 10 tourist source countries ranked by annual arrivals</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 pt-1">
                    {SEGMENTS.map((seg) => (
                        <span key={seg.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                            {seg.label}
                        </span>
                    ))}
                </div>
            </div>
            <div className="px-4 pt-4 pb-2 w-full flex-1">
                <div ref={plotDivCallback} style={{ width: '100%', minHeight: '520px' }} />
            </div>
        </div>
    );
}

// ── Main section component ────────────────────────────────────────────────────
export default function SourceMarketIntelligence() {
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios
            .get(`${API_BASE}/api/source-markets/bar-chart-race`)
            .then((res) => setApiData(res.data))
            .catch((err) => {
                console.error('Source market API error:', err);
                setError(err?.response?.data?.error || 'Failed to load source market data.');
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Loading source market data…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 border border-red-200 p-6 text-center">
                <p className="text-red-700 font-medium">⚠️ {error}</p>
                <p className="text-red-500 text-sm mt-1">Please check the backend server and try again.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Section header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Source Market Intelligence</h2>
                <p className="text-gray-500 mt-1 text-sm leading-relaxed">
                    15-year animated view of Sri Lanka's top tourist source markets —
                    tracking growth, decline, and emerging players.
                </p>
            </div>

            {/* Row 0: Market Geo-Intelligence (Full Width) */}
            <SourceMarketGeoIntelligence />

            {/* Row 1: Bar Chart Race + Choropleth (50/50 on desktop) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                {apiData && <BarChartRace apiData={apiData} />}
                <ChoroplethMap />
            </div>

            {/* Row 2: Sparkline Table (full width) */}
            <SparklineTable />
        </div>
    );
}
