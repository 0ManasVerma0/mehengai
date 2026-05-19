/** Map heatmap layout labels to CPI state name variants in the database. */
export const STATE_NAME_ALIASES = {
  'Jammu & Kashmir': ['Jammu & Kashmir', 'Jammu And Kashmir'],
  'Dadra & Nagar Haveli': [
    'Dadra & Nagar Haveli',
    'Dadra And Nagar Haveli',
    'The Dadra And Nagar Haveli And Daman And Diu',
  ],
  'Daman & Diu': ['Daman & Diu', 'The Dadra And Nagar Haveli And Daman And Diu'],
  'Dadra & Nagar Haveli and Daman & Diu': [
    'The Dadra And Nagar Haveli And Daman And Diu',
    'Dadra & Nagar Haveli',
    'Daman & Diu',
  ],
  'Andaman & Nicobar Islands': ['Andaman & Nicobar Islands', 'Andaman And Nicobar Islands'],
  Delhi: ['Delhi', 'NCT of Delhi'],
}

export function lookupStateMetric(stateMetrics, layoutStateName) {
  if (!stateMetrics || !layoutStateName) return null

  const candidates = STATE_NAME_ALIASES[layoutStateName] || [layoutStateName]
  for (const name of candidates) {
    if (stateMetrics[name] != null) return stateMetrics[name]
  }

  const target = layoutStateName.toLowerCase()
  const match = Object.entries(stateMetrics).find(([name]) => name.toLowerCase() === target)
  return match ? match[1] : null
}
