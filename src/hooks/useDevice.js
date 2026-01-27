import { useState, useEffect } from 'react'

/**
 * Detect device type and platform
 */
export function useDevice() {
  const [device, setDevice] = useState({
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isPWA: false,
    hasNotch: false,
    platform: 'unknown'
  })

  useEffect(() => {
    const ua = navigator.userAgent
    const platform = navigator.platform

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
                  (platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    // Detect Android
    const isAndroid = /Android/.test(ua)

    // Detect mobile/tablet/desktop
    const isMobile = /iPhone|iPod/.test(ua) ||
                     (isAndroid && !/tablet/i.test(ua))
    const isTablet = /iPad/.test(ua) ||
                     (isAndroid && /tablet/i.test(ua)) ||
                     (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isDesktop = !isMobile && !isTablet

    // Detect PWA mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true

    // Detect devices with notch (safe area insets)
    const hasNotch = CSS.supports('padding-top: env(safe-area-inset-top)') &&
                     getComputedStyle(document.documentElement)
                       .getPropertyValue('--sat')?.trim() !== '0px'

    // Platform detection
    let detectedPlatform = 'unknown'
    if (isIOS) detectedPlatform = 'ios'
    else if (isAndroid) detectedPlatform = 'android'
    else if (platform.includes('Win')) detectedPlatform = 'windows'
    else if (platform.includes('Mac')) detectedPlatform = 'macos'
    else if (platform.includes('Linux')) detectedPlatform = 'linux'

    setDevice({
      isIOS,
      isAndroid,
      isMobile,
      isTablet,
      isDesktop,
      isPWA,
      hasNotch,
      platform: detectedPlatform
    })
  }, [])

  return device
}

/**
 * Get device-specific class names
 */
export function useDeviceClasses() {
  const device = useDevice()

  const classes = []
  if (device.isIOS) classes.push('is-ios')
  if (device.isAndroid) classes.push('is-android')
  if (device.isMobile) classes.push('is-mobile')
  if (device.isTablet) classes.push('is-tablet')
  if (device.isDesktop) classes.push('is-desktop')
  if (device.isPWA) classes.push('is-pwa')
  if (device.hasNotch) classes.push('has-notch')

  return classes.join(' ')
}

/**
 * Check if device supports certain features
 */
export function useDeviceCapabilities() {
  const device = useDevice()

  return {
    // Touch support
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,

    // Service Worker support
    hasServiceWorker: 'serviceWorker' in navigator,

    // Push notifications
    hasPushNotifications: 'PushManager' in window,

    // Geolocation
    hasGeolocation: 'geolocation' in navigator,

    // Camera/Media
    hasCamera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,

    // Vibration
    hasVibration: 'vibrate' in navigator,

    // Web Share API
    hasWebShare: 'share' in navigator,

    // Install prompt (for PWA)
    canInstall: device.isAndroid || (device.isIOS && !device.isPWA),

    // Platform-specific
    supportsBackgroundSync: 'sync' in ServiceWorkerRegistration.prototype,
    supportsPeriodicBackgroundSync: 'periodicSync' in ServiceWorkerRegistration.prototype
  }
}

export default useDevice
