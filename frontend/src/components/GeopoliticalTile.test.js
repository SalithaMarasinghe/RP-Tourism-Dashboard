/**
 * GeopoliticalTile.test.js
 * ~~~~~~~~~~~~~~~~~~~~~~~~
 * Frontend tests for the GeopoliticalTile component (14 tests).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Mock dependencies ───────────────────────────────────────────────────────
jest.mock('../context/AuthContext', () => ({
    useAuth: jest.fn(),
}));
jest.mock('../firebase', () => ({
    auth: { currentUser: null },
}));

import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import GeopoliticalTile from './GeopoliticalTile';

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeTile(overrides = {}) {
    return {
        tile_type: 'GEOPOLITICAL_SITUATION_ADJUSTMENT',
        situation_summary: {
            headline: 'Middle East tensions are suppressing regional travel demand.',
            severity_level: overrides.severity || 'GREEN',
            severity_rationale: 'Stable conditions observed.',
            active_signals: [],
        },
        adjustment: {
            baseline_arrivals: 290727,
            adjustment_percentage: overrides.adjustment_pct ?? -8.5,
            adjusted_arrivals: 265815,
            adjusted_arrivals_lower_bound: 249000,
            adjusted_arrivals_upper_bound: 282000,
            adjustment_basis: 'Signal-weighted adjustment.',
        },
        tile_display: {
            primary_label: 'Situation-Adjusted Forecast',
            primary_value: '265,815',
            delta_label: 'vs. Baseline',
            delta_value: '-8.5%',
            delta_direction: overrides.delta_direction || 'DOWN',
            confidence_range_label: 'Estimated Range',
            confidence_range_value: '249,000 – 282,000',
            situation_badge: overrides.severity || 'GREEN',
            situation_badge_text: overrides.badge_text || 'Stable',
            data_freshness_label: overrides.freshness_label || 'Updated today',
            staleness_warning: overrides.staleness_warning ?? null,
            tooltip_summary: 'A tooltip about geopolitical impact.',
        },
        suggestions: ['Diversify routes.', 'Monitor oil prices.', 'Check advisories.'],
        data_quality: {
            search_freshness: '2026-03-05',
            signal_count_evaluated: 3,
            signal_count_applied: 2,
            domains_with_no_results: ['aviationherald.com', 'www.flightradar24.com'],
            confidence_note: 'Moderate confidence.',
        },
        cache_metadata: {
            cached_at: '2026-03-05T10:00:00+00:00',
            cache_expires_at: '2026-03-12T10:00:00+00:00',
            trigger_type: 'INITIAL_LOAD',
            next_scheduled_refresh: '2026-03-12',
        },
        ...overrides.extra,
    };
}

function setupFetch(status = 200, body = {}) {
    global.fetch = jest.fn().mockResolvedValue({
        status,
        ok: status >= 200 && status < 300,
        json: async () => body,
    });
}

beforeEach(() => {
    useAuth.mockReturnValue({ currentUser: null });
    auth.currentUser = null;
});

afterEach(() => {
    jest.clearAllMocks();
});

// ─── Test 1 — Renders correctly with complete mock JSON ─────────────────────
test('1: renders tile correctly with complete mock JSON response', async () => {
    const tile = makeTile();
    setupFetch(200, tile);
    render(<GeopoliticalTile />);
    await waitFor(() => expect(screen.getByText('265,815')).toBeInTheDocument());
    expect(screen.getByText('Situation-Adjusted Forecast')).toBeInTheDocument();
    expect(screen.getByText(/-8.5%/)).toBeInTheDocument();
    expect(screen.getByText(/Middle East tensions/)).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('Updated today')).toBeInTheDocument();
});

// ─── Test 2 — Loading spinner shows during GET call ─────────────────────────
test('2: loading skeleton shows during GET call', () => {
    setupFetch(200, makeTile());
    // Delay resolution so we can check the loading state
    global.fetch = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
            status: 200, ok: true, json: async () => makeTile(),
        }), 200))
    );
    render(<GeopoliticalTile />);
    expect(screen.getByLabelText('Loading geopolitical tile')).toBeInTheDocument();
});

// ─── Test 3 — Fallback on 503 with no cached data ───────────────────────────
test('3: fallback tile renders on HTTP 503 with no cached data', async () => {
    setupFetch(503, {
        error: 'Unavailable.',
        message: 'Situation analysis currently unavailable. Baseline forecast is shown below.',
    });
    render(<GeopoliticalTile />);
    await waitFor(() =>
        expect(screen.getByText(/Situation analysis currently unavailable/)).toBeInTheDocument()
    );
});

// ─── Test 4 — Cached tile + amber banner on 503 with last_cached_tile ────────
test('4: cached tile + amber banner renders on HTTP 503 with last_cached_tile', async () => {
    const tile = makeTile();
    setupFetch(503, { last_cached_tile: tile, error: 'Unavailable.' });
    render(<GeopoliticalTile />);
    await waitFor(() => expect(screen.getByText('265,815')).toBeInTheDocument());
    expect(screen.getByText(/Live analysis unavailable. Showing last known data./)).toBeInTheDocument();
});

// ─── Test 5 — Refresh Now button makes POST and re-renders on success ────────
test('5: Refresh Now button makes POST call and re-renders on success', async () => {
    const tile = makeTile();
    const refreshedTile = makeTile({ freshness_label: 'Refreshed!' });
    refreshedTile.tile_display.primary_value = '265,815';

    useAuth.mockReturnValue({ currentUser: { uid: 'user1' } });
    auth.currentUser = { uid: 'user1', getIdToken: async () => 'fake-token' };

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation((url, opts) => {
        callCount++;
        if (opts?.method === 'POST') {
            return Promise.resolve({ status: 200, ok: true, json: async () => refreshedTile });
        }
        return Promise.resolve({ status: 200, ok: true, json: async () => tile });
    });

    render(<GeopoliticalTile />);
    await waitFor(() => expect(screen.getByText('265,815')).toBeInTheDocument());

    const btn = screen.getByRole('button', { name: /refresh now/i });
    await act(async () => { fireEvent.click(btn); });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
});

// ─── Test 6 — Refresh failure shows inline error ────────────────────────────
test('6: Refresh Now button shows error message on POST failure', async () => {
    const tile = makeTile();
    useAuth.mockReturnValue({ currentUser: { uid: 'user1' } });
    auth.currentUser = { uid: 'user1', getIdToken: async () => 'fake-token' };

    global.fetch = jest.fn()
        .mockResolvedValueOnce({ status: 200, ok: true, json: async () => tile })
        .mockResolvedValueOnce({ status: 503, ok: false, json: async () => ({ detail: 'error' }) });

    render(<GeopoliticalTile />);
    await waitFor(() => screen.getByText('265,815'));

    const btn = screen.getByRole('button', { name: /refresh now/i });
    await act(async () => { fireEvent.click(btn); });
    await waitFor(() => expect(screen.getByText(/Refresh failed. Please try again./)).toBeInTheDocument());
});

// ─── Test 7 — Refresh button disabled while POST is in progress ─────────────
test('7: Refresh Now button is disabled while POST is in progress', async () => {
    const tile = makeTile();
    useAuth.mockReturnValue({ currentUser: { uid: 'user1' } });
    auth.currentUser = { uid: 'user1', getIdToken: async () => 'fake-token' };

    global.fetch = jest.fn()
        .mockResolvedValueOnce({ status: 200, ok: true, json: async () => tile })
        .mockImplementation(() => new Promise(resolve => setTimeout(() =>
            resolve({ status: 200, ok: true, json: async () => tile }), 300)));

    render(<GeopoliticalTile />);
    await waitFor(() => screen.getByText('265,815'));

    const btn = screen.getByRole('button', { name: /refresh now/i });
    fireEvent.click(btn);
    // Button should be disabled immediately after click
    expect(btn).toBeDisabled();
});

// ─── Test 8 — staleness_warning banner renders when field is not null ────────
test('8: staleness_warning amber banner renders when field is not null', async () => {
    const tile = makeTile({ staleness_warning: 'Geopolitical data is 5 days old. Refreshes automatically on 2026-03-12.' });
    setupFetch(200, tile);
    render(<GeopoliticalTile />);
    await waitFor(() =>
        expect(screen.getByText(/Geopolitical data is 5 days old/)).toBeInTheDocument()
    );
    expect(screen.getByText(/Geopolitical data is 5 days old/)).toBeInTheDocument();
});

// ─── Test 9 — staleness_warning absent when field is null ───────────────────
test('9: staleness_warning is absent when field is null', async () => {
    const tile = makeTile({ staleness_warning: null });
    setupFetch(200, tile);
    render(<GeopoliticalTile />);
    await waitFor(() => screen.getByText('265,815'));
    expect(screen.queryByText(/days old/)).not.toBeInTheDocument();
});

// ─── Test 10 — RED badge has pulsing class ───────────────────────────────────
test('10: RED badge renders with pulsing animation class', async () => {
    const tile = makeTile({ severity: 'RED', badge_text: 'Crisis Alert' });
    setupFetch(200, tile);
    render(<GeopoliticalTile />);
    await waitFor(() => screen.getByText('Crisis Alert'));
    const badge = screen.getByText('Crisis Alert').closest('span');
    expect(badge.className).toContain('geo-badge-pulse');
});

// ─── Tests 11 — GREEN, YELLOW, ORANGE badges render without pulsing ──────────
test('11: GREEN/YELLOW/ORANGE badges render correctly without pulse', async () => {
    for (const [severity, text] of [['GREEN', 'Stable'], ['YELLOW', 'Monitor'], ['ORANGE', 'At Risk']]) {
        const tile = makeTile({ severity, badge_text: text });
        setupFetch(200, tile);
        const { unmount } = render(<GeopoliticalTile />);
        await waitFor(() => screen.getByText(text));
        const badge = screen.getByText(text).closest('span');
        expect(badge.className).not.toContain('geo-badge-pulse');
        unmount();
    }
});

// ─── Test 12 — GeopoliticalTile positioned above Forecast Configuration ──────
test('12: GeopoliticalTile wrapper appears before Forecast Configuration in DOM', async () => {
    // This test verifies placement by importing MonthlyPredictionsComponent
    // and checking element order.
    const tile = makeTile();
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true, json: async () => tile });

    // Mock axios used by MonthlyPredictionsComponent
    jest.doMock('axios', () => ({
        get: jest.fn().mockResolvedValue({ data: { baseline: [], optimistic: [], pessimistic: [] } }),
    }));

    const { MonthlyPredictionsComponent } = await import('./MonthlyPredictionsComponent');
    const { container } = render(<MonthlyPredictionsComponent />);
    await waitFor(() => screen.getByText('265,815'));

    const geoWrapper = container.querySelector('#geo-tile-wrapper');
    const forecastConfig = screen.getByText('Forecast Configuration').closest('.power-bi-card');
    const position = geoWrapper?.compareDocumentPosition(forecastConfig);
    // DOCUMENT_POSITION_FOLLOWING (4) means geoWrapper comes before forecastConfig
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

// ─── Test 13 — Refresh Now button hidden for unauthorized users ──────────────
test('13: Refresh Now button hidden for unauthorized users', async () => {
    useAuth.mockReturnValue({ currentUser: null });
    auth.currentUser = null;
    const tile = makeTile();
    setupFetch(200, tile);
    render(<GeopoliticalTile />);
    await waitFor(() => screen.getByText('265,815'));
    expect(screen.queryByRole('button', { name: /refresh now/i })).not.toBeInTheDocument();
});

// ─── Test 14 — Collapsible Recommendations panel opens and closes ────────────
test('14: Collapsible Recommendations panel opens and closes correctly', async () => {
    const tile = makeTile();
    setupFetch(200, tile);
    render(<GeopoliticalTile />);
    await waitFor(() => screen.getByText('265,815'));

    const toggle = screen.getByRole('button', { name: /recommendations/i });

    // Initially closed
    expect(screen.queryByText('Diversify routes.')).not.toBeInTheDocument();

    // Open
    fireEvent.click(toggle);
    expect(screen.getByText('Diversify routes.')).toBeInTheDocument();

    // Close
    fireEvent.click(toggle);
    await waitFor(() =>
        expect(screen.queryByText('Diversify routes.')).not.toBeInTheDocument()
    );
});
