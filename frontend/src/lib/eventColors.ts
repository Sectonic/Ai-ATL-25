export function getEventColor(positivity: number, severity: number): string {
  const clampedPositivity = Math.max(-1, Math.min(1, positivity))
  const clampedSeverity = Math.max(0, Math.min(1, severity))
  
  let hue: number
  if (clampedPositivity < 0) {
    hue = 0 + (clampedPositivity + 1) * 40
  } else {
    hue = 40 + clampedPositivity * 80
  }
  
  const baseSaturation = 70
  const saturation = baseSaturation + (clampedSeverity * 30)
  
  const baseLightness = 55
  const lightness = baseLightness - (clampedSeverity * 10)
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export function getEventColorWithAlpha(positivity: number, severity: number, alpha: number): string {
  const clampedPositivity = Math.max(-1, Math.min(1, positivity))
  const clampedSeverity = Math.max(0, Math.min(1, severity))
  
  let hue: number
  if (clampedPositivity < 0) {
    hue = 0 + (clampedPositivity + 1) * 40
  } else {
    hue = 40 + clampedPositivity * 80
  }
  
  const baseSaturation = 70
  const saturation = baseSaturation + (clampedSeverity * 30)
  
  const baseLightness = 55
  const lightness = baseLightness - (clampedSeverity * 10)
  
  const effectiveAlpha = alpha * (0.6 + clampedSeverity * 0.4)
  
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`
}

