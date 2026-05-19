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

const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4']

export default function RealWageChart() {
	const { data: rows = [], loading, error } = useInflationData('/api/wri', {
		sector: 'General',
		from: 2016,
	})

	const series = rows
		.filter((row) => row.real_wage_growth != null)
		.map((row) => ({
			label: `${quarterNames[Number(row.quarter) - 1] || `Q${row.quarter}`} ${row.year}`,
			value: Number(row.real_wage_growth),
		}))

	return (
		<SectionPanel
			eyebrow="Income"
			title="Real wage trend"
			description="Live general-sector real wage growth from the backend WRI feed."
		>
			<div className="h-[220px] w-full">
				{loading ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
						Loading real wage...
					</div>
				) : error ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em] text-red-700">
						{error}
					</div>
				) : series.length === 0 ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em] text-black/60">
						No real wage data available
					</div>
				) : (
					<ResponsiveContainer>
						<AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
							<defs>
								<linearGradient id="wageFill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor="#22c55e" stopOpacity={0.85} />
									<stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
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
							<Area type="monotone" dataKey="value" stroke="#111111" strokeWidth={4} fill="url(#wageFill)" />
						</AreaChart>
					</ResponsiveContainer>
				)}
			</div>
		</SectionPanel>
	)
}
