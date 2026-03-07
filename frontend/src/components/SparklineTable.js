import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString());
const fmtYoy = (v) => {
    if (v == null) return { label: '— N/A', color: '#9ca3af' };
    if (v > 0) return { label: `▲ +${v.toFixed(1)}%`, color: '#16a34a' };
    if (v < 0) return { label: `▼ ${v.toFixed(1)}%`, color: '#dc2626' };
    return { label: '— 0.0%', color: '#9ca3af' };
};
const cagrColor = (v) => {
    if (v == null) return '#9ca3af';
    if (v > 10) return '#06D6A0';
    if (v >= 5) return '#FFB703';
    if (v >= 0) return '#888888';
    return '#E63946';
};
const confColor = { High: '#16a34a', Medium: '#d97706', Low: '#dc2626' };
const segColors = {
    Mature: { bg: '#457B9D', text: '#fff' },
    Emerging: { bg: '#80B918', text: '#fff' },
    Declining: { bg: '#FB8500', text: '#fff' },
    Unknown: { bg: '#888888', text: '#fff' },
};

// ── Tiny sparkline rendered via window.Plotly ─────────────────────────────────
function Sparkline({ data, color, countryName }) {
    const divRef = useRef(null);
    const readyRef = useRef(false);

    useEffect(() => {
        const Plotly = window.Plotly;
        if (!Plotly || !divRef.current || !data.length) return;

        const xs = data.map((d) => d.year);
        const ys = data.map((d) => d.arrivals);

        const hexToRgba = (hex, alpha) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        };

        const trace = {
            x: xs, y: ys,
            type: 'scatter', mode: 'lines',
            fill: 'tozeroy',
            fillcolor: hexToRgba(color, 0.15),
            line: { color, width: 1.8, shape: 'spline' },
            hoverinfo: 'none',
        };

        const layout = {
            width: 180, height: 55,
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            xaxis: { visible: false, fixedrange: true },
            yaxis: { visible: false, fixedrange: true },
            showlegend: false,
        };

        if (!readyRef.current) {
            Plotly.newPlot(divRef.current, [trace], layout, {
                displayModeBar: false,
                staticPlot: true,
                responsive: false,
            });
            readyRef.current = true;
        }

        return () => {
            if (divRef.current && window.Plotly) {
                window.Plotly.purge(divRef.current);
                readyRef.current = false;
            }
        };
        // eslint-disable-next-line
    }, []);

    return <div ref={divRef} style={{ width: 180, height: 55, flexShrink: 0 }} />;
}

// ── Top-3 Dominance bar ────────────────────────────────────────────────────────
function DominanceBar({ years_in_top3, total_years, color }) {
    const pct = total_years > 0 ? (years_in_top3 / total_years) * 100 : 0;
    return (
        <div>
            <span className="text-sm font-medium text-gray-800">
                {years_in_top3} / {total_years} yrs
            </span>
            <div className="mt-1 h-1.5 rounded-full w-24" style={{ background: '#e2e8f0' }}>
                <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
        </div>
    );
}

// ── Column sort arrow ─────────────────────────────────────────────────────────
function SortArrow({ col, sort }) {
    if (sort.col !== col) return <span className="ml-1 text-gray-400 opacity-50">↕</span>;
    return <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
}

const SORTABLE = {
    latest_arrivals: (c) => c.kpis.latest_arrivals,
    cagr_pct: (c) => c.kpis.cagr_pct ?? -Infinity,
    best_yoy_pct: (c) => c.kpis.best_yoy_pct ?? -Infinity,
    worst_yoy_pct: (c) => c.kpis.worst_yoy_pct ?? -Infinity,
    peak_year: (c) => c.kpis.peak_year,
};

const FILTERS = ['All', 'Mature', 'Emerging', 'Declining'];

