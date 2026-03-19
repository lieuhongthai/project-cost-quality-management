import MuiTooltip from '@mui/material/Tooltip'
import { Info } from 'lucide-react'

interface MetricInfoTooltipProps {
  description: string
  formula?: string
  thresholds?: string
}

export function MetricInfoTooltip({ description, formula, thresholds }: MetricInfoTooltipProps) {
  const title = (
    <div style={{ maxWidth: 280, padding: '4px 2px' }}>
      <p style={{ fontSize: 12, lineHeight: 1.5, marginBottom: formula || thresholds ? 6 : 0 }}>
        {description}
      </p>
      {formula && (
        <>
          <hr style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '6px 0' }} />
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#93c5fd' }}>{formula}</p>
        </>
      )}
      {thresholds && (
        <>
          <hr style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '6px 0' }} />
          <p style={{ fontSize: 11, color: '#d1d5db' }}>{thresholds}</p>
        </>
      )}
    </div>
  )

  return (
    <MuiTooltip title={title} arrow placement="top" enterDelay={200}>
      <button
        type="button"
        className="inline-flex items-center text-gray-400 hover:text-blue-500 transition-colors ml-1 align-middle"
        tabIndex={-1}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    </MuiTooltip>
  )
}
