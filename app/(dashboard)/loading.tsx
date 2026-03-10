export default function DashboardLoading() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ background: "var(--bg, #0f0a1a)" }}
    >
      {/* Logo icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #5b1f8a 0%, #7c2fb8 100%)",
          boxShadow: "0 0 40px rgba(91,31,138,0.5)",
          animation: "scholar-pulse 1.6s ease-in-out infinite",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a8d400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      </div>

      {/* App name */}
      <p
        className="text-xl font-bold tracking-widest uppercase"
        style={{ color: "#a8d400", fontFamily: "var(--font-display, sans-serif)", letterSpacing: "0.2em" }}
      >
        Scholar
      </p>

      {/* Animated dots bar */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: i === 1 || i === 2 ? 8 : 6,
              height: i === 1 || i === 2 ? 8 : 6,
              background: "#a8d400",
              opacity: 0.3,
              animation: `scholar-dot 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes scholar-pulse {
          0%, 100% { transform: scale(1);   box-shadow: 0 0 40px rgba(91,31,138,0.5); }
          50%       { transform: scale(1.06); box-shadow: 0 0 60px rgba(168,212,0,0.35); }
        }
        @keyframes scholar-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scaleY(1); }
          40%            { opacity: 1;    transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  );
}