// ── Main Component ────────────────────────────────────────────────────────────
export default function SparklineTable() {
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [segment, setSegment] = useState('All');
    const [sort, setSort] = useState({ col: 'latest_arrivals', dir: 'desc' });

    useEffect(() => {
        axios
            .get(`${API_BASE}/api/source-markets/sparkline-table`)
            .then((res) => setApiData(res.data))
            .catch((err) => {
                console.error('Sparkline table API error:', err);
                setError(err?.response?.data?.error || 'Failed to load market profile data.');
            })
            .finally(() => setLoading(false));
    }, []);

    const toggleSort = useCallback((col) => {
        setSort((prev) =>
            prev.col === col
                ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
                : { col, dir: 'desc' }
        );
    }, []);

    const rows = React.useMemo(() => {
        if (!apiData) return [];
        let list = apiData.countries;
        if (segment !== 'All') list = list.filter((c) => c.segment === segment);
        if (search.trim()) list = list.filter((c) => c.country.toLowerCase().includes(search.toLowerCase()));
        const fn = SORTABLE[sort.col];
        if (fn) {
            list = [...list].sort((a, b) =>
                sort.dir === 'asc' ? fn(a) - fn(b) : fn(b) - fn(a)
            );
        }
        return list;
    }, [apiData, segment, search, sort]);

    // ── Loading / error ──────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Loading market profiles…</p>
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

    const { summary } = apiData;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Card header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800">Source Market Profiles</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                    ML-classified market segments with 15-year performance breakdown
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Segments determined by DTW KMeans clustering model trained on 2010–2025 arrival patterns
                </p>
            </div>

            {/* Summary chips */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-2">
                {[
                    { icon: '🌍', label: 'Countries', value: summary.total_countries },
                    { icon: '🔵', label: 'Mature', value: summary.mature_count },
                    { icon: '🟢', label: 'Emerging', value: summary.emerging_count },
                    { icon: '🔴', label: 'Declining', value: summary.declining_count },
                ].map((chip) => (
                    <div key={chip.label} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                        <span>{chip.icon}</span>
                        <span className="text-gray-500">{chip.label}:</span>
                        <span className="font-semibold text-gray-800">{chip.value}</span>
                    </div>
                ))}
            </div>

            {/* Controls: segment filter + search */}
            <div className="px-6 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                {/* Segment tabs */}
                <div className="flex gap-1.5 flex-wrap">
                    {FILTERS.map((f) => {
                        const sc = segColors[f];
                        const active = segment === f;
                        return (
                            <button
                                key={f}
                                onClick={() => setSegment(f)}
                                className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                                style={
                                    active && f !== 'All'
                                        ? { background: sc?.bg, color: sc?.text, borderColor: sc?.bg }
                                        : active
                                            ? { background: '#1e293b', color: '#fff', borderColor: '#1e293b' }
                                            : { background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' }
                                }
                            >
                                {f}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search country…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 w-48"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 min-w-[160px]">Country</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">15-yr Trend</th>
                            <th
                                className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-800 select-none"
                                onClick={() => toggleSort('latest_arrivals')}
                            >
                                Latest Arrivals <SortArrow col="latest_arrivals" sort={sort} />
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden md:table-cell">Peak</th>
                            <th
                                className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-800 select-none"
                                onClick={() => toggleSort('cagr_pct')}
                            >
                                CAGR <SortArrow col="cagr_pct" sort={sort} />
                            </th>
                            <th
                                className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-800 select-none hidden lg:table-cell"
                                onClick={() => toggleSort('best_yoy_pct')}
                            >
                                Best Year <SortArrow col="best_yoy_pct" sort={sort} />
                            </th>
                            <th
                                className="px-4 py-3 text-right font-medium text-gray-500 cursor-pointer hover:text-gray-800 select-none hidden lg:table-cell"
                                onClick={() => toggleSort('worst_yoy_pct')}
                            >
                                Worst Year <SortArrow col="worst_yoy_pct" sort={sort} />
                            </th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500 hidden md:table-cell">Top 3 Dominance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rows.map((c, i) => {
                            const yoy = fmtYoy(c.kpis.yoy_pct);
                            const cc = cagrColor(c.kpis.cagr_pct);
                            const segCols = segColors[c.segment] || segColors.Unknown;
                            const confC = confColor[c.confidence] || '#9ca3af';

                            return (
                                <tr
                                    key={c.country}
                                    className="hover:bg-indigo-50/30 transition-colors"
                                    style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                                >
                                    {/* Column 1 — Country */}
                                    <td className="px-4 py-3 min-w-[160px]">
                                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                            <span>{c.flag_emoji}</span>
                                            <span>{c.country}</span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span
                                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                style={{ background: segCols.bg, color: segCols.text }}
                                            >
                                                {c.segment}
                                            </span>
                                            <span
                                                title={`ML model confidence: ${c.confidence}`}
                                                className="w-2 h-2 rounded-full cursor-help"
                                                style={{ background: confC }}
                                            />
                                        </div>
                                    </td>

                                    {/* Column 2 — Sparkline */}
                                    <td className="px-4 py-3">
                                        <Sparkline data={c.sparkline} color={c.color} countryName={c.country} />
                                    </td>

                                    {/* Column 3 — Latest Arrivals */}
                                    <td className="px-4 py-3 text-right">
                                        <div className="font-bold text-gray-900 text-base">{fmt(c.kpis.latest_arrivals)}</div>
                                        <div className="text-xs mt-0.5 font-medium" style={{ color: yoy.color }}>{yoy.label}</div>
                                    </td>

                                    {/* Column 4 — Peak */}
                                    <td className="px-4 py-3 text-right hidden md:table-cell">
                                        <div className="font-bold text-gray-800">{c.kpis.peak_year}</div>
                                        <div className="text-xs text-gray-400">{fmt(c.kpis.peak_arrivals)}</div>
                                    </td>

                                    {/* Column 5 — CAGR */}
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-semibold text-sm" style={{ color: cc }}>
                                            {c.kpis.cagr_pct != null ? `${c.kpis.cagr_pct > 0 ? '+' : ''}${c.kpis.cagr_pct.toFixed(1)}% / yr` : '—'}
                                        </span>
                                    </td>

                                    {/* Column 6 — Best Year */}
                                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                                        {c.kpis.best_yoy_year != null ? (
                                            <span className="text-sm font-medium" style={{ color: '#06D6A0' }}>
                                                {c.kpis.best_yoy_year}&nbsp; ▲ +{c.kpis.best_yoy_pct?.toFixed(1)}%
                                            </span>
                                        ) : <span className="text-gray-400">—</span>}
                                    </td>

                                    {/* Column 7 — Worst Year */}
                                    <td className="px-4 py-3 text-right hidden lg:table-cell">
                                        {c.kpis.worst_yoy_year != null ? (
                                            <span className="text-sm font-medium" style={{ color: '#E63946' }}>
                                                {c.kpis.worst_yoy_year}&nbsp; ▼ {c.kpis.worst_yoy_pct?.toFixed(1)}%
                                            </span>
                                        ) : <span className="text-gray-400">—</span>}
                                    </td>

                                    {/* Column 8 — Top 3 Dominance */}
                                    <td className="px-4 py-3 text-right hidden md:table-cell">
                                        <DominanceBar
                                            years_in_top3={c.kpis.years_in_top3}
                                            total_years={c.kpis.total_years}
                                            color={c.color}
                                        />
                                    </td>
                                </tr>
                            );
                        })}

                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                                    No countries match your filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
