import { useState } from 'react'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function LogoMarquee({ logos, speed = '30s', gap = 56, height = 30, paddingY = 24 }) {
  const [motionOk] = useState(() => !prefersReducedMotion())

  return (
    <section style={{
      background: '#000000',
      overflow: 'hidden',
      width: '100%',
      padding: `${paddingY}px 0`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${gap}px`,
        width: 'max-content',
        animation: motionOk ? `scroll-left ${speed} linear infinite` : 'none',
        ...(motionOk ? {} : { justifyContent: 'center', flexWrap: 'wrap', gap: '2rem' }),
      }}>
        {[...logos, ...logos].map((logo, i) => (
          <img
            key={`${logo.alt}-${i}`}
            src={logo.src}
            alt={logo.alt}
            style={{
              height: `${height}px`,
              width: 'auto',
              objectFit: 'contain',
              flexShrink: 0,
              display: 'block',
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
