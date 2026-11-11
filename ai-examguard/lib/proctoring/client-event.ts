export function generateClientEventUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const hex = Date.now().toString(16).padStart(12, '0').slice(-12)
  const rand = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0')
  return `${rand}-0000-4000-8000-${hex}`
}

