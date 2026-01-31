
import React from 'react';
import { Brain, Zap, Target, Activity, Shield } from 'lucide-react';

const AICoachDashboard = ({ mentalState }) => {
    if (!mentalState) return null;

    const { beliefs = [], desires = [], intentions = [] } = mentalState;

    return (
        <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-4 mb-4 overflow-hidden relative group transition-all duration-500 hover:border-secondary/30">
            {/* Glow Effects */}
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="relative">
                    <div className="absolute inset-0 bg-secondary blur-sm opacity-50 rounded-full animate-pulse"></div>
                    <Brain className="w-6 h-6 text-secondary relative z-10" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">
                    AI Mental State <span className="text-secondary text-xs normal-case ml-2 opacity-70">Live Monitor</span>
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">

                {/* BELIEFS COLUMN */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 uppercase tracking-wide mb-1">
                        <Activity size={12} />
                        <span>Observasjoner (Beliefs)</span>
                    </div>
                    <div className="space-y-2">
                        {beliefs.length === 0 && <p className="text-xs text-white/30 italic">Ingen data...</p>}
                        {beliefs.map(belief => (
                            <div key={belief.id} className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-2 text-xs text-blue-100 hover:bg-blue-900/30 transition-colors">
                                {belief.desc}
                            </div>
                        ))}
                    </div>
                </div>

                {/* DESIRES COLUMN */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-green-300 uppercase tracking-wide mb-1">
                        <Target size={12} />
                        <span>Mål (Desires)</span>
                    </div>
                    <div className="space-y-2">
                        {desires.length === 0 && <p className="text-xs text-white/30 italic">Ingen mål...</p>}
                        {desires.map(desire => (
                            <div key={desire.id} className="bg-green-900/20 border border-green-500/20 rounded-lg p-2 text-xs text-green-100 flex justify-between items-center hover:bg-green-900/30 transition-colors">
                                <span>{desire.desc}</span>
                                <span className="text-[10px] bg-green-500/20 px-1 rounded text-green-300">{desire.priority}/10</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* INTENTIONS COLUMN */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 uppercase tracking-wide mb-1">
                        <Shield size={12} />
                        <span>Strategi (Intentions)</span>
                    </div>
                    <div className="space-y-2">
                        {intentions.length === 0 && <p className="text-xs text-white/30 italic">Ingen strategi...</p>}
                        {intentions.map(intention => (
                            <div key={intention.id} className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-2 text-xs text-purple-100 flex items-center gap-2 hover:bg-purple-900/30 transition-colors">
                                <Zap size={10} className="text-purple-400" />
                                {intention.desc}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AICoachDashboard;
