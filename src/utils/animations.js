/**
 * Reusable Framer Motion animation variants
 * Consistent easing: cubic-bezier(0.16, 1, 0.3, 1) - "easeOutExpo"
 *
 * Usage:
 * import { fadeInUp, cardHover } from '@/utils/animations'
 *
 * <motion.div variants={fadeInUp} initial="initial" animate="animate">
 */

// Smooth easing curve used throughout
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1]

/**
 * Page/section entrance animation
 * Fades in and slides up from below
 */
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: EASE_OUT_EXPO }
}

/**
 * Stagger container for list animations
 * Use with staggerItem children
 */
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

/**
 * Stagger item - use as child of staggerContainer
 */
export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 }
}

/**
 * Card/modal entrance
 * Scales in with fade
 */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.3, ease: EASE_OUT_EXPO }
}

/**
 * Interactive hover states for cards
 * Use with initial="rest" whileHover="hover" whileTap="tap"
 */
export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  tap: { scale: 0.98 }
}

/**
 * Drag feedback for draggable elements
 * Apply with whileDrag prop
 */
export const dragFeedback = {
  whileDrag: {
    scale: 1.05,
    opacity: 0.8,
    rotate: 2,
    boxShadow: '0 10px 30px rgba(185, 228, 60, 0.3)',
    cursor: 'grabbing'
  }
}

/**
 * Button press animation
 * Apply with whileTap and whileHover props
 */
export const buttonPress = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.02 }
}

/**
 * Collapse/expand animation for accordions
 * Use with AnimatePresence
 */
export const collapse = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden'
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3, ease: EASE_OUT_EXPO }
  }
}

/**
 * Slide in from right (for modals/drawers)
 */
export const slideInRight = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
  transition: { duration: 0.3, ease: EASE_OUT_EXPO }
}

/**
 * Slide in from bottom (for mobile sheets)
 */
export const slideInBottom = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 },
  transition: { duration: 0.3, ease: EASE_OUT_EXPO }
}

/**
 * Loading shimmer animation (for skeleton screens)
 * Use with animate prop
 */
export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0']
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear'
  }
}

/**
 * Pulse animation for attention-grabbing elements
 */
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1]
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut'
  }
}

/**
 * Bounce animation for playful elements
 */
export const bounce = {
  animate: {
    y: [0, -10, 0]
  },
  transition: {
    duration: 0.6,
    repeat: Infinity,
    ease: 'easeInOut'
  }
}

/**
 * Wizard step slide variants
 * Slides left/right based on direction
 * @param {number} direction - 1 for forward, -1 for backward
 */
export const wizardSlide = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
}

/**
 * Number counter animation
 * Useful for animating metrics
 */
export const counterSpring = {
  type: 'spring',
  stiffness: 100,
  damping: 30
}
