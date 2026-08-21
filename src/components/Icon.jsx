const shared = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  video: <><rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 5-3v10l-5-3z"/></>,
  sparkles: <><path d="m12 3-1.7 5.3L5 10l5.3 1.7L12 17l1.7-5.3L19 10l-5.3-1.7zM19 16l-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7zM5 3l-.7 2.3L2 6l2.3.7L5 9l.7-2.3L8 6l-2.3-.7z"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/></>,
  shield: <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z"/>,
  activity: <path d="M3 12h4l2.1-6 4.1 12L16 10l1.4 2H21"/>,
  plug: <><path d="M12 22v-6M9 8V3M15 8V3M7 8h10v3a5 5 0 0 1-10 0z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H5v-3.2h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3.4h3.2v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L20 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3.2H21a1.7 1.7 0 0 0-1.6 1.8Z"/></>,
  search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  arrowUpRight: <><path d="M7 17 17 7M8 7h9v9"/></>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,
  chevronRight: <path d="m9 18 6-6-6-6"/>,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3.2"/>,
  users: <><path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M16 4.2a3.5 3.5 0 0 1 0 6.7M20 20v-1.5a4.5 4.5 0 0 0-3.2-4.3"/></>,
  check: <path d="m5 12 4.2 4.2L19 6.5"/>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></>,
  wifi: <><path d="M3 9a14 14 0 0 1 18 0M6 12a9.5 9.5 0 0 1 12 0M9 15a5 5 0 0 1 6 0"/><path d="M12 19h.01" strokeWidth="3.2"/></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></>,
  micOff: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 10.8 4.8M12 17.5V21M9 21h6M4 4l16 16"/></>,
  videoOff: <><rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 5-3v10l-5-3zM4 4l16 16"/></>,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  phoneOff: <path d="M5 4.7 7.2 4a1.5 1.5 0 0 1 1.8.8l1 2.4a1.5 1.5 0 0 1-.4 1.7l-1.3 1.1a13.2 13.2 0 0 0 5.7 5.7l1.1-1.3a1.5 1.5 0 0 1 1.7-.4l2.4 1a1.5 1.5 0 0 1 .8 1.8l-.7 2.2a1.5 1.5 0 0 1-1.5 1.1C10.2 20.1 3.9 13.8 3.9 6.2A1.5 1.5 0 0 1 5 4.7Z"/>,
  code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  moon: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/>,
  sun: <><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  x: <path d="m6 6 12 12M18 6 6 18"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  command: <path d="M9 9H7a3 3 0 1 1 0-6h2v6a3 3 0 1 0 6 0V7a3 3 0 1 1 6 0v2h-6a3 3 0 1 0 0 6h2a3 3 0 1 1 0 6h-2v-6a3 3 0 1 0-6 0v2a3 3 0 1 1-6 0v-2h6a3 3 0 1 0 0-6Z"/>,
  filter: <path d="M4 5h16M7 12h10M10 19h4"/>,
  play: <path d="m9 6 9 6-9 6z" fill="currentColor" stroke="none"/>,
  pause: <path d="M8 6v12M16 6v12"/>,
  download: <><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></>,
  external: <><path d="M14 5h5v5M19 5l-9 9"/><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></>,
  chart: <><path d="M4 19V5M4 19h16M8 16v-5M12 16V7M16 16v-8"/></>,
  alert: <><path d="M10.3 4.6 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 16h.01" strokeWidth="3"/></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/></>,
  accessibility: <><circle cx="12" cy="4" r="2"/><path d="M5 8h14M12 6v15M7.5 21 12 14l4.5 7"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
  terminal: <><path d="m5 7 4 4-4 4M12 17h7"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></>,
  arrowLeft: <path d="m14 6-6 6 6 6M8 12h11"/>,
};

export function Icon({ name, size = 20, className = '', title }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? 'img' : undefined}
      {...shared}
    >
      {paths[name] || paths.grid}
    </svg>
  );
}
