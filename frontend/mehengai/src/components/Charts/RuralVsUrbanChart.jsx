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
import { useInflationData } from '../../hooks/useInflationData'

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toSeries(rows = []) {
	return rows.map((row) => ({
		label: `${monthNames[row.month - 1] || row.month} ${row.year}`,
		value: Number(row.yoy_change ?? 0),
	}))
}

export default function RuralVsUrbanChart() {
	const { data: ruralRows = [], loading: ruralLoading, error: ruralError } = useInflationData('/api/cpi', {
		category: 'General',
		segment: 'rural',
		state: 'National',
	})
	const { data: urbanRows = [], loading: urbanLoading, error: urbanError } = useInflationData('/api/cpi', {
		category: 'General',
		segment: 'urban',
		state: 'National',
	})

	const ruralSeries = toSeries(ruralRows)
	const urbanSeries = toSeries(urbanRows)
	const chartData = ruralSeries.map((row, index) => ({
		label: row.label,
		rural: row.value,
		urban: urbanSeries[index]?.value ?? null,
	}))

	const loading = ruralLoading || urbanLoading
	const error = ruralError || urbanError

	return (
		<SectionPanel
			eyebrow="Spatial split"
			title="Rural vs urban CPI"
			description="Live national CPI inflation broken out by settlement segment."
		>
			<div className="h-[300px] w-full">
				{loading ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
						Loading rural / urban data...
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
							<Line type="monotone" dataKey="rural" stroke="#f97316" strokeWidth={4} dot={false} />
							<Line type="monotone" dataKey="urban" stroke="#111111" strokeWidth={4} dot={false} />
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>
		</SectionPanel>
	)
}