import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Clock,
    Briefcase
} from 'lucide-react';

/**
 * RevenueKpiCards
 * 
 * Displays a grid of executive-level KPI cards for tourism revenue.
 * Supports loading states for a smooth dashboard experience.
 * 
 * @param {Object} props
 * @param {Object} props.summary - The summary data object from API
 * @param {boolean} props.loading - Loading state
 */
const RevenueKpiCards = ({ summary, loading }) => {

    // Helper to format large numbers
    const formatNumber = (num) => {
        if (num === null || num === undefined) return 'N/A';
        return new Intl.NumberFormat().format(num);
    };

    const kpis = [
        {
            title: 'Total Revenue (USD)',
            value: summary?.total_revenue_usd_bn ? `$${summary.total_revenue_usd_bn.toFixed(2)}B` : 'N/A',
            icon: DollarSign,
            color: 'blue',
            description: 'Annual revenue in USD Billions'
        },
        {
            title: 'Total Revenue (LKR)',
            value: summary?.total_revenue_lkr_bn ? `Rs.${summary.total_revenue_lkr_bn.toFixed(0)}B` : 'N/A',
            icon: Briefcase,
            color: 'emerald',
            description: 'Annual revenue in LKR Billions'
        },
        {
            title: 'Growth (YoY)',
            value: summary?.revenue_yoy_pct !== undefined ? `${summary.revenue_yoy_pct > 0 ? '+' : ''}${summary.revenue_yoy_pct.toFixed(1)}%` : 'N/A',
            icon: summary?.revenue_yoy_pct >= 0 ? TrendingUp : TrendingDown,
            color: summary?.revenue_yoy_pct >= 0 ? 'green' : 'red',
            description: 'Revenue change compared to previous year'
        },
        {
            title: 'Avg Spend / Tourist',
            value: summary?.avg_spend_per_tourist_usd ? `$${summary.avg_spend_per_tourist_usd.toFixed(2)}` : 'N/A',
            icon: DollarSign,
            color: 'orange',
            description: 'Average expenditure per arrival (USD)'
        },
        {
            title: 'Avg Spend / Day',
            value: summary?.avg_spend_per_tourist_day_usd ? `$${summary.avg_spend_per_tourist_day_usd.toFixed(2)}` : 'N/A',
            icon: Clock,
            color: 'indigo',
            description: 'Average expenditure per day (USD)'
        },
        {
            title: 'Avg Length of Stay',
            value: summary?.avg_length_of_stay ? `${summary.avg_length_of_stay.toFixed(1)} Days` : 'N/A',
            icon: Calendar,
            color: 'pink',
            description: 'Average number of nights spent'
        }
    ];

    const iconClasses = {
        blue: 'bg-blue-500/20 text-blue-300',
        emerald: 'bg-emerald-500/20 text-emerald-300',
        green: 'bg-green-500/20 text-green-300',
        red: 'bg-red-500/20 text-red-300',
        orange: 'bg-orange-500/20 text-orange-300',
        indigo: 'bg-indigo-500/20 text-indigo-300',
        pink: 'bg-pink-500/20 text-pink-300'
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="shadow-sm !bg-[#151515] !border-[#2a2a2a]">
                        <CardContent className="p-4">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-32 mb-1" />
                            <Skeleton className="h-3 w-40" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, index) => {
                const Icon = kpi.icon;
                return (
                    <Card key={index} className="hover:shadow-md transition-shadow duration-200 !bg-[#151515] !border-[#2a2a2a] shadow-sm relative overflow-hidden group">
                        {/* Subtle background decoration */}
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 bg-${kpi.color}-500 group-hover:scale-110 transition-transform duration-500`} />

                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <p className="text-xs font-medium text-gray-300 uppercase tracking-wider">{kpi.title}</p>
                                        {summary?.scenario && index === 0 && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize border-[#2a2a2a] bg-[#1b1b1b] text-gray-200">
                                                {summary.scenario}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-baseline space-x-2">
                                        <h3 className="text-2xl font-bold text-white">{kpi.value}</h3>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{kpi.description}</p>
                                </div>

                                <div className={`p-2 rounded-lg ${iconClasses[kpi.color] || 'bg-[#1b1b1b] text-gray-300'}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default RevenueKpiCards;
