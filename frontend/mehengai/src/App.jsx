import Navbar from './components/Layout/Navbar'
import Footer from './components/Layout/Footer'
import PrimaryDashboard from './components/Dashboard/PrimaryDashboard'
import SecondaryDashboard from './components/Dashboard/SecondaryDashboard'
import CPIHeatmap from './components/Heatmap/CPIHeatmap'
import PriceTracker from './components/PriceTracker/PriceTracker'
import { useInflationSingle } from './hooks/useInflationData'

const App = () => {
  const { data: cpiLatest } = useInflationSingle('/api/cpi/latest')
  const latestCpiValue = cpiLatest?.yoy_change != null ? `${Number(cpiLatest.yoy_change).toFixed(1)}%` : 'Loading...'
  const latestCpiPeriod = cpiLatest ? `${cpiLatest.month}/${cpiLatest.year}` : 'Latest CPI'

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-12 pt-4 sm:px-6 lg:gap-10">
        <section className="overflow-hidden rounded-4xl border-4 border-black bg-black px-5 py-8 text-white shadow-[10px_10px_0_#fff] sm:px-7 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border-2 border-white bg-[#fff3a0] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-black">
                Mehengai tracker
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Consumer and Wholesale Price Index, wage pressure, state heatmaps, and price tracking.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                Website is updated with the latest data as per Indian government's data libraries. The data for wage growth is only available till 2024 as there was no data uploaded by government after this time period
              </p>
            </div>

            <div className="rounded-[28px] border-4 border-white bg-[#fffdf5] p-5 text-black shadow-[8px_8px_0_#fff]">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-black/60">Today's pulse</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border-2 border-black bg-[#fff3a0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em]">Inflation watch</p>
                  <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                    <p className="text-4xl font-black leading-none">{latestCpiValue}</p>
                    <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em]">
                      {latestCpiPeriod}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-black text-black/70">National general CPI YoY</p>
                </div>
                <div className="rounded-2xl border-2 border-black bg-[#b7f7c2] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em]">Wage signal</p>
                  <p className="mt-2 text-2xl font-black">Real wage improving</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <PrimaryDashboard />
        <SecondaryDashboard />

        <CPIHeatmap />

        <section id="prices">
          <PriceTracker />
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default App
