import {
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

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toSeries(rows = []) {
	return rows.map((row) => ({
		label: `${monthNames[row.month - 1] || row.month} ${row.year}`,
		value: Number(row.yoy_change ?? 0),
	}))
}

export default function FoodVsNonFoodChart() {
	const { data: foodRows = [], loading: foodLoading, error: foodError } = useInflationData('/api/cpi', {
		category: 'Food',
		segment: 'combined',
		state: 'National',
	})
	const { data: nonFoodRows = [], loading: nonFoodLoading, error: nonFoodError } = useInflationData('/api/cpi', {
		category: 'Non-Food',
		segment: 'combined',
		state: 'National',
	})

	const foodSeries = toSeries(foodRows)
	const nonFoodSeries = toSeries(nonFoodRows)
	const chartData = foodSeries.map((row, index) => ({
		label: row.label,
		food: row.value,
		nonFood: nonFoodSeries[index]?.value ?? null,
	}))

	const loading = foodLoading || nonFoodLoading
	const error = foodError || nonFoodError

	return (
		<SectionPanel
			eyebrow="Basket mix"
			title="Food vs non-food CPI"
			description="Live CPI category inflation for the food basket versus everything else."
		>
			<div className="h-[300px] w-full">
				{loading ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
						Loading food / non-food data...
					</div>
				) : error ? (
					<div className="flex h-full items-center justify-center rounded-[24px] border-2 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em] text-red-700">
						{error}
					</div>
				) : (
					<ResponsiveContainer>
						<BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
							<Bar dataKey="food" fill="#ef4444" stroke="#111111" strokeWidth={2} radius={[12, 12, 0, 0]} />
							<Bar dataKey="nonFood" fill="#fbbf24" stroke="#111111" strokeWidth={2} radius={[12, 12, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
		</SectionPanel>
	)
}