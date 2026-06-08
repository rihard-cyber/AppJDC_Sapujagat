const RIPPLE_CLASS = 'ripple-effect'

let enabled = false

export function initRipple() {
  if (enabled) return
  enabled = true

  const style = document.createElement('style')
  style.textContent = `
    .ripple-effect {
      position: relative;
      overflow: hidden;
      cursor: pointer;
    }

    .ripple-circle {
      position: absolute !important;
      border-radius: 50% !important;
      background: rgba(59, 130, 246, 0.25) !important;
      transform: scale(0) !important;
      animation: ripple-anim 0.6s ease-out forwards !important;
      pointer-events: none !important;
      will-change: transform, opacity !important;
      z-index: 1 !important;
    }

    .ripple-circle.light {
      background: rgba(59, 130, 246, 0.12) !important;
    }

    @keyframes ripple-anim {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }

    .press-effect {
      transition: transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    }
    .press-effect:active {
      transform: scale(0.96) !important;
    }
  `
  document.head.appendChild(style)

  document.addEventListener('click', handleRipple, { passive: true })
}

function handleRipple(e) {
  const target = e.target.closest(
    'button, a, .glass-panel, .nav-tab-btn, .status-btn, .severity-btn, .decision-btn, .mutasi-kat-btn, .scan-compact-item, .finding-card, [data-ripple]'
  )
  if (!target) return

  target.classList.add(RIPPLE_CLASS)
  target.classList.add('press-effect')

  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = (e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2
  const y = (e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2

  const circle = document.createElement('span')
  circle.className = 'ripple-circle'
  circle.style.width = circle.style.height = `${size}px`
  circle.style.left = `${x}px`
  circle.style.top = `${y}px`

  const existing = target.querySelector('.ripple-circle')
  if (existing) existing.remove()

  target.style.position = target.style.position || 'relative'
  target.style.overflow = target.style.overflow || 'hidden'
  target.appendChild(circle)

  setTimeout(() => circle.remove(), 600)
}
