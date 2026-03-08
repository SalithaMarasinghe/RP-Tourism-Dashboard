import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import {
    BellRing,
    Briefcase,
    UserRound,
    Users
} from 'lucide-react';

const CARD_STYLES = {
    blue: {
        iconWrap: 'bg-blue-500/20 text-blue-300',
        accent: 'bg-blue-500'
    },
    emerald: {
        iconWrap: 'bg-emerald-500/20 text-emerald-300',
        accent: 'bg-emerald-500'
    },
    amber: {
        iconWrap: 'bg-amber-500/20 text-amber-300',
        accent: 'bg-amber-500'
    },
    rose: {
        iconWrap: 'bg-rose-500/20 text-rose-300',
        accent: 'bg-rose-500'
    },
    violet: {
        iconWrap: 'bg-violet-500/20 text-violet-300',
        accent: 'bg-violet-500'
    }
};

const formatPercent = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 'N/A';
    return `${num.toFixed(1)}%`;
};

const formatRatio = (maleShare, femaleShare) => {
    const male = Number(maleShare);
    const female = Number(femaleShare);

    if (!Number.isFinite(male) || !Number.isFinite(female)) {
        return 'N/A';
    }
    if (female <= 0) {
        return `${male.toFixed(1)} : 0.0`;
    }

    const normalizedMale = male / female;
    return `${normalizedMale.toFixed(2)} : 1.00`;
};

const resolveRisingAlertCount = (summary) => {
    if (Number.isFinite(Number(summary?.rising_alert_count))) {
        return Number(summary.rising_alert_count);
    }
    if (Number.isFinite(Number(summary?.number_of_rising_alerts))) {
        return Number(summary.number_of_rising_alerts);
    }
    if (Array.isArray(summary?.alerts)) {
        return summary.alerts.length;
    }
    return 0;
};

/**
 * DemographicKpiCards
 *
 * Dashboard KPI cards for Demographic Cohort Tracker.
 *
 * Props:
 * - summary: consolidated demographic summary payload
 * - loading: boolean loading state
 */
const DemographicKpiCards = ({ summary, loading }) => {
    const cards = [
        {
            key: 'dominant-age',
            title: 'Dominant Age Cohort',
            value: summary?.dominant_age_cohort || 'N/A',
            subtitle: 'Largest visitor age segment',
            icon: UserRound,
            tone: 'blue'
        },
        {
            key: 'gender-ratio',
            title: 'Male/Female Ratio',
            value: formatRatio(summary?.male_share_pct, summary?.female_share_pct),
            subtitle: `M ${formatPercent(summary?.male_share_pct)} | F ${formatPercent(summary?.female_share_pct)}`,
            icon: Users,
            tone: 'emerald'
        },
        {
            key: 'purpose',
            title: 'Dominant Visit Purpose',
            value: summary?.dominant_purpose || 'N/A',
            subtitle: 'Highest purpose segment',
            icon: Briefcase,
            tone: 'amber'
        },
        {
            key: 'alerts',
            title: 'Number of Rising Alerts',
            value: String(resolveRisingAlertCount(summary)),
            subtitle: 'Current selected-year alerts',
            icon: BellRing,
            tone: 'rose'
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                    <Card key={idx} className="!bg-[#151515] !border-[#2a2a2a] shadow-sm">
                        <CardContent className="p-4">
                            <div className="space-y-3">
                                <Skeleton className="h-3 w-28" />
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-3 w-40" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((item) => {
                const Icon = item.icon;
                const tone = CARD_STYLES[item.tone] || CARD_STYLES.blue;

                return (
                    <Card
                        key={item.key}
                        className="relative overflow-hidden !bg-[#151515] !border-[#2a2a2a] shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                        <div className={`absolute left-0 top-0 h-full w-1 ${tone.accent}`} />
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-300">
                                        {item.title}
                                    </p>
                                    <h3 className="mt-1 text-xl font-bold text-white truncate">
                                        {item.value}
                                    </h3>
                                    <p className="mt-1 text-[11px] text-gray-400 truncate">
                                        {item.subtitle}
                                    </p>
                                </div>
                                <div className={`p-2 rounded-lg ${tone.iconWrap}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>

                            {summary?.report_year && (
                                <div className="mt-3">
                                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-[#2a2a2a] bg-[#1b1b1b] text-gray-200">
                                        {summary.report_year}
                                    </Badge>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default DemographicKpiCards;
