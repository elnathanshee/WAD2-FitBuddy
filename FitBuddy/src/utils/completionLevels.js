// Colour scale for completion rates, shared by the monthly calendar, the
// weekly bar chart and the habits table, so the same rate always gets the
// same colour. Three plain levels:
//   red    → none of the habits done
//   yellow → some of the habits done
//   green  → all of the habits done

export const LEVELS = [
  { label: 'None done', colour: '#d9625a', text: '#ffffff' },
  { label: 'Some done', colour: '#ecc153', text: '#3a2a00' },
  { label: 'All done', colour: '#2f9364', text: '#ffffff' },
]

// rate (0–100, or null when nothing was due) → index into LEVELS, or -1
export function levelFor(rate) {
  if (rate === null || rate === undefined) return -1
  if (rate === 0) return 0
  if (rate < 100) return 1
  return 2
}
