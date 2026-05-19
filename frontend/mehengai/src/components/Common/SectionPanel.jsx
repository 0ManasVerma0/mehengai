export default function SectionPanel({
  eyebrow,
  title,
  description,
  children,
  className = '',
  actions = null,
}) {
  return (
    <section
      className={`rounded-4xl border-4 border-black bg-[#fffdf5] p-5 shadow-[10px_10px_0_#000] sm:p-7 ${className}`}
    >
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="mb-2 inline-flex w-fit rounded-full border-2 border-black bg-[#fff3a0] px-3 py-1 text-xs font-black uppercase tracking-[0.2em]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/75 sm:text-base">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}