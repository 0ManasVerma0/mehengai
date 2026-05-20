const links = [
	{ label: 'Overview', href: '#overview' },
	{ label: 'Distribution', href: '#distribution' },
	{ label: 'CPI heatmap', href: '#cpi-heatmap' },
	{ label: 'Prices', href: '#prices' },
]

export default function Navbar() {
	return (
		<header className="sticky top-0 z-[1200] px-4 py-4 sm:px-6">
			<div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[28px] border-4 border-black bg-[#fffdf5] px-4 py-3 shadow-[8px_8px_0_#000] sm:px-5">
				<a href="#overview" className="text-lg font-black uppercase tracking-[0.2em]">
					Mehengai
				</a>
				<nav className="flex flex-wrap items-center gap-2">
					{links.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="rounded-full border-2 border-black bg-[#fff3a0] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] transition-transform hover:-translate-y-0.5"
						>
							{link.label}
						</a>
					))}
				</nav>

				<span className="rounded-full border-2 border-black bg-black px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-white">
					Not like those government websites
				</span>
			</div>
		</header>
	)
}