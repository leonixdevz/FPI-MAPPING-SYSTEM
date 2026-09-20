interface BuildingInfoProps {
  name: string | null
  properties: Record<string, unknown> | null
  onClose: () => void
}

export default function BuildingInfo({ name, properties, onClose }: BuildingInfoProps) {
  if (!properties) return null

  // Filter to meaningful properties only
  const meaningfulProps = Object.entries(properties).filter(([key, value]) => {
    if (value === null || value === undefined || value === '') return false
    // Skip internal/meta keys
    if (key.startsWith('@')) return false
    return true
  })

  return (
    <div className="building-info-panel">
      <button className="building-info-close" onClick={onClose} aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="building-info-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="6" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="5" y="9" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
          <rect x="12" y="9" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
          <rect x="8" y="14" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </div>

      <h3 className="building-info-name">
        {name || 'Unnamed Building'}
      </h3>

      <div className="building-info-props">
        {meaningfulProps.map(([key, value]) => (
          <div key={key} className="building-info-prop">
            <span className="building-info-prop-key">
              {key.replace(/_/g, ' ').replace(/:/g, ' ')}
            </span>
            <span className="building-info-prop-value">
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
