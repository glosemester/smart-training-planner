import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, TrendingUp, Zap, Activity, Clock } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import Button from '../components/ui/Button'
import { fadeInUp } from '../utils/animations'

/**
 * RunningCalculator - Tools for race prediction, VO2max, and pace zones
 */
export default function RunningCalculator() {
  const [activeTab, setActiveTab] = useState('race-predictor') // 'race-predictor' | 'vo2max' | 'pace-zones'

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto space-y-6 pb-24"
    >
      {/* Header */}
      <div className="px-1">
        <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">
          Løpskalkulator
        </h1>
        <p className="text-text-secondary">
          Estimer løpstider, VO2max og finn dine optimale treningssoner
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 px-1">
        {[
          { id: 'race-predictor', label: 'Løpstider', icon: Clock },
          { id: 'vo2max', label: 'VO2max', icon: TrendingUp },
          { id: 'pace-zones', label: 'Tempo-soner', icon: Zap }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'race-predictor' && <RacePredictor />}
      {activeTab === 'vo2max' && <VO2MaxCalculator />}
      {activeTab === 'pace-zones' && <PaceZonesCalculator />}
    </motion.div>
  )
}

/**
 * Race Time Predictor
 * Based on Riegel formula: T2 = T1 * (D2/D1)^1.06
 */
