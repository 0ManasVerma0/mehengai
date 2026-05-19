import { useMemo, useState } from 'react'
import {
Area,
AreaChart,
Bar,
BarChart,
CartesianGrid,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from 'recharts'
import SectionPanel from '../Common/SectionPanel'
import { useInflationData } from '../../hooks/useInflationData'

const MONTH_NAMES = [
'Jan',
'Feb',
'Mar',
'Apr',
'May',
'Jun',
'Jul',
'Aug',
'Sep',
'Oct',
'Nov',
'Dec',
]

function toNumber(value) {
const parsed = Number(value)
return Number.isFinite(parsed) ? parsed : null
}

function formatMonth(year, month) {
const monthLabel = MONTH_NAMES[Math.max(0, Math.min(11, Number(month) - 1))] || `M${month}`
return `${monthLabel} ${year}`
}

function pickDefaultCategory(categories) {
if (!categories.length) {
return ''
}

if (categories.includes('General')) {
return 'General'
}

return categories.find((category) => /food/i.test(category)) || categories[0]
}



function EmptyState({ message }) {
return (
<div className="flex min-h-55 items-center justify-center rounded-3xl border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
{message}
</div>
)
}

function StatCard({ label, value }) {
return (
<article className="rounded-3xl border-4 border-black bg-[#fffdf5] p-4 shadow-[6px_6px_0_#000]">
<p className="text-xs font-black uppercase tracking-[0.18em] text-black/50">{label}</p>
<p className="mt-2 text-3xl font-black">{value}</p>
</article>
)
}

export default function PriceTracker() {
const { data: categories = [], loading: categoriesLoading, error: categoriesError } = useInflationData('/api/cpi/categories')
const { data: years = [] } = useInflationData('/api/cpi/years')
const { data: states = [] } = useInflationData('/api/states/list')
const [activeCategory, setActiveCategory] = useState('')
const [selectedState, setSelectedState] = useState('All states')
const [selectedYear, setSelectedYear] = useState('')
const [selectedMonth, setSelectedMonth] = useState('')

const defaultCategory = useMemo(() => pickDefaultCategory(categories), [categories])
const currentCategory = activeCategory || defaultCategory
const { data: periods = [] } = useInflationData('/api/states/available-periods', {
category: currentCategory || undefined,
segment: 'combined',
})
const latestPeriod = periods[0] || null
const availableYears = useMemo(() => {
return years.map((year) => Number(year)).filter((year) => Number.isFinite(year)).sort((left, right) => right - left)
}, [years])
const availableMonths = useMemo(() => {
const usableYear = Number(selectedYear || availableYears[0] || '')
if (!usableYear) {
return []
}

return periods
.filter((period) => Number(period.year) === usableYear)
.map((period) => Number(period.month))
.filter((month) => Number.isFinite(month))
.sort((left, right) => right - left)
}, [periods, selectedYear, availableYears])
const defaultYear = String(latestPeriod?.year || availableYears[0] || '')
const currentYear = selectedYear || defaultYear
const defaultMonth = String(selectedYear ? availableMonths[0] || '' : latestPeriod?.month || availableMonths[0] || '')
const currentMonth = selectedMonth || defaultMonth
const currentState = selectedState !== 'All states' && states.includes(selectedState) ? selectedState : 'All states'
const { data: nationalRows = [], loading: nationalLoading, error: nationalError } = useInflationData('/api/cpi', {
category: currentCategory || undefined,
segment: 'combined',
state: 'National',
year: currentYear || undefined,
})

const { data: stateRows = [], loading: stateLoading, error: stateError } = useInflationData('/api/states/cpi', {
category: currentCategory || undefined,
segment: 'combined',
year: currentYear || undefined,
month: currentMonth || undefined,
})

const categoryCount = categories.length
const stateCount = states.length
const nationalSeries = useMemo(() => {
return nationalRows
.map((row) => ({
label: formatMonth(row.year, row.month),
month: Number(row.month),
year: Number(row.year),
value: toNumber(row.value),
mom: toNumber(row.mom_change),
yoy: toNumber(row.yoy_change),
}))
.sort((left, right) => left.year - right.year || left.month - right.month)
}, [nationalRows])

const stateSeries = useMemo(() => {
return stateRows
.map((row) => ({
state: row.state,
value: toNumber(row.cpi_value),
mom: toNumber(row.mom_change),
yoy: toNumber(row.yoy_change),
}))
.filter((row) => row.state)
.sort((left, right) => (right.value ?? -Infinity) - (left.value ?? -Infinity) || left.state.localeCompare(right.state))
}, [stateRows])

const selectedStateRow = useMemo(() => {
if (selectedState === 'All states') {
return null
}

return stateSeries.find((row) => row.state === selectedState) || null
}, [selectedState, stateSeries])

const periodLabel = currentYear && currentMonth
	? formatMonth(currentYear, currentMonth)
	: 'Latest available period'

const selectedYearLabel = currentYear ? String(currentYear) : 'Latest'
const nationalLatest = nationalSeries[nationalSeries.length - 1] || null
const stateRowsForDisplay = selectedState === 'All states' ? stateSeries : [selectedStateRow].filter(Boolean)
const topStates = stateSeries.slice(0, 10)
const currentSelectedState = currentState === 'All states' ? 'All states' : currentState

if (categoriesLoading) {
return (
<SectionPanel
eyebrow="Prices"
title="CPI category tracker"
description="Explore CPI categories as product groups, then drill into monthly national trends and state-wise snapshots with year, month, and state selectors."
>
<EmptyState message="Loading CPI tracker..." />
</SectionPanel>
)
}

if (categoriesError) {
return (
<SectionPanel
eyebrow="Prices"
title="CPI category tracker"
description="Explore CPI categories as product groups, then drill into monthly national trends and state-wise snapshots with year, month, and state selectors."
>
<EmptyState message={categoriesError} />
</SectionPanel>
)
}

if (!currentCategory) {
return (
<SectionPanel
eyebrow="Prices"
title="CPI category tracker"
description="Explore CPI products from the CPI database, then drill into monthly national trends and state-wise snapshots with year, month, and state selectors."
>
<EmptyState message="No CPI products available." />
</SectionPanel>
)
}

return (
<SectionPanel
eyebrow="Prices"
title="CPI category tracker"
description="Explore CPI products from the CPI database, then drill into monthly national trends and state-wise snapshots with year, month, and state selectors."
>
<div className="space-y-5">
<div className="space-y-5">
<div className="rounded-[28px] border-4 border-black bg-white p-5 shadow-[8px_8px_0_#000]">
<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
<div>
<p className="inline-flex rounded-full border-2 border-black bg-[#fff3a0] px-3 py-1 text-xs font-black uppercase tracking-[0.18em]">CPI product</p>
<h3 className="mt-3 text-2xl font-black">{currentCategory}</h3>
<p className="mt-1 text-sm text-black/70">Pick a product, year, month, and state to inspect CPI values.</p>
</div>
<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
<label className="space-y-1 text-xs font-black uppercase tracking-[0.16em] text-black/60">
<span>Year</span>
<select value={currentYear} onChange={(event) => setSelectedYear(event.target.value)} className="w-full rounded-2xl border-3 border-black bg-[#fffdf5] px-3 py-2 text-sm font-black uppercase tracking-[0.12em] outline-none">
{availableYears.map((year) => (
<option key={year} value={year}>{year}</option>
))}
</select>
</label>
<label className="space-y-1 text-xs font-black uppercase tracking-[0.16em] text-black/60">
<span>Month</span>
<select value={currentMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="w-full rounded-2xl border-3 border-black bg-[#fffdf5] px-3 py-2 text-sm font-black uppercase tracking-[0.12em] outline-none">
{availableMonths.map((month) => (
<option key={month} value={month}>{MONTH_NAMES[month - 1]}</option>
))}
</select>
</label>
<label className="space-y-1 text-xs font-black uppercase tracking-[0.16em] text-black/60">
<span>State</span>
<select value={currentSelectedState} onChange={(event) => setSelectedState(event.target.value)} className="w-full rounded-2xl border-3 border-black bg-[#fffdf5] px-3 py-2 text-sm font-black uppercase tracking-[0.12em] outline-none">
<option value="All states">All states</option>
{states.map((state) => (
<option key={state} value={state}>{state}</option>
))}
</select>
</label>
<div className="space-y-1 text-xs font-black uppercase tracking-[0.16em] text-black/60">
<span>Period</span>
<div className="flex min-h-11 items-center rounded-2xl border-3 border-black bg-[#f5f5ff] px-3 text-sm font-black tracking-[0.06em] text-black">{periodLabel}</div>
</div>
</div>
</div>

<div className="mt-5 pb-2">
<div className="flex flex-wrap gap-3">
{categories.map((category) => {
const active = currentCategory === category
return (
<button
key={category}
type="button"
onClick={() => setActiveCategory(category)}
className={`shrink-0 rounded-full border-4 border-black px-4 py-2 text-sm font-black uppercase tracking-[0.14em] shadow-[5px_5px_0_#000] transition-transform hover:-translate-y-0.5 ${active ? 'bg-black text-white' : 'bg-[#fff3a0] text-black'}`}
>
{category}
</button>
)
})}
</div>
</div>
</div>

<div className="grid gap-4 md:grid-cols-2">
<StatCard label="Category count" value={categoryCount} />
<StatCard label="State count" value={stateCount} />
<StatCard label="National value" value={nationalLatest?.value != null ? `Rs ${nationalLatest.value.toFixed(2)}` : '—'} />
<StatCard label="Selected state" value={selectedStateRow?.value != null ? `Rs ${selectedStateRow.value.toFixed(2)}` : currentSelectedState === 'All states' ? 'All states' : '—'} />
</div>

<div className="rounded-[28px] border-4 border-black bg-white p-5 shadow-[8px_8px_0_#000]">
<div className="flex items-center justify-between gap-4">
<div>
<p className="inline-flex rounded-full border-2 border-black bg-[#b7f7c2] px-3 py-1 text-xs font-black uppercase tracking-[0.18em]">National trend</p>
<h4 className="mt-3 text-xl font-black">{currentCategory} in {selectedYearLabel}</h4>
</div>
<div className="rounded-full border-2 border-black bg-[#fff3a0] px-3 py-2 text-xs font-black uppercase tracking-[0.16em]">{nationalSeries.length} months</div>
</div>

<div className="mt-4 h-72 rounded-3xl border-4 border-black bg-[#fffdf5] p-3">
{nationalLoading ? (
<EmptyState message="Loading trend..." />
) : nationalError ? (
<EmptyState message={nationalError} />
) : nationalSeries.length ? (
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={nationalSeries}>
<defs>
<linearGradient id="trackerNationalFill" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor="#000000" stopOpacity={0.25} />
<stop offset="95%" stopColor="#000000" stopOpacity={0.02} />
</linearGradient>
</defs>
<CartesianGrid strokeDasharray="4 4" stroke="#00000022" />
<XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 800 }} />
<YAxis tick={{ fontSize: 11, fontWeight: 800 }} width={42} />
<Tooltip contentStyle={{ border: '4px solid #000', borderRadius: '18px', fontWeight: 800 }} labelStyle={{ fontWeight: 900 }} />
<Area type="monotone" dataKey="value" stroke="#000000" fill="url(#trackerNationalFill)" strokeWidth={4} dot={{ r: 3, fill: '#000000', strokeWidth: 0 }} />
</AreaChart>
</ResponsiveContainer>
) : (
<EmptyState message="No national data for this filter." />
)}
</div>
</div>
</div>

<div className="space-y-5">
<div className="rounded-[28px] border-4 border-black bg-white p-5 shadow-[8px_8px_0_#000]">
<div className="flex items-center justify-between gap-4">
<div>
<p className="inline-flex rounded-full border-2 border-black bg-[#f5f5ff] px-3 py-1 text-xs font-black uppercase tracking-[0.18em]">State snapshot</p>
<h4 className="mt-3 text-xl font-black">{periodLabel}</h4>
</div>
<div className="rounded-full border-2 border-black bg-[#fff3a0] px-3 py-2 text-xs font-black uppercase tracking-[0.16em]">{selectedState === 'All states' ? 'All states' : selectedState}</div>
</div>

<div className="mt-4 h-72 rounded-3xl border-4 border-black bg-[#fffdf5] p-3">
{stateLoading ? (
<EmptyState message="Loading states..." />
) : stateError ? (
<EmptyState message={stateError} />
) : topStates.length ? (
<ResponsiveContainer width="100%" height="100%">
<BarChart data={topStates} layout="vertical" margin={{ left: 20, right: 20 }}>
<CartesianGrid strokeDasharray="4 4" stroke="#00000022" />
<XAxis type="number" tick={{ fontSize: 11, fontWeight: 800 }} />
<YAxis type="category" dataKey="state" width={110} tick={{ fontSize: 11, fontWeight: 800 }} />
<Tooltip contentStyle={{ border: '4px solid #000', borderRadius: '18px', fontWeight: 800 }} labelStyle={{ fontWeight: 900 }} />
<Bar dataKey="value" fill="#000000" radius={[0, 16, 16, 0]} />
</BarChart>
</ResponsiveContainer>
) : (
<EmptyState message="No state data for this filter." />
)}
</div>
</div>

<div className="rounded-[28px] border-4 border-black bg-white p-5 shadow-[8px_8px_0_#000]">
<div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr] gap-2 border-b-2 border-black pb-2 text-[0.7rem] font-black uppercase tracking-[0.16em] text-black/55">
<div>State</div>
<div>Value</div>
<div>MoM</div>
<div>YoY</div>
</div>
<div className="mt-2 max-h-96 space-y-2 overflow-auto">
{stateRowsForDisplay.length ? stateRowsForDisplay.map((row) => {
const active = row.state === selectedState
return (
<div key={row.state} className={`grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr] gap-2 rounded-2xl border-2 border-black px-3 py-3 text-sm font-black ${active ? 'bg-[#fff3a0]' : 'bg-white'}`}>
<div className="truncate">{row.state}</div>
<div>{row.value != null ? `Rs ${row.value.toFixed(2)}` : '—'}</div>
<div className={row.mom != null && row.mom < 0 ? 'text-red-700' : 'text-black'}>{row.mom != null ? `${row.mom.toFixed(2)}%` : '—'}</div>
<div className={row.yoy != null && row.yoy < 0 ? 'text-red-700' : 'text-black'}>{row.yoy != null ? `${row.yoy.toFixed(2)}%` : '—'}</div>
</div>
)
}) : (
<EmptyState message="No rows returned for this period." />
)}
</div>
</div>
</div>
</div>
</SectionPanel>
)
}
