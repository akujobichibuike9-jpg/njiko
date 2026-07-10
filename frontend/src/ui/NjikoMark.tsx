// Vector Njiko mark — gradient-shaded for real depth (pin + location ring + growth arrow + package).
export function NjikoMark({ size = 104, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 64 72" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="njkPin" x1="14" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#CDEE6A" /><stop offset="0.45" stopColor="#A5CE3A" /><stop offset="1" stopColor="#6E9E22" />
        </linearGradient>
        <linearGradient id="njkPinHi" x1="20" y1="6" x2="34" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="njkBoxTop" x1="38" y1="40" x2="54" y2="46" gradientUnits="userSpaceOnUse"><stop stopColor="#E6F7A6" /><stop offset="1" stopColor="#B9DE5A" /></linearGradient>
        <linearGradient id="njkBoxL" x1="38" y1="46" x2="46" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="#8FB82F" /><stop offset="1" stopColor="#6E9E22" /></linearGradient>
        <linearGradient id="njkBoxR" x1="46" y1="46" x2="54" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="#A9D043" /><stop offset="1" stopColor="#84AC2C" /></linearGradient>
        <radialGradient id="njkShadow" cx="0.5" cy="0.5" r="0.5"><stop stopColor="#000" stopOpacity="0.28" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      </defs>

      <ellipse cx="32" cy="66" rx="18" ry="4.2" fill="url(#njkShadow)" />

      <path d="M32 3.5c11.6 0 20 8.3 20 19.4 0 13.9-20 33.6-20 33.6S12 36.8 12 22.9C12 11.8 20.4 3.5 32 3.5Z" fill="url(#njkPin)" />
      <path d="M32 3.5c11.6 0 20 8.3 20 19.4 0 13.9-20 33.6-20 33.6S12 36.8 12 22.9C12 11.8 20.4 3.5 32 3.5Z" fill="url(#njkPinHi)" />
      <path d="M32 3.5c11.6 0 20 8.3 20 19.4 0 13.9-20 33.6-20 33.6S12 36.8 12 22.9C12 11.8 20.4 3.5 32 3.5Z" stroke="#5E8A1C" strokeOpacity="0.4" strokeWidth="0.8" />

      <circle cx="29" cy="22" r="9.5" fill="none" stroke="#F4FBE2" strokeWidth="3.4" />
      <circle cx="29" cy="22" r="3.4" fill="#4E7615" />
      <path d="M35 26l7.5-7.5" stroke="#3C5E10" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M38.5 17.5h5v5" stroke="#3C5E10" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

      <path d="M46 40.5l8 4.4-8 4.4-8-4.4 8-4.4Z" fill="url(#njkBoxTop)" />
      <path d="M38 44.9l8 4.4v9.2l-8-4.4v-9.2Z" fill="url(#njkBoxL)" />
      <path d="M54 44.9l-8 4.4v9.2l8-4.4v-9.2Z" fill="url(#njkBoxR)" />
      <path d="M46 49.3v9.2" stroke="#6E9E22" strokeOpacity="0.5" strokeWidth="0.6" />
    </svg>
  );
}
