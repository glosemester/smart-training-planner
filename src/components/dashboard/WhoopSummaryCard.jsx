import { useAuth } from '../../hooks/useAuth';
import { useMetrics } from '../../contexts/MetricsContext';
import { WhoopService } from '../../services/WhoopService';
import { Loader2, Activity, Moon, Battery, ChevronRight } from 'lucide-react';

export default function WhoopSummaryCard() {
    const { userProfile } = useAuth();
    const { whoop, readiness, health, isLoading } = useMetrics();

    // Check connection status safely
    const isConnected = userProfile?.integrations?.whoop?.isConnected;

    const handleConnect = () => {
        WhoopService.connect();
    };

    if (!isConnected) {
        return (
            <div className="card p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-2">
                    <span className="text-white font-bold text-xl">W</span>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Koble til WHOOP</h3>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                        Få restitusjon, søvn og strain direkte i dashbordet.
                    </p>
                </div>
                <button
                    onClick={handleConnect}
                    className="btn-primary w-full max-w-xs flex items-center justify-center gap-2"
                >
                    Connect Whoop <ChevronRight size={16} />
                </button>
            </div>
        );
    }

    if (isLoading && !whoop) {
        return (
            <div className="card p-6 flex items-center justify-center min-h-[200px]">
                <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
        );
    }

    // Extract latest metrics from MetricsContext
    const recentCycle = whoop?.cycles?.[0];

    // Helper for recovery color
    const getRecoveryColor = (score) => {
        if (!score) return 'gray';
        if (score >= 67) return 'green';
        if (score >= 34) return 'yellow';
        return 'red';
    };

    // Use readiness from MetricsContext (single source of truth)
    const recoveryScore = readiness || 0;
    const colorState = getRecoveryColor(recoveryScore);
    const textColors = {
        green: 'text-green-500',
        yellow: 'text-yellow-500',
        red: 'text-red-500',
        gray: 'text-gray-400'
    };
    const bgColors = {
        green: 'bg-green-100 dark:bg-green-900/20',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/20',
        red: 'bg-red-100 dark:bg-red-900/20',
        gray: 'bg-gray-100 dark:bg-gray-800'
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center text-[10px] text-white font-bold">W</div>
                    Whoop
                </h2>
                <span className="text-xs text-gray-400">Week View</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {/* Recovery */}
                <div className={`card p-4 flex flex-col items-center justify-center text-center ${bgColors[colorState]}`}>
                    <div className="mb-2">
                        <Battery className={textColors[colorState]} size={20} />
                    </div>
                    <span className={`text-2xl font-bold ${textColors[colorState]}`}>{recoveryScore}%</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Recovery</span>
                </div>

                {/* Strain */}
                <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <div className="mb-2">
                        <Activity className="text-blue-500" size={20} />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {recentCycle?.score?.strain?.toFixed(1) || '0.0'}
                    </span>
                    <span className="text-xs text-gray-500">Day Strain</span>
                </div>

                {/* Sleep */}
                <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <div className="mb-2">
                        <Moon className="text-purple-500" size={20} />
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {health?.sleepPerformance || 0}%
                    </span>
                    <span className="text-xs text-gray-500">Sleep Perf.</span>
                </div>
            </div>

            {/* Optional: Add chart or graph here later */}
        </section>
    );
}
