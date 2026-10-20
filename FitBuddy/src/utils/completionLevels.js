// Colour scale for completion rates, shared by the monthly heatmap and the
// weekly bar chart so the same rate always gets the same colour.
// Shades follow GitHub's contribution graph: light grey for 0%, darker green
// for higher rates.

export const LEVELS = [
  { label: '0%', colour: '#ebedf0', text: '#57606a' },
  { label: '1–33%', colour: '#9be9a8', text: '#1f2328' },
  { label: '34–66%', colour: '#40c463', text: '#ffffff' },
  { label: '67–99%', colour: '#30a14e', text: '#ffffff' },
  { label: '100%', colour: '#216e39', text: '#ffffff' },
]

// rate (0–100, or null when nothing was due) → index into LEVELS, or -1
export function levelFor(rate) {
  if (rate === null || rate === undefined) return -1
  if (rate === 0) return 0
  if (rate <= 33) return 1
  if (rate <= 66) return 2
  if (rate < 100) return 3
  return 4
}
