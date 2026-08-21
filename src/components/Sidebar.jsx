import { Icon } from './Icon.jsx';

const primary = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'interviews', label: 'Interviews', icon: 'calendar', badge: '4' },
  { id: 'candidate', label: 'Candidate portal', icon: 'users' },
  { id: 'studio', label: 'Live studio', icon: 'video', live: true },
  { id: 'intelligence', label: 'AI intelligence', icon: 'sparkles' },
  { id: 'data', label: 'Data pulse', icon: 'database' },
];

const platform = [
  { id: 'trust', label: 'Trust center', icon: 'shield' },
  { id: 'operations', label: 'Reliability', icon: 'activity' },
  { id: 'foundation', label: 'Control center', icon: 'layers', badge: '50' },
  { id: 'completion', label: 'Enterprise scale', icon: 'target', badge: '100' },
  { id: 'integrations', label: 'Integrations', icon: 'plug' },
  { id: 'features', label: 'Feature catalog', icon: 'layers' },
];

function NavItem({ item, activeScreen, onNavigate }) {
  const isActive = activeScreen === item.id;
  return (
    <button
      type="button"
      className={`nav-item ${isActive ? 'is-active' : ''}`}
      onClick={() => onNavigate(item.id)}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon name={item.icon} size={18} />
      <span>{item.label}</span>
      {item.live && <span className="live-dot" aria-label="Live session available" />}
      {item.badge && <span className="nav-badge">{item.badge}</span>}
    </button>
  );
}

export function Sidebar({ activeScreen, onNavigate, isOpen, onClose }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className={`sidebar-scrim ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        <div className="brand-row">
          <button className="brand" onClick={() => onNavigate('overview')} aria-label="SignalRoom overview">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
            <span>signalroom</span>
          </button>
          <button className="icon-button mobile-close" onClick={onClose} aria-label="Close menu">
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="workspace-switcher" role="button" tabIndex="0" aria-label="Current workspace: Northstar Systems">
          <span className="workspace-avatar">NS</span>
          <span className="workspace-copy"><strong>Northstar Systems</strong><small>Talent operations</small></span>
          <Icon name="chevronDown" size={16} />
        </div>

        <nav className="nav-stack">
          <p className="nav-label">WORKSPACE</p>
          {primary.map((item) => <NavItem key={item.id} item={item} activeScreen={activeScreen} onNavigate={onNavigate} />)}
          <p className="nav-label nav-label-platform">PLATFORM</p>
          {platform.map((item) => <NavItem key={item.id} item={item} activeScreen={activeScreen} onNavigate={onNavigate} />)}
        </nav>

        <div className="sidebar-bottom">
          <div className="storage-card">
            <div className="storage-card-top"><span>AI workspace</span><strong>68%</strong></div>
            <div className="mini-progress"><span style={{ width: '68%' }} /></div>
            <small>6.8K of 10K monthly minutes</small>
          </div>
          <button className="nav-item settings-nav" type="button" onClick={() => onNavigate('trust')}>
            <Icon name="settings" size={18} /><span>Workspace settings</span>
          </button>
        </div>
      </aside>
    </>
  );
}
