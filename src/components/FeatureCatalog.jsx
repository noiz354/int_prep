import { useDeferredValue, useMemo, useState } from 'react';
import { Icon } from './Icon.jsx';
import { featureCatalog, featureCategories } from '../data/features.js';
import { implementedFoundationIdSet } from '../data/implementationStatus.js';

const categoryTone = {
  'AI Agent Features': 'violet',
  'Data Engineering Features': 'sky',
  'Frontend Features': 'mint',
  'Backend & Platform Services': 'amber',
  'Security, Privacy, Compliance & Trust': 'coral',
  'DevOps, Reliability & Observability': 'indigo',
  'Enterprise Operations, Hiring Workflow & Integrations': 'green',
};

function categoryImplementationLabel(category) {
  if (category === 'Frontend Features') return 'Interactive prototype';
  if (category === 'AI Agent Features' || category === 'Data Engineering Features') return 'Adapter + mock';
  if (category === 'Security, Privacy, Compliance & Trust') return 'Policy-ready';
  return 'Service scaffold';
}

function featureImplementationLabel(feature) {
  if (implementedFoundationIdSet.has(feature.id)) return 'Implemented foundation';
  return categoryImplementationLabel(feature.category);
}

export function FeatureCatalog({ onToast }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [expanded, setExpanded] = useState('AI-01');
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => featureCatalog.filter((feature) => {
    const searchable = `${feature.id} ${feature.title} ${feature.description} ${feature.category}`.toLowerCase();
    return (category === 'All' || feature.category === category) && searchable.includes(deferredQuery.toLowerCase());
  }), [category, deferredQuery]);
  const counts = Object.fromEntries(featureCategories.map((item) => [item, featureCatalog.filter((feature) => feature.category === item).length]));

  return (
    <main className="page catalog-page">
      <section className="catalog-hero surface-card"><div><span className="pill pill-violet"><Icon name="layers" size={14} /> PRODUCT DELIVERY MAP</span><h2>A visible path from <em>ambition to implementation.</em></h2><p>The full 100-feature PRD is mapped into a modular vertical slice. Every entry has an owner-friendly domain and an explicit current implementation level.</p></div><div className="catalog-count"><span>PRD FEATURES</span><strong>100</strong><p>{implementedFoundationIdSet.size} implemented foundations · 7 domains</p><div className="catalog-dot-row">{featureCategories.map((item) => <i key={item} className={`catalog-dot dot-${categoryTone[item]}`} title={item} />)}</div></div></section>
      <section className="catalog-summary-grid">{featureCategories.map((item) => <button className={`catalog-summary-card summary-${categoryTone[item]} ${category === item ? 'is-selected' : ''}`} key={item} onClick={() => setCategory(category === item ? 'All' : item)}><span>{item.replace(' Features', '').replace(', Privacy, Compliance & Trust', '')}</span><strong>{counts[item]}</strong><small>{categoryImplementationLabel(item)}</small><i /></button>)}</section>
      <section className="surface-card catalog-list-card"><div className="catalog-list-top"><div><span className="section-kicker">FEATURE INVENTORY</span><h2>{results.length} matching {results.length === 1 ? 'capability' : 'capabilities'}</h2></div><div className="catalog-search"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search IDs, capabilities, or descriptions" aria-label="Search the feature catalog" />{query && <button onClick={() => setQuery('')} aria-label="Clear feature search"><Icon name="x" size={15} /></button>}</div></div><div className="catalog-filter-row"><button className={`filter-chip ${category === 'All' ? 'is-active' : ''}`} onClick={() => setCategory('All')}>All features</button>{featureCategories.map((item) => <button className={`filter-chip ${category === item ? 'is-active' : ''}`} key={item} onClick={() => setCategory(item)}>{item.replace(' Features', '')} <span>{counts[item]}</span></button>)}</div><div className="feature-list">{results.map((feature) => { const isExpanded = expanded === feature.id; const tone = categoryTone[feature.category]; const isFoundation = implementedFoundationIdSet.has(feature.id); const implementationTone = isFoundation ? 'mint' : tone; return <article className={`feature-row ${isExpanded ? 'is-expanded' : ''}`} key={feature.id}><button className="feature-row-main" onClick={() => setExpanded(isExpanded ? '' : feature.id)} aria-expanded={isExpanded}><span className={`feature-id feature-${tone}`}>{feature.id}</span><span className="feature-title-wrap"><b>{feature.title}</b><small>{feature.category}</small></span><span className={`implementation-tag tag-${implementationTone}`}>{featureImplementationLabel(feature)}</span><Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={18} /></button>{isExpanded && <div className="feature-detail"><p>{feature.description}</p><div><span><Icon name="layers" size={14} /> Modular boundary defined</span><span><Icon name="shield" size={14} /> Tenant-aware by design</span><button className="text-button" onClick={() => onToast(`${feature.id} was added to the next implementation review.`)}>Add to review <Icon name="plus" size={14} /></button></div></div>}</article>; })}</div>{results.length === 0 && <div className="catalog-empty"><Icon name="search" size={28} /><h3>No feature found</h3><p>Try a different ID, domain, or keyword.</p><button className="button button-secondary" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button></div>}</section>
    </main>
  );
}
