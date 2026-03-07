import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
    History,
    BarChart,
    TrendingUp,
    TrendingDown
} from 'lucide-react';

/**
 * RevenueScenarioToggle
 * 
 * A segmented control for switching between different tourism revenue scenarios.
 * It uses the project's Tabs UI component for a consistent look and feel.
 * 
 * @param {Object} props
 * @param {string} props.value - Current selected scenario ('historical', 'baseline', 'optimistic', 'pessimistic')
 * @param {function} props.onChange - Callback when scenario changes
 * @param {boolean} props.isForecastYear - Whether the currently selected year supports forecast scenarios
 */
const RevenueScenarioToggle = ({ value, onChange, isForecastYear = true }) => {

    const scenarios = [
        {
            id: 'historical',
            label: 'Historical',
            icon: History,
            description: 'Official reported data',
            disabled: false // Historical is always relevant for labels/context
        },
        {
            id: 'baseline',
            label: 'Baseline',
            icon: BarChart,
            description: 'Expected ML forecast',
            disabled: !isForecastYear
        },
        {
            id: 'optimistic',
            label: 'Optimistic',
            icon: TrendingUp,
            description: 'High recovery growth',
            disabled: !isForecastYear
        },
        {
            id: 'pessimistic',
            label: 'Pessimistic',
            icon: TrendingDown,
            description: 'Conservative outlook',
            disabled: !isForecastYear
        }
    ];

    return (
        <div className="flex flex-col space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1">
                Scenario Mode
            </p>
            <Tabs
                value={value}
                onValueChange={onChange}
                className="w-full max-w-2xl"
            >
                <TabsList className="grid grid-cols-4 h-11 p-1 bg-gray-100/80">
                    {scenarios.map((s) => {
                        const Icon = s.icon;
                        return (
                            <TabsTrigger
                                key={s.id}
                                value={s.id}
                                disabled={s.disabled}
                                className="flex items-center justify-center space-x-2 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                <Icon className={`h-4 w-4 ${value === s.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className="hidden sm:inline text-xs font-semibold">{s.label}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </Tabs>

            {/* Contextual help text */}
            {!isForecastYear && value !== 'historical' && (
                <p className="text-[10px] text-orange-500 italic px-1">
                    Forecast scenarios are unavailable for historical years.
                </p>
            )}
        </div>
    );
};

export default RevenueScenarioToggle;
