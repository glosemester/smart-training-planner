import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../ui/GlassCard';
import { Brain, Zap, Battery, Activity } from 'lucide-react';
import { useTraining } from '../../contexts/TrainingContext';

const AICoachWidget = () => {
    const { mentalState, loading, openChat } = useTraining();

    if (loading || !mentalState) return <GlassCard className="h-48 animate-pulse" />;

    const { primaryIntention, advice, beliefs } = mentalState;

    // Map intentions to colors/icons
    const getStatusConfig = (type) => {
        switch (type) {
            case 'REST':
                return { color: 'text-blue-400', icon: Battery, borderColor: 'border-blue-500/30' };
            case 'PUSH':
                return { color: 'text-red-400', icon: Zap, borderColor: 'border-red-500/30' };
            case 'MOTIVATE':
                return { color: 'text-yellow-400', icon: Activity, borderColor: 'border-yellow-500/30' };
            default:
                return { color: 'text-lime-400', icon: Brain, borderColor: 'border-lime-500/30' };
        }
    };

    const config = getStatusConfig(primaryIntention?.type);
    const StatusIcon = config.icon;

    // Interaction specific to the primary intention
    const handleExpandAnalysis = () => {
        openChat(`Can you explain why you are suggesting: "${advice}"? My current focus is ${primaryIntention?.label}.`);
    };

    return (
        <GlassCard
            className={`relative overflow-hidden border-l-4 ${config.borderColor} cursor-pointer hover:bg-white/5 transition-colors`}
            onClick={handleExpandAnalysis}
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-full bg-surface ${config.color} bg-opacity-10`}>
                            <StatusIcon size={20} className={config.color} />
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                            AI Coach Insight
                        </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-1">
                        {primaryIntention?.label || "Analyzing..."}
                    </h3>

                    <p className="text-gray-300 text-sm leading-relaxed max-w-md">
                        {advice}
                    </p>
                </div>

                {/* Micro-visualization of 'Beliefs' */}
                <div className="hidden sm:flex flex-col gap-1 text-xs text-right text-gray-500">
                    <span className={beliefs.hasHighFatigue ? "text-red-400" : "text-gray-600"}>
                        Fatigue: {beliefs.hasHighFatigue ? 'High' : 'Normal'}
                    </span>
                    <span className={beliefs.isConsistent ? "text-lime-400" : "text-yellow-500"}>
                        Consistency: {beliefs.isConsistent ? 'Good' : 'Variable'}
                    </span>
                </div>
            </div>
        </GlassCard>
    );
};

export default AICoachWidget;
