import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

// Map action functions to Norwegian descriptions
const ACTION_LABELS = {
  update_session: 'Oppdater økt',
  move_session: 'Flytt økt',
  add_session: 'Legg til økt',
  delete_session: 'Slett økt',
  adjust_plan_load: 'Juster belastning'
}

const DAY_LABELS = {
  monday: 'Mandag',
  tuesday: 'Tirsdag',
  wednesday: 'Onsdag',
  thursday: 'Torsdag',
  friday: 'Fredag',
  saturday: 'Lørdag',
  sunday: 'Søndag'
}

export default function ActionConfirmation({ actions, message, currentPlan, onConfirm, onCancel }) {
  const getSessionTitle = (sessionId) => {
    if (!currentPlan || !sessionId) return 'Ukjent økt'
    const session = currentPlan.sessions?.find(s => s.id === sessionId)
    return session ? session.title : 'Ukjent økt'
  }

  const formatAction = (action) => {
    const { function: funcName, arguments: args } = action

    switch (funcName) {
      case 'update_session':
        return {
          title: ACTION_LABELS[funcName],
          description: `Endre "${getSessionTitle(args.sessionId)}"`,
          details: [
            args.changes.type && `Type: ${args.changes.type}`,
            args.changes.title && `Tittel: ${args.changes.title}`,
            args.changes.duration_minutes && `Varighet: ${args.changes.duration_minutes} min`,
            args.changes.distance_km && `Distanse: ${args.changes.distance_km} km`
          ].filter(Boolean),
          reason: args.reason
        }

      case 'move_session':
        return {
          title: ACTION_LABELS[funcName],
          description: `Flytt "${getSessionTitle(args.sessionId)}" til ${DAY_LABELS[args.newDay]}`,
          reason: args.reason
        }

      case 'add_session':
        return {
          title: ACTION_LABELS[funcName],
          description: `Legg til "${args.title}" på ${DAY_LABELS[args.day]}`,
          details: [
            `Type: ${args.type}`,
            `Varighet: ${args.duration_minutes} min`,
            args.distance_km && `Distanse: ${args.distance_km} km`
          ].filter(Boolean),
          reason: args.reason
        }

      case 'delete_session':
        return {
          title: ACTION_LABELS[funcName],
          description: `Fjern "${getSessionTitle(args.sessionId)}"`,
          reason: args.reason
        }

      case 'adjust_plan_load':
        return {
          title: ACTION_LABELS[funcName],
          description: `${args.adjustment === 'increase' ? 'Øk' : 'Reduser'} belastning med ${args.percentage}%`,
          reason: args.reason
        }

      default:
        return {
          title: funcName,
          description: 'Ukjent handling',
          reason: 'N/A'
        }
    }
  }

  const formattedActions = actions.map(formatAction)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background-primary rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-secondary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-text-primary">
                Bekreft endringer
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                AI-en foreslår følgende endringer i treningsplanen din
              </p>
            </div>
          </div>
        </div>

        {/* AI Message */}
        {message && (
          <div className="p-4 bg-secondary/5 border-b border-white/10">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {message}
            </p>
          </div>
        )}

        {/* Actions List */}
        <div className="p-4 space-y-3">
          {formattedActions.map((action, index) => (
            <div key={index} className="card bg-background-secondary">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{action.title}</p>
                  <p className="text-sm text-text-secondary mt-1">{action.description}</p>

                  {action.details && action.details.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {action.details.map((detail, i) => (
                        <li key={i} className="text-xs text-text-muted">• {detail}</li>
                      ))}
                    </ul>
                  )}

                  {action.reason && (
                    <p className="text-xs text-secondary mt-2 italic">
                      💡 {action.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="px-6 pb-4">
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-xs text-text-secondary">
            <p>
              <strong className="text-warning">Merk:</strong> Disse endringene vil påvirke din nåværende treningsplan.
              Du kan alltid generere en ny plan senere hvis du vil starte på nytt.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2"
          >
            <XCircle size={18} />
            Avbryt
          </button>
          <button
            onClick={() => onConfirm(actions)}
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            Bekreft endringer
          </button>
        </div>
      </div>
    </div>
  )
}
