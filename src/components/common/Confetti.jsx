import { useEffect, useState } from 'react'

export default function Confetti({ onComplete }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    // Create 50 confetti particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -20,
      rotation: Math.random() * 360,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)],
      size: Math.random() * 10 + 5,
      velocity: {
        x: (Math.random() - 0.5) * 4,
        y: Math.random() * 3 + 2
      }
    }))

    setParticles(newParticles)

    // Animation loop
    const animate = () => {
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.velocity.x,
          y: p.y + p.velocity.y,
          rotation: p.rotation + 5,
          velocity: {
            x: p.velocity.x,
            y: p.velocity.y + 0.1 // Gravity
          }
        })).filter(p => p.y < window.innerHeight + 20)
      )
    }

    const interval = setInterval(animate, 16)

    // Auto-cleanup after 3 seconds
    const timeout = setTimeout(() => {
      onComplete?.()
    }, 3000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 pointer-events-none z-[200]">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: '2px',
            transition: 'all 0.016s linear'
          }}
        />
      ))}
    </div>
  )
}
