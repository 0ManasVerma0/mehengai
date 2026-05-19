import MetricCard from './MetricCard'
import CPIChart from '../Charts/CPIchart'
import ComparisonChart from '../Charts/ComparisonChart'
import RealWageChart from '../Charts/RealWageChart'
import WPIChart from '../Charts/WPIChart'
import SectionPanel from '../Common/SectionPanel'
import { useInflationSingle } from '../../hooks/useInflationData'

function formatLatestPeriod(row) {
	if (!row) return 'No recent data'
	return `Q${row.quarter} ${row.year}`
}

export default function PrimaryDashboard() {
	const { data: cpiLatest, loading: cpiLoading } = useInflationSingle('/api/cpi/latest', {
		category: 'General',
		segment: 'combined',
		state: 'National',
	})
	const { data: wpiLatest, loading: wpiLoading } = useInflationSingle('/api/wpi/latest')
	const { data: wriLatest, loading: wriLoading } = useInflationSingle('/api/wri/latest')

	const latestWriGeneral = Array.isArray(wriLatest)
		? wriLatest.find((row) => row.sector === 'All Sector' || row.sector === 'General') || wriLatest[0]
		: null

	const metrics = [
		{
			label: 'CPI',
			value: cpiLatest?.value != null ? `${Number(cpiLatest.value).toFixed(1)}%` : '—',
			delta: cpiLatest?.yoy_change != null ? `YoY ${Number(cpiLatest.yoy_change).toFixed(1)}%` : 'Live data',
			note: cpiLatest ? `${cpiLatest.month}/${cpiLatest.year} national general CPI` : 'Fetching latest CPI from the API.',
			tone: 'amber',
		},
		{
			label: 'WPI',
			value: wpiLatest?.value != null ? `Rs ${Number(wpiLatest.value).toFixed(0)}` : '—',
			delta: wpiLatest?.category ? wpiLatest.category : 'Latest price',
			note: wpiLatest ? `${wpiLatest.category} · ${wpiLatest.month}/${wpiLatest.year}` : 'Fetching latest tracked price from the API.',
			tone: 'blue',
		},
		{
			label: 'Real wage',
			value: latestWriGeneral?.real_wage_growth != null ? `${Number(latestWriGeneral.real_wage_growth).toFixed(1)}%` : '—',
			delta: latestWriGeneral?.status ? latestWriGeneral.status : 'General sector',
			note: latestWriGeneral ? `General sector · ${formatLatestPeriod(latestWriGeneral)}` : 'Fetching live WRI values from the API.',
			tone: 'green',
		},
	]

	return (
		<section id="overview" className="space-y-6">
			<SectionPanel
				eyebrow="dashboard"
				title="Inflation and wage Quick View"
				description="Track CPI(consumer price index), WPI(wholesale price index), real wage"
			>
				<div className="grid gap-4 md:grid-cols-3">
					{metrics.map((metric) => (
						<MetricCard key={metric.label} {...metric} />
					))}
				</div>
				{(cpiLoading || wpiLoading || wriLoading) ? (
					<p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-black/60">
						Loading live metrics from the API...
					</p>
				) : null}
			</SectionPanel>

			<div className="grid gap-6 xl:grid-cols-2">
				<CPIChart />
				<ComparisonChart />
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<WPIChart />
				<RealWageChart />
			</div>
		</section>
	)
}
