import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
import SectionPanel from '../Common/SectionPanel'

const LEGEND_STOPS = [
  { label: '< 2%', value: 1.5 },
  { label: '2-4%', value: 3 },
  { label: '4-6%', value: 5 },
  { label: '6-8%', value: 7 },
  { label: '8%+', value: 9 },
]

const GEO_STATE_ALIASES = {
  'Andaman & Nicobar Island': 'Andaman & Nicobar Islands',
  'Dadara & Nagar Havelli': 'Dadra & Nagar Haveli and Daman & Diu',
  'Daman & Diu': 'Dadra & Nagar Haveli and Daman & Diu',
  'Jammu and Kashmir': 'Jammu & Kashmir',
  'NCT of Delhi': 'Delhi',
  Orissa: 'Odisha',
  Uttaranchal: 'Uttarakhand',
}

function getHeatColor(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return '#eeeeee'
  }

  const intensity = Math.max(0, Math.min(1, Number(value) / 9))
  const lightness = 92 - intensity * 48
  return `hsl(10 88% ${lightness}%)`
}

function normalizeGeoStateName(name) {
  return GEO_STATE_ALIASES[name] || name
}

function FitGeoJsonBounds({ geoJson }) {
  const map = useMap()

  useEffect(() => {
    if (!geoJson) return

    const layer = L.geoJSON(geoJson)
    map.fitBounds(layer.getBounds(), {
      padding: [2, 2],
      animate: false,
    })
    map.zoomIn(1, { animate: false })
  }, [geoJson, map])

  return null
}

export default function IndiaHeatmap({
  title,
  description,
  sector,
  states,
  periodLabel,
  valueLabel = 'CPI YoY',
  snapshotLabel = 'CPI snapshot',
  highestLabel = 'Highest state CPI YoY',
  helperText = 'State colors represent CPI YoY for the selected month and category.',
  actions = null,
}) {
  const [geoJson, setGeoJson] = useState(null)
  const [geoError, setGeoError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetch('/maps/india_states_2019.geojson')
      .then((response) => {
        if (!response.ok) throw new Error('India GeoJSON could not be loaded')
        return response.json()
      })
      .then((data) => {
        if (!cancelled) setGeoJson(data)
      })
      .catch((error) => {
        if (!cancelled) setGeoError(error.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const stateValueMap = useMemo(() => {
    const lookup = {}
    for (const item of states) {
      lookup[item.state] = item.values[sector]
    }
    return lookup
  }, [states, sector])

  const ranked = [...states]
    .filter((item) => item.values[sector] != null)
    .sort((a, b) => b.values[sector] - a.values[sector])
  const leader = ranked[0]

  const getFeatureValue = (feature) => {
    const geoName = feature?.properties?.ST_NM || feature?.properties?.NAME_1 || ''
    return stateValueMap[normalizeGeoStateName(geoName)] ?? null
  }

  return (
    <SectionPanel
      eyebrow="State heatmap"
      title={title}
      description={description}
      actions={actions}
    >
      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.5fr]">
        <div className="rounded-[18px] border-4 border-black bg-[#b9cbed] p-4 shadow-[8px_8px_0_#000]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-black/70">India states geographic heat map</p>
            <div className="flex flex-wrap gap-2">
              {periodLabel ? (
                <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                  {periodLabel}
                </span>
              ) : null}
              <span className="rounded-full border-2 border-black bg-[#fff3a0] px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                {valueLabel}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_170px] lg:items-start">
            <div className="overflow-hidden rounded-[14px] border-4 border-black bg-[#b9cbed]">
              {geoError ? (
                <div className="flex min-h-[520px] items-center justify-center bg-white/70 p-6 text-center text-sm font-black uppercase tracking-[0.16em] text-red-700">
                  {geoError}
                </div>
              ) : !geoJson ? (
                <div className="flex min-h-[520px] items-center justify-center bg-white/70 p-6 text-center text-sm font-black uppercase tracking-[0.16em]">
                  Loading India map...
                </div>
              ) : (
                <MapContainer
                  className="h-[760px] w-full bg-[#b9cbed]"
                  center={[22.5, 82]}
                  zoom={4}
                  minZoom={3}
                  maxZoom={7}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <FitGeoJsonBounds geoJson={geoJson} />
                  <GeoJSON
                    key={`${periodLabel}-${valueLabel}`}
                    data={geoJson}
                    onEachFeature={(feature, layer) => {
                      const geoName = feature?.properties?.ST_NM || feature?.properties?.NAME_1 || ''
                      const stateName = normalizeGeoStateName(geoName)
                      const value = stateValueMap[stateName]
                      const label = value != null ? `${Number(value).toFixed(1)}% YoY` : 'No CPI data'
                      layer.bindTooltip(
                        `<strong>${stateName}</strong><br/>${label}`,
                        {
                          sticky: true,
                          direction: 'auto',
                        },
                      )
                    }}
                    style={(feature) => {
                      const value = getFeatureValue(feature)
                      return {
                        fillColor: getHeatColor(value),
                        fillOpacity: 0.92,
                        color: '#ffffff',
                        weight: 1.2,
                        opacity: 1,
                      }
                    }}
                  />
                </MapContainer>
              )}
            </div>

            <div className="rounded-[16px] border-4 border-black bg-white p-4 shadow-[6px_6px_0_#000]">
              <p className="text-sm font-black uppercase tracking-[0.16em]">Color index</p>
              <div className="mt-4 space-y-3">
                {LEGEND_STOPS.map((stop) => (
                  <div key={stop.label} className="flex items-center gap-3">
                    <span
                      className="h-7 w-10 rounded-md border-2 border-black"
                      style={{ background: getHeatColor(stop.value) }}
                    />
                    <span className="text-sm font-black">{stop.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs font-black uppercase leading-5 tracking-[0.12em] text-black/60">
                Darker red means higher CPI inflation.
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-[18px] border-4 border-black bg-black p-5 text-white shadow-[8px_8px_0_#fff]">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/70">{snapshotLabel}</p>
          <h3 className="mt-2 text-2xl font-black">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/80">{description}</p>

          {leader ? (
            <div className="mt-6 rounded-[18px] border-2 border-white/30 bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">{highestLabel}</p>
              <p className="mt-2 text-2xl font-black">{leader.state}</p>
              <p className="mt-1 text-sm text-white/80">{Number(leader.values[sector]).toFixed(1)}% YoY</p>
            </div>
          ) : (
            <div className="mt-6 rounded-[18px] border-2 border-dashed border-white/30 bg-white/10 p-4 text-sm text-white/70">
              No state-level CPI data for this period.
            </div>
          )}

          <p className="mt-4 rounded-[18px] border-2 border-white/20 bg-white/10 px-4 py-3 text-sm leading-6">
            {helperText}
          </p>
        </aside>
      </div>
    </SectionPanel>
  )
}
