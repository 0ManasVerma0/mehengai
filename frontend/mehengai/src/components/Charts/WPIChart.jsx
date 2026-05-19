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
import { useInflationData } from '../../hooks/useInflationData'

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function WPIChart() {
	const { data: rows = [], loading, error } = useInflationData('/api/wpi', {
	})

	const seriesMap = new Map()
	for (const row of rows) {
		const key = `${row.year}-${row.month}`
		if (!seriesMap.has(key)) {
			seriesMap.set(key, {
				year: Number(row.year),
				month: Number(row.month),
				label: `${monthNames[row.month - 1] || row.month} ${row.year}`,
				values: [],
			})
		}
		seriesMap.get(key).values.push(Number(row.value ?? 0))
	}

	const series = Array.from(seriesMap.values())
		.map((entry) => ({
			year: entry.year,
			month: entry.month,
			label: entry.label,
			value: entry.values.length
				? entry.values.reduce((sum, current) => sum + current, 0) / entry.values.length
				: 0,
		}))
		.sort((left, right) => left.year - right.year || left.month - right.month)

	return (
		<SectionPanel
			eyebrow="Wholesale"
			title="WPI snapshot"
			description="A live wholesale price index, averaged across tracked rows."
			className="h-full"
		>
			<div className="h-[220px] w-full">
				{loading ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
						Loading WPI proxy...
					</div>
				) : error ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em] text-red-700">
						{error}
					</div>
				) : (
					<ResponsiveContainer>
						<AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<defs>
								<linearGradient id="wpiFill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85} />
									<stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
								</linearGradient>
							</defs>
							<CartesianGrid stroke="#111111" strokeDasharray="4 4" opacity={0.16} />
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
							<Area type="monotone" dataKey="value" stroke="#111111" strokeWidth={4} fill="url(#wpiFill)" />
						</AreaChart>
					</ResponsiveContainer>
				)}
			</div>
		</SectionPanel>
	)
}