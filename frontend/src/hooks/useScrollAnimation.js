import { useEffect, useRef, useState } from 'react'

export function useScrollAnimation({ threshold = 0.2, triggerOnce = true } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) observer.unobserve(el)
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, triggerOnce])

  return [ref, isVisible]
}

export function useCountUp(end, duration = 1200, startOnView = true) {
  const [ref, isVisible] = useScrollAnimation({ threshold: 0.5 })
  const [count, setCount] = useState(0)
  const counted = useRef(false)

  useEffect(() => {
    if (!startOnView || (startOnView && isVisible)) {
      if (counted.current) return
      counted.current = true

      let startTime = null
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(eased * end))
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
  }, [end, duration, startOnView, isVisible])

  return [ref, count]
}