function RacePredictor() {
  const [referenceDistance, setReferenceDistance] = useState('10') // km
  const [referenceTime, setReferenceTime] = useState({ hours: 0, minutes: 50, seconds: 0 })
  const [predictions, setPredictions] = useState(null)

  const calculatePredictions = () => {
    const refDistKm = parseFloat(referenceDistance)
    const refTimeSeconds = referenceTime.hours * 3600 + referenceTime.minutes * 60 + referenceTime.seconds

    if (!refDistKm || refDistKm <= 0 || refTimeSeconds <= 0) {
      alert('Vennligst fyll inn gyldig distanse og tid')
      return
    }

    // Riegel formula: T2 = T1 * (D2/D1)^1.06
    const predict = (targetKm) => {
      const predictedSeconds = refTimeSeconds * Math.pow(targetKm / refDistKm, 1.06)
      return formatTime(predictedSeconds)
    }

    const races = [
      { name: '5 km', distance: 5, time: predict(5) },
      { name: '10 km', distance: 10, time: predict(10) },
      { name: 'Halvmaraton', distance: 21.1, time: predict(21.1) },
      { name: 'Maraton', distance: 42.2, time: predict(42.2) },
      { name: '50 km', distance: 50, time: predict(50) },
      { name: '100 km', distance: 100, time: predict(100) }
    ]

    setPredictions(races)
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.round(seconds % 60)

    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Calculator className="text-primary" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Estimér løpstider</h2>
          <p className="text-sm text-text-secondary">
            Basert på en nylig prestasjon
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Referanse-distanse (km)
          </label>
          <input
            type="number"
            value={referenceDistance}
            onChange={(e) => setReferenceDistance(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
            placeholder="10"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Din tid på denne distansen
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input
                type="number"
                value={referenceTime.hours}
                onChange={(e) =>
                  setReferenceTime({ ...referenceTime, hours: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-text-muted mt-1 text-center">Timer</p>
            </div>
            <div>
              <input
                type="number"
                value={referenceTime.minutes}
                onChange={(e) =>
                  setReferenceTime({ ...referenceTime, minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
                placeholder="50"
                min="0"
                max="59"
              />
              <p className="text-xs text-text-muted mt-1 text-center">Minutter</p>
            </div>
            <div>
              <input
                type="number"
                value={referenceTime.seconds}
                onChange={(e) =>
                  setReferenceTime({ ...referenceTime, seconds: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
                placeholder="0"
                min="0"
                max="59"
              />
              <p className="text-xs text-text-muted mt-1 text-center">Sekunder</p>
            </div>
          </div>
        </div>

        <Button onClick={calculatePredictions} className="w-full">
          Beregn estimater
        </Button>
      </div>

      {/* Results */}
      {predictions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/10 pt-6"
        >
          <h3 className="text-lg font-bold text-text-primary mb-4">Estimerte løpstider</h3>
          <div className="grid grid-cols-2 gap-3">
            {predictions.map((race) => (
              <div
                key={race.name}
                className="bg-white/5 border border-white/10 rounded-lg p-4"
              >
                <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">
                  {race.name}
                </p>
                <p className="text-2xl font-bold text-primary">{race.time}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-xs text-text-secondary">
              <strong className="text-warning">Merk:</strong> Dette er estimater basert på Riegel-formelen.
              Faktisk prestasjon avhenger av trening, terreng og dagsform.
            </p>
          </div>
        </motion.div>
      )}
    </GlassCard>
  )
}

/**
 * VO2max Calculator
 * Based on race performance using Daniels' formula
 */
function VO2MaxCalculator() {
  const [distance, setDistance] = useState('10')
  const [time, setTime] = useState({ hours: 0, minutes: 50, seconds: 0 })
  const [vo2max, setVo2max] = useState(null)

  const calculateVO2Max = () => {
    const distKm = parseFloat(distance)
    const timeSeconds = time.hours * 3600 + time.minutes * 60 + time.seconds

    if (!distKm || distKm <= 0 || timeSeconds <= 0) {
      alert('Vennligst fyll inn gyldig distanse og tid')
      return
    }

    // Velocity in m/min
    const velocity = (distKm * 1000) / (timeSeconds / 60)

    // Daniels' formula for VO2max
    // VO2max = -4.60 + 0.182258 * v + 0.000104 * v²
    const calculatedVO2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2)

    setVo2max({
      value: Math.round(calculatedVO2 * 10) / 10,
      category: getVO2Category(calculatedVO2),
      velocity: Math.round(velocity)
    })
  }

  const getVO2Category = (vo2) => {
    if (vo2 >= 60) return { label: 'Eksepsjonelt', color: 'text-success' }
    if (vo2 >= 52) return { label: 'Utmerket', color: 'text-primary' }
    if (vo2 >= 47) return { label: 'God', color: 'text-primary' }
    if (vo2 >= 42) return { label: 'Over gjennomsnitt', color: 'text-warning' }
    if (vo2 >= 37) return { label: 'Gjennomsnitt', color: 'text-text-secondary' }
    return { label: 'Under gjennomsnitt', color: 'text-error' }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <TrendingUp className="text-primary" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">VO2max Kalkulator</h2>
          <p className="text-sm text-text-secondary">
            Mål din maksimale oksygenopptak
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Løpsdistanse (km)
          </label>
          <input
            type="number"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
            placeholder="10"
            step="0.1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Din tid
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input
                type="number"
                value={time.hours}
                onChange={(e) => setTime({ ...time, hours: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-text-muted mt-1 text-center">Timer</p>
            </div>
            <div>
              <input
                type="number"
                value={time.minutes}
                onChange={(e) => setTime({ ...time, minutes: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
                placeholder="50"
                min="0"
                max="59"
              />
              <p className="text-xs text-text-muted mt-1 text-center">Minutter</p>
            </div>
            <div>
              <input
                type="number"
                value={time.seconds}
                onChange={(e) => setTime({ ...time, seconds: parseInt(e.target.value) || 0 })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
                placeholder="0"
                min="0"
                max="59"
              />
              <p className="text-xs text-text-muted mt-1 text-center">Sekunder</p>
            </div>
          </div>
        </div>

        <Button onClick={calculateVO2Max} className="w-full">
          Beregn VO2max
        </Button>
      </div>

      {/* Results */}
      {vo2max && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/10 pt-6"
        >
          <div className="text-center mb-6">
            <p className="text-sm text-text-muted mb-2 uppercase tracking-wider">Din VO2max</p>
            <p className="text-6xl font-bold text-primary mb-2">{vo2max.value}</p>
            <p className={`text-lg font-medium ${vo2max.category.color}`}>
              {vo2max.category.label}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Hastighet</p>
              <p className="text-xl font-bold text-text-primary">{vo2max.velocity} m/min</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Tempo</p>
              <p className="text-xl font-bold text-text-primary">
                {Math.floor(1000 / vo2max.velocity)}:{String(Math.round((1000 / vo2max.velocity % 1) * 60)).padStart(2, '0')}/km
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs text-text-secondary">
              <strong className="text-primary">Info:</strong> VO2max måler hvor mye oksygen kroppen kan
              bruke per minutt. Høyere verdi = bedre utholdenhet. Kan forbedres med intervalltrening!
            </p>
          </div>
        </motion.div>
      )}
    </GlassCard>
  )
}

/**
 * Pace Zones Calculator
 * Based on threshold pace
 */
function PaceZonesCalculator() {
  const [thresholdPace, setThresholdPace] = useState({ minutes: 5, seconds: 0 }) // min/km
  const [zones, setZones] = useState(null)

  const calculateZones = () => {
    const thresholdSeconds = thresholdPace.minutes * 60 + thresholdPace.seconds

    if (thresholdSeconds <= 0) {
      alert('Vennligst fyll inn gyldig terskelpace')
      return
    }

    // Zone calculations based on Jack Daniels' training zones
    const calcZone = (factor) => {
      const seconds = Math.round(thresholdSeconds * factor)
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min}:${sec.toString().padStart(2, '0')}`
    }

    const calculatedZones = [
      {
        zone: 'Z1',
        name: 'Aktiv restitusjon',
        percent: '<60-70% maks puls',
        pace: `${calcZone(1.25)}-${calcZone(1.35)}`,
        color: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
        description: 'Lett jogg, prate-tempo'
      },
      {
        zone: 'Z2',
        name: 'Grunnleggende utholdenhet',
        percent: '70-80% maks puls',
        pace: `${calcZone(1.15)}-${calcZone(1.25)}`,
        color: 'bg-green-500/20 border-green-500/30 text-green-400',
        description: 'Langturer, kan prate i hele setninger'
      },
      {
        zone: 'Z3',
        name: 'Aerobe intervaller',
        percent: '80-85% maks puls',
        pace: `${calcZone(1.05)}-${calcZone(1.15)}`,
        color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
        description: 'Moderat hardt, korte setninger'
      },
      {
        zone: 'Z4',
        name: 'Terskel',
        percent: '85-90% maks puls',
        pace: `${calcZone(0.95)}-${calcZone(1.05)}`,
        color: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
        description: 'Hardt, få ord om gangen'
      },
      {
        zone: 'Z5',
        name: 'VO2max / Maksimalt',
        percent: '90-100% maks puls',
        pace: `${calcZone(0.85)}-${calcZone(0.95)}`,
        color: 'bg-red-500/20 border-red-500/30 text-red-400',
        description: 'Maksimal innsats, ikke snakke'
      }
    ]

    setZones(calculatedZones)
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Zap className="text-primary" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Tempo-soner</h2>
          <p className="text-sm text-text-secondary">
            Finn dine optimale treningssoner
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Terskelpace (min/km)
          </label>
          <p className="text-xs text-text-muted mb-2">
            Tempo du kan holde i 60 min maksimalt
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                value={thresholdPace.minutes}
                onChange={(e) =>
                  setThresholdPace({ ...thresholdPace, minutes: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
                placeholder="5"
                min="0"
              />
              <p className="text-xs text-text-muted mt-1 text-center">Minutter</p>
            </div>
            <div>
              <input
                type="number"
                value={thresholdPace.seconds}
                onChange={(e) =>
                  setThresholdPace({ ...thresholdPace, seconds: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-text-primary focus:border-primary/50 focus:outline-none"
                placeholder="0"
                min="0"
                max="59"
              />
              <p className="text-xs text-text-muted mt-1 text-center">Sekunder</p>
            </div>
          </div>
        </div>

        <Button onClick={calculateZones} className="w-full">
          Beregn soner
        </Button>
      </div>

      {/* Results */}
      {zones && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/10 pt-6 space-y-3"
        >
          {zones.map((zone) => (
            <div
              key={zone.zone}
              className={`${zone.color} border rounded-lg p-4`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg mb-1">{zone.zone}: {zone.name}</h3>
                  <p className="text-xs opacity-80">{zone.percent}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-bold">{zone.pace}</p>
                  <p className="text-xs opacity-80">min/km</p>
                </div>
              </div>
              <p className="text-sm opacity-90">{zone.description}</p>
            </div>
          ))}

          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs text-text-secondary">
              <strong className="text-primary">Tips:</strong> 80% av treningen bør være i Z1-Z2
              (grunntrening), 20% i Z3-Z5 (intensitet). Dette gir best fremgang!
            </p>
          </div>
        </motion.div>
      )}
    </GlassCard>
  )
}
