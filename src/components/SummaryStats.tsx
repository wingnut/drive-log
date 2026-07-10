import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import type { ComputedEntry } from '../types'

interface Props {
  entries: ComputedEntry[]
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography variant="h6" fontFamily="'Roboto Mono', monospace">
        {value}
      </Typography>
    </Stack>
  )
}

export default function SummaryStats({ entries }: Props) {
  const totalDistance = entries.reduce((sum, e) => sum + e.distance, 0)
  const tripCount = entries.length
  const firstOdo = entries.length ? Math.min(...entries.map((e) => e.startOdo)) : 0
  const lastOdo = entries.length ? Math.max(...entries.map((e) => e.stopOdo)) : 0

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction="row" spacing={4} divider={<Divider orientation="vertical" flexItem />} flexWrap="wrap" useFlexGap>
        <Stat label="Antal resor" value={String(tripCount)} />
        <Stat label="Total körsträcka" value={`${totalDistance.toLocaleString('sv-SE')} km`} />
        <Stat label="Mätarställning, intervall" value={tripCount ? `${firstOdo.toLocaleString('sv-SE')} – ${lastOdo.toLocaleString('sv-SE')} km` : '—'} />
      </Stack>
    </Paper>
  )
}
