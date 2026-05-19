import { useMemo, useState } from 'react'
import IndiaHeatmap from './IndiaHeatmap'
import { useInflationData } from '../../hooks/useInflationData'
import { indiaHeatmapLayout } from '../../data/indiaHeatmapLayout'
import { lookupStateMetric } from '../../utils/stateNames'

const CATEGORY_OPTIONS = [
  { label: 'General', value: 'General' },
  { label: 'Food', value: 'Food and Beverages' },
  { label: 'Fuel', value: 'Fuel and Light' },
  { label: 'Miscellaneous', value: 'Miscellaneous' },
]

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatPeriod(year, month) {
  return `${monthNames[Number(month) - 1] || month} ${year}`
}

export default function CPIHeatmap() {
  const [category, setCategory] = useState('General')
  const [selectedPeriod, setSelectedPeriod] = useState(null)

  const { data: periods = [], loading: periodsLoading } = useInflationData('/api/states/available-periods', {
    category,
    segment: 'combined',
  })

  const activePeriod = selectedPeriod || periods[0] || null
  const heatmapYear = activePeriod?.year ?? 2026
  const heatmapMonth = activePeriod?.month ?? 4

  const { data: cpiRows = [], loading: heatmapLoading, error } = useInflationData('/api/states/cpi', {
    year: heatmapYear,
    month: heatmapMonth,
    category,
    segment: 'combined',
  })

  const stateMetrics = useMemo(() => {
    const lookup = {}
    for (const row of cpiRows) {
      if (row.state && row.yoy_change != null) {
        lookup[row.state] = Number(row.yoy_change)
      }
    }
    return lookup
  }, [cpiRows])

  const mapStates = useMemo(() => {
    return indiaHeatmapLayout.map((cell) => ({
      ...cell,
      values: {
        cpi: lookupStateMetric(stateMetrics, cell.state),
      },
    }))
  }, [stateMetrics])

  const periodOptions = useMemo(() => {
    return periods.map((period) => ({
      label: formatPeriod(period.year, period.month),
      value: `${period.year}-${period.month}`,
    }))
  }, [periods])

  const periodValue = activePeriod ? `${activePeriod.year}-${activePeriod.month}` : ''
  const periodLabel = activePeriod ? formatPeriod(activePeriod.year, activePeriod.month) : ''
  const activeCategory = CATEGORY_OPTIONS.find((option) => option.value === category)?.label || category

  const validValues = mapStates
    .map((state) => state.values.cpi)
    .filter((value) => value != null && !Number.isNaN(value))
  const averageCpi = validValues.length
    ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length
    : null

  const loading = periodsLoading || heatmapLoading

  return (
    <section id="cpi-heatmap" className="scroll-mt-28 space-y-6">
      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border-4 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
          Loading CPI heatmap...
        </div>
      ) : error ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border-4 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em] text-red-700">
          {error}
        </div>
      ) : (
        <IndiaHeatmap
          title="India CPI heatmap"
          description={`State-wise ${activeCategory.toLowerCase()} CPI inflation across India.`}
          sector="cpi"
          states={mapStates}
          periodLabel={periodLabel}
          valueLabel={`${activeCategory} CPI YoY`}
          snapshotLabel="CPI snapshot"
          highestLabel="Highest state CPI YoY"
          helperText="Each cell shows state-wise CPI year-on-year inflation for the selected month and category."
          actions={
            <div className="flex flex-wrap gap-3">
              {periodOptions.length ? (
                <select
                  value={periodValue}
                  onChange={(event) => {
                    const [year, month] = event.target.value.split('-')
                    setSelectedPeriod({ year: Number(year), month: Number(month) })
                  }}
                  className="rounded-2xl border-3 border-black bg-[#fffdf5] px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value)
                  setSelectedPeriod(null)
                }}
                className="rounded-2xl border-3 border-black bg-[#fffdf5] px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border-4 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-black/60">States covered</p>
          <p className="mt-2 text-4xl font-black">{validValues.length}</p>
        </div>
        <div className="rounded-[24px] border-4 border-black bg-[#fff3a0] p-5 shadow-[6px_6px_0_#000]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-black/60">Average CPI YoY</p>
          <p className="mt-2 text-4xl font-black">{averageCpi != null ? `${averageCpi.toFixed(1)}%` : '-'}</p>
        </div>
        <div className="rounded-[24px] border-4 border-black bg-[#a8e6ff] p-5 shadow-[6px_6px_0_#000]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-black/60">Period</p>
          <p className="mt-2 text-4xl font-black">{periodLabel || '-'}</p>
        </div>
      </div>
    </section>
  )
}
