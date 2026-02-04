
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudRain, Wind, Activity, Heart, Zap, Thermometer, Droplets, Target, Calendar, TrendingUp, Settings } from 'lucide-react';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useAuth } from '../../hooks/useAuth';
import { useMetrics } from '../../contexts/MetricsContext';
import { getMetricStyles, getIconColor, getPhaseBadgeStyles } from '../../utils/styleHelpers';
import { getFunctions, httpsCallable } from 'firebase/functions';

const MetricCard = ({ icon: Icon, label, value, unit, color = "blue", subtext }) => {
    const styles = getMetricStyles(color);
    const iconColor = getIconColor(color);

    return (
        <div className={`bg-black/20 backdrop-blur-sm border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group transition-colors ${styles}`}>
            <Icon className={`${iconColor} mb-2`} size={24} />
            <span className="text-2xl font-bold text-white">{value}<span className="text-sm text-gray-400 font-normal ml-1">{unit}</span></span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
            {subtext && <span className="text-[10px] text-gray-500 mt-1">{subtext}</span>}
        </div>
    );
};

const functions = getFunctions();

// Phase badge component
const PhaseBadge = ({ phase, weeksUntilRace }) => {
    const phaseConfig = {
        base: { label: 'Base', desc: 'Bygg grunnlag' },
        build: { label: 'Build', desc: 'Øk intensitet' },
        peak: { label: 'Peak', desc: 'Topping' },
        taper: { label: 'Taper', desc: 'Hvile' }
    };

    const config = phaseConfig[phase] || { label: phase, desc: '' };
    const badgeStyles = getPhaseBadgeStyles(phase);
    const iconColor = getIconColor(phase === 'base' ? 'blue' : phase === 'build' ? 'yellow' : phase === 'peak' ? 'orange' : 'green');

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${badgeStyles}`}>
            <Target className={iconColor} size={16} />
            <div>
                <p className="text-sm font-semibold">{config.label}-fase</p>
                <p className="text-[10px] text-gray-400">{config.desc}</p>
            </div>
            {weeksUntilRace !== null && weeksUntilRace > 0 && (
                <div className="ml-2 pl-2 border-l border-white/10">
                    <p className="text-lg font-bold text-white">{weeksUntilRace}</p>
                    <p className="text-[10px] text-gray-400">uker</p>
                </div>
            )}
        </div>
    );
};

const DataHubDashboard = () => {
    const { currentPlan } = useWorkouts();
    const { userProfile } = useAuth();
    const { weather, weeklyLoad, readiness, health, whoop, isLoading } = useMetrics();

    const [currentPhase, setCurrentPhase] = useState(null);
    const [weeksUntilRace, setWeeksUntilRace] = useState(null);
    const [hrvBaseline, setHrvBaseline] = useState(null);
    const [showAllMetrics, setShowAllMetrics] = useState(false);

    const isWhoopConnected = userProfile?.integrations?.whoop?.isConnected;
    const functions = getFunctions();

    // Fetch HRV baseline if Whoop is connected
    useEffect(() => {
        const fetchHrvBaseline = async () => {
            if (!isWhoopConnected) return;

            try {
                const getMetricsFn = httpsCallable(functions, 'getLatestWhoopMetrics');
                const metricsResult = await getMetricsFn();
                if (metricsResult.data.hrvBaseline) {
                    setHrvBaseline(metricsResult.data.hrvBaseline);
                }
            } catch (err) {
                console.error("Failed to get HRV baseline:", err);
            }
        };

        fetchHrvBaseline();
    }, [isWhoopConnected, functions]);

    // Determine current training phase from active plan
    useEffect(() => {
        const determinePhase = () => {
            const today = new Date();

            if (currentPlan?.weeks) {
                for (const week of currentPlan.weeks) {
                    const weekStart = new Date(week.weekStartDate);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);

                    if (today >= weekStart && today <= weekEnd) {
                        setCurrentPhase(week.phase);
                        break;
                    }
                }

                // Calculate weeks until race
                if (currentPlan.goal?.raceDate) {
                    const raceDate = new Date(currentPlan.goal.raceDate);
                    const weeksLeft = Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000));
                    setWeeksUntilRace(weeksLeft > 0 ? weeksLeft : 0);
                }
            } else if (userProfile?.activeGoal?.raceDate) {
                // Fallback to user profile goal
                const raceDate = new Date(userProfile.activeGoal.raceDate);
                const weeksLeft = Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000));
                setWeeksUntilRace(weeksLeft > 0 ? weeksLeft : 0);
            }
        };

        determinePhase();
    }, [currentPlan, userProfile]);

    if (isLoading) {
        return (
            <div className="w-full space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-black/20 backdrop-blur-sm border border-white/5 p-4 rounded-xl h-24 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20">
                    <Activity className="text-white" size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-text-primary tracking-tight">Data Hub</h2>
                    <p className="text-xs text-text-secondary uppercase tracking-widest">
                        Live Sync • Oslo {isWhoopConnected && "• Whoop Active"}
                    </p>
                </div>
            </div>

            {/* Main Grid - Progressive Disclosure on Mobile */}
            <div className="space-y-4">
                {/* Primary Metrics (Always Visible) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Weather */}
                    <MetricCard
                        icon={weather?.precip?.includes('rain') ? CloudRain : Thermometer}
                        label="Vær (Oslo)"
                        value={weather?.temp ? Math.round(weather.temp) : '-'}
                        unit="°C"
                        color="yellow"
                        subtext={weather?.wind ? `${Math.round(weather.wind)} m/s` : 'Henter...'}
                    />

                    {/* Readiness */}
                    <MetricCard
                        icon={Activity}
                        label="Readiness"
                        value={readiness || '-'}
                        unit="%"
                        color={readiness > 66 ? "green" : readiness > 33 ? "yellow" : "red"}
                        subtext={isWhoopConnected ? "Whoop Recovery" : "Estimert form"}
                    />

                    {/* Secondary Metrics on Desktop */}
                    <div className="hidden md:contents">
                        <MetricCard
                            icon={Heart}
                            label="Hvilepuls"
                            value={health?.restingHR || '-'}
                            unit="bpm"
                            color="red"
                            subtext={
                                health?.sleepPerformance
                                    ? `Søvn: ${health.sleepPerformance}% (${health.sleepDuration || '-'}t)`
                                    : `HRV: ${health?.hrv || '-'}ms`
                            }
                        />

                        <MetricCard
                            icon={Zap}
                            label="Belastning"
                            value={weeklyLoad?.hours || 0}
                            unit="t"
                            color="purple"
                            subtext={`${weeklyLoad?.count || 0} økter (7d)`}
                        />
                    </div>
                </div>

                {/* Secondary Metrics on Mobile (Collapsible) */}
                <div className="md:hidden">
                    {showAllMetrics && (
                        <div className="grid grid-cols-2 gap-4">
                            <MetricCard
                                icon={Heart}
                                label="Hvilepuls"
                                value={health?.restingHR || '-'}
                                unit="bpm"
                                color="red"
                                subtext={
                                    health?.sleepPerformance
                                        ? `Søvn: ${health.sleepPerformance}% (${health.sleepDuration || '-'}t)`
                                        : `HRV: ${health?.hrv || '-'}ms`
                                }
                            />

                            <MetricCard
                                icon={Zap}
                                label="Belastning"
                                value={weeklyLoad?.hours || 0}
                                unit="t"
                                color="purple"
                                subtext={`${weeklyLoad?.count || 0} økter (7d)`}
                            />
                        </div>
                    )}
                    <button
                        onClick={() => setShowAllMetrics(!showAllMetrics)}
                        className="mt-3 w-full text-xs text-primary hover:text-primary-light uppercase tracking-wider font-medium transition-colors"
                    >
                        {showAllMetrics ? 'Vis mindre' : 'Vis mer'}
                    </button>
                </div>
            </div>

            {/* Phase & Race Countdown */}
            {(currentPhase || weeksUntilRace !== null) && (
                <div className="flex items-center gap-4">
                    {currentPhase && <PhaseBadge phase={currentPhase} weeksUntilRace={weeksUntilRace} />}

                    {hrvBaseline && health?.hrv && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                            <TrendingUp className={health.hrv >= hrvBaseline ? 'text-green-400' : 'text-red-400'} size={16} />
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {health.hrv >= hrvBaseline ? '+' : ''}{Math.round(health.hrv - hrvBaseline)} ms
                                </p>
                                <p className="text-[10px] text-gray-400">vs baseline ({hrvBaseline})</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Integration Status Bar */}
            <div className="flex items-center justify-between">
                <div className="flex gap-3 overflow-x-auto pb-2 pt-2 scrollbar-hide">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                        Strava
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Yr.no
                    </div>
                    {isWhoopConnected && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs animate-fade-in-up">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Whoop
                        </div>
                    )}
                </div>

                {/* Link to Integrations */}
                <Link
                    to="/integrations"
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                    <Settings size={14} />
                    <span>Administrer</span>
                </Link>
            </div>
        </div>
    );
};

export default DataHubDashboard;
