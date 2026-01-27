import Toast from './Toast'

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="flex flex-col gap-2 p-4">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
