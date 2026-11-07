/** Decorative vector artwork shared by the landing-inspired workspace. */
export function FlowArtwork({ className = "", variant = "notes" }: { className?: string; variant?: "notes" | "path" | "course" }) {
  return <svg className={`workspace-vector ${className}`} viewBox="0 0 320 170" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="170" cy="88" rx="106" ry="69" className="vector-wash" />
    <path className="vector-trail" d="M5 131C65 173 54 17 135 28S210 160 267 118 285 44 323 54" />
    <path className="vector-trail-secondary" d="M3 145C73 186 70 2 147 15S232 173 283 130 307 72 327 71" />
    {variant === "path" ? <>
      <circle cx="94" cy="67" r="13" className="vector-paper" /><path className="vector-ink" d="m88 67 4 4 7-8" />
      <circle cx="197" cy="106" r="18" className="vector-paper" /><path className="vector-ink" d="m189 106 6 6 10-13" />
      <path className="vector-accent" d="m254 33 3 10 10 3-10 3-3 10-3-10-10-3 10-3Z" />
    </> : variant === "course" ? <>
      <g transform="rotate(-9 160 85)"><path className="vector-paper" d="M111 41h96v96h-96z" /><path className="vector-ink" d="M125 59h59m-59 14h42m-42 25h59m-59 14h33" /><path className="vector-accent" d="M193 40v27l-8-5-8 5V40" /></g>
      <circle cx="232" cy="120" r="6" className="vector-accent-fill" />
    </> : <>
      <rect x="117" y="33" width="91" height="111" rx="9" transform="rotate(8 117 33)" className="vector-back-paper" />
      <g transform="rotate(-8 155 86)"><rect x="102" y="28" width="94" height="112" rx="9" className="vector-paper" /><path className="vector-ink" d="M119 48h39m-39 17h60m-60 34h60m-60 16h40" /><path className="vector-emphasis" d="M116 81h64" /></g>
      <path className="vector-accent" d="M242 51v20m-10-10h20" />
    </>}
    <circle cx="54" cy="52" r="5" className="vector-accent-fill" />
  </svg>;
}
