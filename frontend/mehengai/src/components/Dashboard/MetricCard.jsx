const toneClasses = {
	amber: 'bg-[#fff3a0]',
	blue: 'bg-[#a8e6ff]',
	green: 'bg-[#aef7c6]',
}

export default function MetricCard({ label, value, delta, note, tone = 'amber' }) {
	return (
		<article className="rounded-[28px] border-4 border-black bg-white p-5 shadow-[8px_8px_0_#000] transition-transform hover:-translate-y-1">
			<div className={`mb-4 inline-flex rounded-full border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${toneClasses[tone] || toneClasses.amber}`}>
				{label}
			</div>
			<div className="flex items-end justify-between gap-4">
				<p className="text-4xl font-black leading-none sm:text-5xl">{value}</p>
				<span className="rounded-full border-2 border-black bg-[#111111] px-3 py-1 text-sm font-black text-white">{delta}</span>
			</div>
			<p className="mt-4 text-sm leading-6 text-black/75">{note}</p>
		</article>
	)
}
