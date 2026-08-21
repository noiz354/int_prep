import { Icon } from './Icon.jsx';

const labels = {
  overview: ['Overview', 'Your interview operations at a glance'],
  interviews: ['Interviews', 'Plan, run, and review every conversation'],
  candidate: ['Candidate portal', 'A clear, consent-aware experience before the interview'],
  studio: ['Live studio', 'Private interview workspace · Alex Morgan'],
  intelligence: ['AI intelligence', 'Evidence-based assistance with a human in control'],
  data: ['Data pulse', 'Governed event streams and hiring intelligence'],
  trust: ['Trust center', 'Privacy, consent, security, and AI governance'],
  operations: ['Reliability', 'Service health, delivery, and operational readiness'],
  foundation: ['Control center', 'Workflow, data, release, governance, and operating controls'],
  completion: ['Enterprise scale', 'Provider-ready adapters across the remaining platform capabilities'],
  integrations: ['Integrations', 'Connect your hiring ecosystem'],
  features: ['Feature catalog', 'A transparent map of the 100-feature product plan'],
};

export function Topbar({ activeScreen, darkMode, principal, onLogout, onToggleTheme, onOpenMenu, onOpenCommand, onCreateInterview }) {
  const [title, subtitle] = labels[activeScreen] || labels.overview;
  const initials = (principal?.name || 'Guest').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar-title-group">
        <button className="icon-button mobile-menu" onClick={onOpenMenu} aria-label="Open menu">
          <Icon name="menu" size={21} />
        </button>
        <div>
          <div className="eyebrow">NORTHSTAR SYSTEMS / TALENT OS</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="quick-search" onClick={onOpenCommand} aria-label="Search or open command menu">
          <Icon name="search" size={18} />
          <span>Search anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="icon-button desktop-action" onClick={onToggleTheme} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}>
          <Icon name={darkMode ? 'sun' : 'moon'} size={19} />
        </button>
        <button className="icon-button desktop-action notification-button" aria-label="Notifications, 3 unread">
          <Icon name="bell" size={19} />
          <span className="notification-ping" />
        </button>
        <button className="create-button" onClick={onCreateInterview}>
          <Icon name="plus" size={18} /><span>New interview</span>
        </button>
        {onLogout && <button className="text-button" onClick={onLogout}>Sign out</button>}
        <button className="user-avatar" aria-label={principal ? `${principal.name} account` : 'Account'}>{initials}</button>
      </div>
    </header>
  );
}
