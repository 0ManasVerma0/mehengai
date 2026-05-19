export default function ToggleGroup({ options, value, onChange, className = '' }) {
  return (
    <div
      className={`inline-flex flex-wrap gap-2 rounded-full border-[3px] border-black bg-white p-2 shadow-[6px_6px_0_#000] ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`rounded-full border-2 border-black px-4 py-2 text-sm font-black uppercase tracking-[0.12em] transition-transform hover:-translate-y-0.5 ${
              active ? 'bg-black text-white' : 'bg-[#fff3a0] text-black'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}