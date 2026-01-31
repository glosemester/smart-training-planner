
import React, { useMemo } from 'react';
import { useWorkouts } from '../../hooks/useWorkouts';
import KineticErosion from '../art/KineticErosion';
import GlassCard from '../ui/GlassCard';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { Share2, RefreshCw } from 'lucide-react';

const WeeklyArtSummary = () => {
    const { workouts } = useWorkouts();

    // 1. Calculate Art Parameters from Data
    const artParams = useMemo(() => {
        const defaultParams = { volume: 2000, intensity: 0.8, seed: 12345, isMock: true };

        if (!workouts || workouts.length === 0) return defaultParams;

        const now = new Date();
        const start = startOfWeek(now, { weekStartsOn: 1 });
        const end = endOfWeek(now, { weekStartsOn: 1 });

        const weeklyWorkouts = workouts.filter(w =>
            isWithinInterval(new Date(w.date), { start, end })
        );

        if (weeklyWorkouts.length === 0) return defaultParams;

        // Volume = Total Minutes
        const totalMinutes = weeklyWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
        // Map 0-600 mins to 1000-8000 particles
        const volume = Math.max(1000, Math.min(8000, totalMinutes * 15));

        // Intensity = Average RPE or Pace
        // Defaulting RPE to 5 if not present
        const totalLoad = weeklyWorkouts.reduce((sum, w) => sum + ((w.rpe || 5) * w.duration), 0);
        const avgIntensity = totalLoad / (totalMinutes || 1);
        // Map 1-10 RPE to 0.5 - 2.5 Intensity
        const intensity = Math.max(0.5, Math.min(2.5, avgIntensity / 4));

        // Seed = Unique hash of workout IDs + Date
        // Simple hash
        const seedStr = weeklyWorkouts.map(w => w.id).join('') + start.toISOString();
        let seed = 0;
        for (let i = 0; i < seedStr.length; i++) {
            seed = ((seed << 5) - seed) + seedStr.charCodeAt(i);
            seed |= 0;
        }

        return { volume, intensity, seed: Math.abs(seed), isMock: false };

    }, [workouts]);

    return (
        <GlassCard className="relative overflow-hidden group p-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-purple-500 opacity-80 z-10" />

            <div className="p-4 flex items-center justify-between relative z-10">
                <div>
                    <h3 className="text-lg font-bold text-white">Ukens Kunstverk</h3>
                    <p className="text-xs text-gray-400">
                        {artParams.isMock ? 'Eksempel (Logg økter for å generere)' : 'Generert av din innsats'}
                    </p>
                </div>
                <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/80">
                    <Share2 size={18} />
                </button>
            </div>

            <div className="w-full h-[250px] bg-black/20 relative">
                {/* Art Canvas */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <KineticErosion
                        width={600} // Render slightly larger and scale down/crop
                        height={300}
                        intensity={artParams.intensity}
                        volume={artParams.volume}
                        seed={artParams.seed}
                    />
                </div>

                {/* Overlay details */}
                <div className="absolute bottom-3 left-3 flex gap-2">
                    <div className="px-2 py-1 rounded bg-black/40 backdrop-blur text-[10px] text-gray-300 border border-white/5">
                        Volum: {Math.round(artParams.volume)}
                    </div>
                    <div className="px-2 py-1 rounded bg-black/40 backdrop-blur text-[10px] text-gray-300 border border-white/5">
                        Intensitet: {artParams.intensity.toFixed(1)}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

export default WeeklyArtSummary;
