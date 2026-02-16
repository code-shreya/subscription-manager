export default function Logo({ size = "default" }) {
  const dimensions = {
    small: { container: "w-8 h-8", icon: "w-5 h-5" },
    default: { container: "w-10 h-10", icon: "w-6 h-6" },
    large: { container: "w-12 h-12", icon: "w-7 h-7" }
  };

  const dim = dimensions[size];

  return (
    <div className={`${dim.container} rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-sm`}>
      <svg
        className={`${dim.icon} text-white`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Credit card icon with $ symbol */}
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <circle cx="12" cy="15" r="1.5" />
        <path d="M10 15h4" />
      </svg>
    </div>
  );
}

// Alternative logo with layers/stacked effect
export function LogoStacked({ size = "default" }) {
  const dimensions = {
    small: { container: "w-8 h-8" },
    default: { container: "w-10 h-10" },
    large: { container: "w-12 h-12" }
  };

  const dim = dimensions[size];

  return (
    <div className={`${dim.container} relative`}>
      {/* Multiple layered cards effect */}
      <div className="absolute inset-0 bg-purple-400 rounded-lg transform rotate-6 opacity-30"></div>
      <div className="absolute inset-0 bg-purple-500 rounded-lg transform rotate-3 opacity-60"></div>
      <div className="absolute inset-0 bg-purple-600 rounded-lg flex items-center justify-center shadow-md">
        <span className="text-white font-bold text-lg">$</span>
      </div>
    </div>
  );
}

// Minimal logo - just letters
export function LogoMinimal() {
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-sm">
      <span className="text-white font-bold text-xl">S</span>
    </div>
  );
}
