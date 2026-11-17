/** 설정 화면용 작은 입력 컴포넌트들 */

export function Segmented({ label, options, value, onChange, disabled }) {
  return (
    <div className="setting-row">
      <span className="setting-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'on' : ''}
            onClick={() => onChange(o.value)}
            disabled={disabled}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Toggle({ label, desc, checked, onChange, disabled }) {
  return (
    <label className={`setting-row toggle-row${disabled ? ' disabled' : ''}`}>
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        {desc && <span className="setting-desc">{desc}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  )
}

export function Section({ title, children }) {
  return (
    <section className="setting-section">
      <h2 className="setting-section-title">{title}</h2>
      <div className="setting-card">{children}</div>
    </section>
  )
}
