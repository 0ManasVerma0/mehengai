export const metricCards = [
  {
    label: 'CPI',
    value: '5.8%',
    delta: '+0.4%',
    note: 'YoY inflation pressure is easing, but still above comfort band.',
    tone: 'amber',
  },
  {
    label: 'WPI',
    value: '2.1%',
    delta: '-0.2%',
    note: 'Wholesale prices are calmer than consumer inflation.',
    tone: 'blue',
  },
  {
    label: 'Real wage',
    value: '109.4',
    delta: '+1.8',
    note: 'Purchasing power has improved from the last reading.',
    tone: 'green',
  },
]

export const cpiSeries = {
  mom: [
    { month: 'Jan', value: 0.2 },
    { month: 'Feb', value: 0.3 },
    { month: 'Mar', value: 0.1 },
    { month: 'Apr', value: 0.4 },
    { month: 'May', value: 0.2 },
    { month: 'Jun', value: 0.5 },
    { month: 'Jul', value: 0.3 },
    { month: 'Aug', value: 0.1 },
  ],
  yoy: [
    { month: 'Jan', value: 4.4 },
    { month: 'Feb', value: 4.7 },
    { month: 'Mar', value: 5.0 },
    { month: 'Apr', value: 5.2 },
    { month: 'May', value: 5.6 },
    { month: 'Jun', value: 5.8 },
    { month: 'Jul', value: 5.5 },
    { month: 'Aug', value: 5.1 },
  ],
  twelve: [
    { month: 'Jan', value: 4.9 },
    { month: 'Feb', value: 5.0 },
    { month: 'Mar', value: 5.2 },
    { month: 'Apr', value: 5.3 },
    { month: 'May', value: 5.5 },
    { month: 'Jun', value: 5.7 },
    { month: 'Jul', value: 5.6 },
    { month: 'Aug', value: 5.4 },
  ],
}

export const comparisonSeries = [
  { month: 'Jan', cpi: 4.5, wpi: 2.0, wri: 3.1 },
  { month: 'Feb', cpi: 4.7, wpi: 2.2, wri: 3.4 },
  { month: 'Mar', cpi: 5.0, wpi: 1.9, wri: 3.7 },
  { month: 'Apr', cpi: 5.2, wpi: 2.4, wri: 4.0 },
  { month: 'May', cpi: 5.5, wpi: 2.1, wri: 4.2 },
  { month: 'Jun', cpi: 5.8, wpi: 2.3, wri: 4.6 },
  { month: 'Jul', cpi: 5.6, wpi: 2.0, wri: 4.4 },
  { month: 'Aug', cpi: 5.3, wpi: 1.8, wri: 4.1 },
]

export const wageSeries = [
  { month: 'Jan', value: 102 },
  { month: 'Feb', value: 103 },
  { month: 'Mar', value: 103.8 },
  { month: 'Apr', value: 104.9 },
  { month: 'May', value: 106 },
  { month: 'Jun', value: 107.1 },
  { month: 'Jul', value: 108.4 },
  { month: 'Aug', value: 109.4 },
]

export const ruralUrbanSeries = [
  { month: 'Jan', rural: 4.8, urban: 5.1 },
  { month: 'Feb', rural: 4.9, urban: 5.2 },
  { month: 'Mar', rural: 5.2, urban: 5.4 },
  { month: 'Apr', rural: 5.3, urban: 5.6 },
  { month: 'May', rural: 5.4, urban: 5.8 },
  { month: 'Jun', rural: 5.5, urban: 5.9 },
  { month: 'Jul', rural: 5.4, urban: 5.7 },
  { month: 'Aug', rural: 5.1, urban: 5.5 },
]

export const foodNonFoodSeries = [
  { month: 'Jan', food: 6.2, nonFood: 3.4 },
  { month: 'Feb', food: 6.0, nonFood: 3.6 },
  { month: 'Mar', food: 6.4, nonFood: 3.8 },
  { month: 'Apr', food: 6.8, nonFood: 4.0 },
  { month: 'May', food: 7.0, nonFood: 4.1 },
  { month: 'Jun', food: 6.7, nonFood: 4.2 },
  { month: 'Jul', food: 6.3, nonFood: 4.0 },
  { month: 'Aug', food: 6.1, nonFood: 3.9 },
]

export const wriHeatmapStates = [
  { state: 'Jammu & Kashmir', row: 1, col: 2, values: { general: 61, agriculture: 68, industry: 56, service: 59 } },
  { state: 'Punjab', row: 2, col: 2, values: { general: 64, agriculture: 71, industry: 60, service: 62 } },
  { state: 'Assam', row: 2, col: 5, values: { general: 58, agriculture: 63, industry: 54, service: 57 } },
  { state: 'Rajasthan', row: 3, col: 1, colSpan: 2, values: { general: 67, agriculture: 74, industry: 63, service: 65 } },
  { state: 'Uttar Pradesh', row: 3, col: 3, colSpan: 2, values: { general: 72, agriculture: 78, industry: 69, service: 70 } },
  { state: 'Bihar', row: 3, col: 5, values: { general: 69, agriculture: 75, industry: 64, service: 66 } },
  { state: 'Gujarat', row: 4, col: 1, values: { general: 66, agriculture: 60, industry: 73, service: 67 } },
  { state: 'Madhya Pradesh', row: 4, col: 3, colSpan: 2, values: { general: 70, agriculture: 76, industry: 68, service: 69 } },
  { state: 'West Bengal', row: 4, col: 5, values: { general: 65, agriculture: 69, industry: 61, service: 64 } },
  { state: 'Maharashtra', row: 5, col: 2, colSpan: 2, values: { general: 74, agriculture: 67, industry: 79, service: 76 } },
  { state: 'Odisha', row: 5, col: 5, values: { general: 63, agriculture: 70, industry: 59, service: 62 } },
  { state: 'Karnataka', row: 6, col: 2, values: { general: 71, agriculture: 65, industry: 76, service: 73 } },
  { state: 'Andhra Pradesh', row: 6, col: 4, values: { general: 68, agriculture: 72, industry: 66, service: 67 } },
  { state: 'Tamil Nadu', row: 7, col: 3, colSpan: 2, values: { general: 73, agriculture: 69, industry: 78, service: 75 } },
]

export const priceTrackerItems = [
  { name: 'Rice', category: 'Staples', price: 'Rs 56/kg', change: '+1.8%', direction: 'up' },
  { name: 'Wheat flour', category: 'Staples', price: 'Rs 41/kg', change: '+0.9%', direction: 'up' },
  { name: 'Milk', category: 'Dairy', price: 'Rs 58/litre', change: '+0.5%', direction: 'up' },
  { name: 'Tomato', category: 'Vegetables', price: 'Rs 31/kg', change: '-4.2%', direction: 'down' },
  { name: 'Cooking oil', category: 'Kitchen', price: 'Rs 142/litre', change: '+2.4%', direction: 'up' },
  { name: 'Onion', category: 'Vegetables', price: 'Rs 39/kg', change: '-1.1%', direction: 'down' },
]