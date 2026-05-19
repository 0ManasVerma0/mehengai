import { useMemo, useState } from 'react'
import ToggleGroup from '../Common/ToggleGroup'
import IndiaHeatmap from '../Heatmap/IndiaHeatmap'
import { useInflationData } from '../../hooks/useInflationData'
import { indiaHeatmapLayout } from '../../data/indiaHeatmapLayout'
import { lookupStateMetric } from '../../utils/stateNames'

const SECTOR_OPTIONS = [
	{ label: 'All sectors', value: 'All Sector', slug: 'all' },
	{ label: 'Manufacturing', value: 'Manufacturing Sector', slug: 'manufacturing' },
	{ label: 'Mining', value: 'Mining Sector', slug: 'mining' },
	{ label: 'Plantation', value: 'Plantation Sector', slug: 'plantation' },
]

const descriptions = {
	'All Sector': 'Headline all-sector WRI index with regional CPI YoY on the map.',
	'Manufacturing Sector': 'Manufacturing WRI with regional miscellaneous CPI YoY proxy.',
	'Mining Sector': 'Mining WRI with regional fuel & light CPI YoY proxy.',
	'Plantation Sector': 'Plantation WRI with regional food CPI YoY proxy.',
}

function formatPeriod(year, quarter) {
	return `Q${quarter} ${year}`
}

export default function WRIChart() {
	const [sector, setSector] = useState('All Sector')
	const { data: periods = [], loading: periodsLoading } = useInflationData('/api/wri/periods')
	const [selectedPeriod, setSelectedPeriod] = useState(null)

	const activePeriod = selectedPeriod || periods[0] || null
	const sectorSlug = SECTOR_OPTIONS.find((option) => option.value === sector)?.slug || 'all'

	const heatmapYear = activePeriod?.year ?? 2024
	const heatmapQuarter = activePeriod?.quarter ?? 3

	const { data: heatmapPayload, loading: heatmapLoading, error: heatmapError } = useInflationData(
		'/api/wri/heatmap',
		{
			year: heatmapYear,
			quarter: heatmapQuarter,
			sector,
		},
	)

	const { data: historyRows = [], loading: historyLoading } = useInflationData('/api/wri', {
		sector,
		from: 2016,
		to: 2024,
	})

	const stateMetrics = useMemo(() => {
		const lookup = {}
		const rows = heatmapPayload?.states || []
		for (const row of rows) {
			if (row.state && row.cpi_yoy != null) {
				lookup[row.state] = row.cpi_yoy
			}
		}
		return lookup
	}, [heatmapPayload])

	const mapStates = useMemo(() => {
		return indiaHeatmapLayout.map((cell) => ({
			...cell,
			values: {
				[sectorSlug]: lookupStateMetric(stateMetrics, cell.state),
			},
		}))
	}, [stateMetrics, sectorSlug])

	const periodOptions = useMemo(() => {
		return periods.map((period) => ({
			label: formatPeriod(period.year, period.quarter),
			value: `${period.year}-${period.quarter}`,
		}))
	}, [periods])

	const periodValue = activePeriod ? `${activePeriod.year}-${activePeriod.quarter}` : ''

	const national = heatmapPayload?.national
	const periodLabel = activePeriod ? formatPeriod(activePeriod.year, activePeriod.quarter) : ''

	const history = historyRows
		.map((row) => ({
			label: `Q${row.quarter} ${row.year}`,
			wri: row.wri_value != null ? Number(row.wri_value) : null,
		}))
		.sort((left, right) => {
			const [ly, lq] = left.label.replace('Q', '').split(' ')
			const [ry, rq] = right.label.replace('Q', '').split(' ')
			return Number(ly) - Number(ry) || Number(lq) - Number(rq)
		})

	const loading = periodsLoading || heatmapLoading

	return (
		<div className="space-y-6">
			{loading ? (
				<div className="flex min-h-[320px] items-center justify-center rounded-[28px] border-4 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em]">
					Loading WRI heatmap...
				</div>
			) : heatmapError ? (
				<div className="flex min-h-[320px] items-center justify-center rounded-[28px] border-4 border-dashed border-black/30 bg-white/60 text-sm font-black uppercase tracking-[0.18em] text-red-700">
					{heatmapError}
				</div>
			) : (
				<IndiaHeatmap
					title="India WRI heatmap"
					description={descriptions[sector]}
					sector={sectorSlug}
					states={mapStates}
					periodLabel={periodLabel}
					actions={
						<div className="flex flex-wrap gap-3">
							{periodOptions.length ? (
								<select
									value={periodValue}
									onChange={(event) => {
										const [year, quarter] = event.target.value.split('-')
										setSelectedPeriod({ year: Number(year), quarter: Number(quarter) })
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
							<ToggleGroup options={SECTOR_OPTIONS} value={sector} onChange={setSector} />
						</div>
					}
				/>
			)}

			<div className="rounded-[28px] border-4 border-black bg-white p-5 shadow-[8px_8px_0_#000]">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<p className="inline-flex rounded-full border-2 border-black bg-[#f5f5ff] px-3 py-1 text-xs font-black uppercase tracking-[0.18em]">
							National WRI
						</p>
						<h4 className="mt-3 text-xl font-black">
							{sector} · {periodLabel || 'Latest quarter'}
						</h4>
					</div>
					<p className="text-4xl font-black">
						{national?.wri_value != null ? Number(national.wri_value).toFixed(1) : '—'}
					</p>
				</div>
				<p className="mt-2 text-sm text-black/70">
					Quarterly WRI index (2016–2024). State map uses CPI YoY for the matching sector category.
				</p>
			</div>

			<div className="rounded-[28px] border-4 border-black bg-white p-5 shadow-[8px_8px_0_#000]">
				<p className="text-sm font-black uppercase tracking-[0.18em] text-black/70">Quarterly WRI history</p>
				{historyLoading ? (
					<p className="mt-4 text-sm font-black uppercase tracking-[0.16em]">Loading history...</p>
				) : (
					<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{history.slice(-8).map((point) => (
							<div
								key={point.label}
								className="rounded-[22px] border-4 border-black bg-[#fff3a0] p-4 shadow-[5px_5px_0_#000]"
							>
								<p className="text-xs font-black uppercase tracking-[0.16em] text-black/70">{point.label}</p>
								<p className="mt-3 text-3xl font-black">
									{point.wri != null ? point.wri.toFixed(1) : '—'}
								</p>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
