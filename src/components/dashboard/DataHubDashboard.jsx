
import React, { useEffect, useState } from 'react';
import { CloudRain, Wind, Activity, Heart, Zap, Thermometer, Droplets } from 'lucide-react';
import { DataHubService } from '../../services/DataHubService';
import { useWorkouts } from '../../hooks/useWorkouts';

const MetricCard = ({ icon: Icon, label, value, unit, color = "blue", subtext }) => (
    <div className={`bg-black/20 backdrop-blur-sm border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-${color}-500/30 transition-colors`}>
        <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
        <Icon className={`text-${color}-400 mb-2`} size={24} />
        <span className="text-2xl font-bold text-white">{value}<span className="text-sm text-gray-400 font-normal ml-1">{unit}</span></span>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        {subtext && <span className="text-[10px] text-gray-500 mt-1">{subtext}</span>}
    </div>
);

const DataHubDashboard = () => {
    const { workouts } = useWorkouts();
    const [weather, setWeather] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [health, setHealth] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            // 1. Weather (Always load)
            const w = await DataHubService.getWeather();
            setWeather(w);

            // 2. Training Metrics & Health
            if (workouts && workouts.length > 0) {
                const m = DataHubService.calculateTrainingLoad(workouts);
                setMetrics(m);
            } else {
                // Default zero state
                setMetrics({
                    weeklyVolume: 0,
                    readiness: 100,
                    sessionCount: 0
                });
            }

            // 3. Health (Mock)
            const h = DataHubService.getHealthMetrics();
            setHealth(h);
        };

        loadData();
    }, [workouts]);

    if (!metrics && !weather) return null; // Only hide if absolutely nothing matches

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20">
                    <Activity className="text-white" size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Data Hub</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Live Sync • Oslo</p>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                {/* Weather Section */}
                <MetricCard
                    icon={weather?.precip === 'rain' ? CloudRain : Thermometer}
                    label="Vær (Oslo)"
                    value={weather?.temp || '-'}
                    unit="°C"
                    color="yellow"
                    subtext={weather?.precip ? `${weather.wind} m/s • ${weather.precip}` : 'Henter...'}
                />

                {/* Health Section */}
                <MetricCard
                    icon={Heart}
                    label="Hvilepuls"
                    value={health?.restingHR}
                    unit="bpm"
                    color="red"
                    subtext={`HRV: ${health?.hrv}ms`}
                />

                {/* Training Load */}
                <MetricCard
                    icon={Zap}
                    label="Belastning"
                    value={metrics.weeklyVolume}
                    unit="t"
                    color="purple"
                    subtext={`${metrics.sessionCount} økter (7d)`}
                />

                {/* Readiness */}
                <MetricCard
                    icon={Activity}
                    label="Readiness"
                    value={metrics.readiness}
                    unit="%"
                    color={metrics.readiness > 80 ? "green" : metrics.readiness > 50 ? "yellow" : "red"}
                    subtext="Formstatus"
                />
            </div>

            {/* Integration Status Bar */}
            <div className="flex gap-4 overflow-x-auto pb-2 pt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                    Strava Connected
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Yr.no Active
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs">
                    <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    Apple Health (Sim)
                </div>
            </div>
        </div>
    );
};

export default DataHubDashboard;
