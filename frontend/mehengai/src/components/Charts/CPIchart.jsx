import { useState } from 'react'
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import SectionPanel from '../Common/SectionPanel'
import ToggleGroup from '../Common/ToggleGroup'
import { useInflationData } from '../../hooks/useInflationData'

const options = [
	{ label: 'MoM', value: 'mom' },
	{ label: 'YoY', value: 'yoy' },
	{ label: '12M', value: 'twelve' },
]

const labels = {
	mom: 'Month-on-month movement',
	yoy: 'Year-on-year momentum',
	twelve: '12-month moving average',
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function CPIChart() {
	const [mode, setMode] = useState('yoy')
	const { data: rows = [], loading, error } = useInflationData('/api/cpi', {
		category: 'General',
		segment: 'combined',
		state: 'National',
	})

	const series = rows
		.map((row) => ({
			year: Number(row.year),
			month: Number(row.month),
			label: `${monthNames[row.month - 1] || row.month} ${row.year}`,
			mom: Number(row.mom_change ?? 0),
			yoy: Number(row.yoy_change ?? 0),
			twelve: Number(row.moving_avg ?? row.value ?? 0),
		}))
		.sort((left, right) => left.year - right.year || left.month - right.month)

	const chartData = series.map((row) => ({ label: row.label, value: row[mode] }))

	return (
		<SectionPanel
			eyebrow="Consumer prices"
			title="CPI trend"
			description={labels[mode]}
			actions={<ToggleGroup options={options} value={mode} onChange={setMode} />}
		>
			<div className="h-80 w-full">
				{loading ? (
					<div className="flex h-full items-center justify-center rounded-3xl border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
						Loading CPI...
					</div>
				) : error ? (
					<div className="flex h-full items-center justify-center rounded-3xl border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em] text-red-700">
						{error}
					</div>
				) : (
					<ResponsiveContainer>
						<AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<defs>
								<linearGradient id="cpiFill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#ff9f1c" stopOpacity={0.85} />
									<stop offset="95%" stopColor="#ff9f1c" stopOpacity={0.1} />
								</linearGradient>
							</defs>
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
							<Area
								type="monotone"
								dataKey="value"
								stroke="#111111"
								strokeWidth={4}
								fill="url(#cpiFill)"
							/>
						</AreaChart>
					</ResponsiveContainer>
				)}
			</div>
		</SectionPanel>
	)
}
