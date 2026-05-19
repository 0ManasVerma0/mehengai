import { useState } from 'react'
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import SectionPanel from '../Common/SectionPanel'
import ToggleGroup from '../Common/ToggleGroup'
import { useInflationData } from '../../hooks/useInflationData'

const options = [
	{ label: 'WPI', value: 'wpi' },
	{ label: 'WRI', value: 'wri' },
]

const meta = {
	wpi: {
		title: 'CPI vs WPI',
		description: 'Live CPI versus WPI trends.',
		lineLabel: 'WPI proxy',
		lineColor: '#3b82f6',
	},
	wri: {
		title: 'CPI vs WRI',
		description: 'Live CPI versus real wage growth by quarter.',
		lineLabel: 'Real wage growth',
		lineColor: '#16a34a',
	},
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function quarterLabel(year, quarter) {
	return `Q${quarter} ${year}`
}

export default function ComparisonChart() {
	const [mode, setMode] = useState('wri')
	const active = meta[mode]

	const { data: comparisonRows = [], loading: wpiLoading, error: wpiError } = useInflationData('/api/cpi/comparison', {
		segment: 'combined',
	})

	const { data: cpiRows = [], loading: cpiSeriesLoading } = useInflationData('/api/cpi', {
		category: 'General',
		segment: 'combined',
		state: 'National',
	})

	const { data: wriRows = [], loading: wriLoading, error: wriError } = useInflationData('/api/wri', {
		sector: 'General',
	})

	const wpiSeries = comparisonRows.map((row) => ({
		label: `${monthNames[row.month - 1] || row.month} ${row.year}`,
		cpi: Number(row.cpi_yoy ?? row.cpi_value ?? 0),
		other: Number(row.wpi_yoy ?? row.wpi_value ?? 0),
	}))

	const cpiQuarterMap = new Map()
	for (const row of cpiRows) {
		const quarter = Math.ceil(Number(row.month) / 3)
		const key = `${row.year}-${quarter}`
		if (!cpiQuarterMap.has(key)) {
			cpiQuarterMap.set(key, [])
		}
		cpiQuarterMap.get(key).push(Number(row.yoy_change ?? 0))
	}

	const wriSeries = wriRows.map((row) => {
		const key = `${row.year}-${row.quarter}`
		const cpiQuarterValues = cpiQuarterMap.get(key) || []
		const cpiAverage = cpiQuarterValues.length
			? cpiQuarterValues.reduce((sum, value) => sum + value, 0) / cpiQuarterValues.length
			: null

		return {
			label: quarterLabel(row.year, row.quarter),
			cpi: cpiAverage != null ? Number(cpiAverage.toFixed(2)) : null,
			other: Number(row.real_wage_growth ?? row.wri_value ?? 0),
		}
	})

	const chartData = mode === 'wpi' ? wpiSeries : wriSeries
	const loading = mode === 'wpi' ? wpiLoading || cpiSeriesLoading : wriLoading || cpiSeriesLoading
	const error = mode === 'wpi' ? wpiError : wriError

	return (
		<SectionPanel
			eyebrow="Price pressure"
			title={active.title}
			description={active.description}
			actions={<ToggleGroup options={options} value={mode} onChange={setMode} />}
		>
			<div className="h-[280px] w-full">
				{loading ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
						Loading comparison...
					</div>
				) : error ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em] text-red-700">
						{error}
					</div>
				) : (
					<ResponsiveContainer>
						<LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<CartesianGrid stroke="#111111" strokeDasharray="4 4" opacity={0.18} />
							<XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
							<YAxis tickLine={false} axisLine={false} width={36} />
							<Tooltip
								contentStyle={{
									border: '3px solid #000',
									borderRadius: '18px',
									background: '#fffdf5',
									boxShadow: '6px 6px 0 #000',
								}}
							/>
							<Line type="monotone" dataKey="cpi" name="CPI" stroke="#111111" strokeWidth={4} dot={false} />
							<Line
								type="monotone"
								dataKey="other"
								name={active.lineLabel}
								stroke={active.lineColor}
								strokeWidth={4}
								dot={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>
		</SectionPanel>
	)
}