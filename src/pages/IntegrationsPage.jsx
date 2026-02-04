import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { WhoopService } from '../services/WhoopService'
import { connectToStrava } from '../services/stravaService'
import { getFunctions, httpsCallable } from 'firebase/functions'
import {
    Loader2, CheckCircle2, XCircle, RefreshCw, Zap, Activity,
    Heart, Moon, TrendingUp, AlertTriangle, ChevronRight, Unlink
} from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'

const functions = getFunctions()

export default function IntegrationsPage() {
    const { userProfile, user } = useAuth()
    const [syncing, setSyncing] = useState({ whoop: false, strava: false })
    const [syncStatus, setSyncStatus] = useState({ whoop: null, strava: null })
    const [whoopMetrics, setWhoopMetrics] = useState(null)
    const [loading, setLoading] = useState(true)

    // Check connection status
    const isWhoopConnected = userProfile?.integrations?.whoop?.isConnected
    const isStravaConnected = !!userProfile?.stravaTokens?.access_token

    useEffect(() => {
        if (isWhoopConnected) {
            loadWhoopMetrics()
        } else {
            setLoading(false)
        }
    }, [isWhoopConnected])

    const loadWhoopMetrics = async () => {
        try {
            const getMetrics = httpsCallable(functions, 'getLatestWhoopMetrics')
            const result = await getMetrics()
            if (result.data.hasData) {
                setWhoopMetrics(result.data)
            }
        } catch (err) {
            console.error('Failed to load Whoop metrics:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleWhoopConnect = async () => {
        try {
            await WhoopService.connect()
        } catch (err) {
            console.error('Whoop connect error:', err)
        }
    }

    const handleStravaConnect = async () => {
        try {
            await connectToStrava()
        } catch (err) {
            console.error('Strava connect error:', err)
        }
    }

    const handleWhoopSync = async () => {
        setSyncing(prev => ({ ...prev, whoop: true }))
        setSyncStatus(prev => ({ ...prev, whoop: null }))

        try {
            const syncFn = httpsCallable(functions, 'syncWhoopMetrics')
            const result = await syncFn()

            setSyncStatus(prev => ({
                ...prev,
                whoop: { success: true, message: `Synket ${result.data.syncedDates?.length || 0} dager` }
            }))

            // Reload metrics
            await loadWhoopMetrics()
        } catch (err) {
            console.error('Whoop sync error:', err)
            setSyncStatus(prev => ({
                ...prev,
                whoop: { success: false, message: err.message }
            }))
        } finally {
            setSyncing(prev => ({ ...prev, whoop: false }))
        }
    }

    const getRecoveryColor = (score) => {
        if (!score) return 'text-gray-400'
        if (score >= 67) return 'text-green-400'
        if (score >= 34) return 'text-yellow-400'
        return 'text-red-400'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6 animate-slide-up">
            {/* Header */}
            <div className="px-1">
                <h1 className="text-2xl font-bold text-text-primary">Integrasjoner</h1>
                <p className="text-text-secondary mt-1">Koble til trenings- og helseapper</p>
            </div>

            {/* Whoop Integration */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 px-1">
                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center text-xs text-white font-bold">W</div>
                    WHOOP
                </h2>

                <GlassCard className={isWhoopConnected ? 'border-green-500/30' : 'border-white/10'}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isWhoopConnected ? 'bg-green-500/20' : 'bg-white/5'}`}>
                                {isWhoopConnected ? (
                                    <CheckCircle2 className="text-green-400" size={24} />
                                ) : (
                                    <XCircle className="text-gray-400" size={24} />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-text-primary">
                                    {isWhoopConnected ? 'Tilkoblet' : 'Ikke tilkoblet'}
                                </p>
                                <p className="text-sm text-text-secondary">
                                    {isWhoopConnected
                                        ? 'Recovery, søvn og strain synkroniseres'
                                        : 'Koble til for HRV-basert treningsjustering'}
                                </p>
                            </div>
                        </div>

                        {isWhoopConnected ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleWhoopSync}
                                disabled={syncing.whoop}
                            >
                                {syncing.whoop ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <RefreshCw size={16} />
                                )}
                                <span className="ml-2">Synk</span>
                            </Button>
                        ) : (
                            <Button onClick={handleWhoopConnect}>
                                Koble til
                            </Button>
                        )}
                    </div>

                    {/* Sync status message */}
                    {syncStatus.whoop && (
                        <div className={`mt-3 p-2 rounded-lg text-sm ${syncStatus.whoop.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {syncStatus.whoop.success ? <CheckCircle2 size={14} className="inline mr-2" /> : <AlertTriangle size={14} className="inline mr-2" />}
                            {syncStatus.whoop.message}
                        </div>
                    )}

                    {/* Whoop Metrics */}
                    {isWhoopConnected && whoopMetrics && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Siste data ({whoopMetrics.date})</p>
                            <div className="grid grid-cols-4 gap-3">
                                <div className="text-center">
                                    <Heart className={`mx-auto mb-1 ${getRecoveryColor(whoopMetrics.recoveryScore)}`} size={18} />
                                    <p className={`text-lg font-bold ${getRecoveryColor(whoopMetrics.recoveryScore)}`}>
                                        {whoopMetrics.recoveryScore || '-'}%
                                    </p>
                                    <p className="text-[10px] text-text-muted">Recovery</p>
                                </div>
                                <div className="text-center">
                                    <TrendingUp className="mx-auto mb-1 text-blue-400" size={18} />
                                    <p className="text-lg font-bold text-text-primary">{whoopMetrics.hrv || '-'}</p>
                                    <p className="text-[10px] text-text-muted">HRV</p>
                                </div>
                                <div className="text-center">
                                    <Moon className="mx-auto mb-1 text-purple-400" size={18} />
                                    <p className="text-lg font-bold text-text-primary">{whoopMetrics.sleepPerformance || '-'}%</p>
                                    <p className="text-[10px] text-text-muted">Søvn</p>
                                </div>
                                <div className="text-center">
                                    <Activity className="mx-auto mb-1 text-orange-400" size={18} />
                                    <p className="text-lg font-bold text-text-primary">{whoopMetrics.strain?.toFixed(1) || '-'}</p>
                                    <p className="text-[10px] text-text-muted">Strain</p>
                                </div>
                            </div>

                            {whoopMetrics.hrvBaseline && (
                                <p className="text-xs text-text-muted mt-3 text-center">
                                    HRV baseline (30d): <span className="font-medium text-text-secondary">{whoopMetrics.hrvBaseline} ms</span>
                                </p>
                            )}
                        </div>
                    )}
                </GlassCard>

                {/* Whoop Benefits */}
                {!isWhoopConnected && (
                    <div className="px-2 space-y-2">
                        <p className="text-xs text-text-muted uppercase tracking-wider">Med Whoop får du:</p>
                        <ul className="text-sm text-text-secondary space-y-1">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-green-400" />
                                Automatisk treningsjustering basert på restitusjon
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-green-400" />
                                HRV-tracking for optimal belastning
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-green-400" />
                                Søvnkvalitet påvirker dagens plan
                            </li>
                        </ul>
                    </div>
                )}
            </section>

            {/* Strava Integration */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 px-1">
                    <Zap size={20} className="text-[#FC4C02]" />
                    Strava
                </h2>

                <GlassCard className={isStravaConnected ? 'border-[#FC4C02]/30' : 'border-white/10'}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isStravaConnected ? 'bg-[#FC4C02]/20' : 'bg-white/5'}`}>
                                {isStravaConnected ? (
                                    <CheckCircle2 className="text-[#FC4C02]" size={24} />
                                ) : (
                                    <Zap className="text-gray-400" size={24} />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-text-primary">
                                    {isStravaConnected ? 'Tilkoblet' : 'Ikke tilkoblet'}
                                </p>
                                <p className="text-sm text-text-secondary">
                                    {isStravaConnected
                                        ? 'Aktiviteter synkroniseres automatisk'
                                        : 'Koble til for å importere treningsdata'}
                                </p>
                            </div>
                        </div>

                        {!isStravaConnected && (
                            <Button onClick={handleStravaConnect} className="bg-[#FC4C02] hover:bg-[#e04400]">
                                Koble til
                            </Button>
                        )}
                    </div>

                    {/* Strava athlete info */}
                    {isStravaConnected && userProfile?.stravaTokens?.athlete_id && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-text-secondary">
                                    Atlet ID: <span className="font-mono text-text-muted">{userProfile.stravaTokens.athlete_id}</span>
                                </p>
                                <a
                                    href="https://www.strava.com/settings/apps"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-[#FC4C02] hover:underline flex items-center gap-1"
                                >
                                    Administrer <ChevronRight size={12} />
                                </a>
                            </div>
                        </div>
                    )}
                </GlassCard>

                {/* Strava Benefits */}
                {!isStravaConnected && (
                    <div className="px-2 space-y-2">
                        <p className="text-xs text-text-muted uppercase tracking-wider">Med Strava får du:</p>
                        <ul className="text-sm text-text-secondary space-y-1">
                            <li className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-[#FC4C02]" />
                                Automatisk import av løpeturer og aktiviteter
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-[#FC4C02]" />
                                Detaljert statistikk (puls, tempo, høydemeter)
                            </li>
                            <li className="flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-[#FC4C02]" />
                                AI-coach som kjenner treningshistorikken din
                            </li>
                        </ul>
                    </div>
                )}
            </section>

            {/* Data Usage Info */}
            <GlassCard className="bg-white/2 border-white/5">
                <div className="flex gap-3">
                    <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-text-primary text-sm">Om dataene dine</p>
                        <p className="text-xs text-text-muted mt-1">
                            Vi lagrer kun nødvendige data for å gi deg personlige treningsanbefalinger.
                            Du kan når som helst koble fra integrasjonene fra Strava og Whoop sine innstillinger.
                        </p>
                    </div>
                </div>
            </GlassCard>
        </div>
    )
}
