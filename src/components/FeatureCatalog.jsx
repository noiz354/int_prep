import { useDeferredValue, useMemo, useState } from 'react';
import { Icon } from './Icon.jsx';
import { featureCatalog, featureCategories } from '../data/features.js';
import {
  getCapability,
  IMPLEMENTATION_STATES,
  STATE_ORDER,
  stateLabel,
  stateTone,
  summarizeByState,
} from '../data/capabilityRegistry.js';
import { CapabilityTruthBar } from './CapabilityTruthBar.jsx';

const categoryTone = {
  'AI Agent Features': 'violet',
  'Data Engineering Features': 'sky',
  'Frontend Features': 'mint',
  'Backend & Platform Services': 'amber',
  'Security, Privacy, Compliance & Trust': 'coral',
  'DevOps, Reliability & Observability': 'indigo',
  'Enterprise Operations, Hiring Workflow & Integrations': 'green',
};

export function FeatureCatalog({ onToast }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [expanded, setExpanded] = useState('AI-01');
  const deferredQuery = useDeferredValue(query);
  const interviewSummary = summarizeByState('interview');

  const results = useMemo(() => featureCatalog.filter((feature) => {
    const record = getCapability(feature.id);
    const searchable = `${feature.id} ${feature.title} ${feature.description} ${feature.category} ${record?.state ?? ''}`.toLowerCase();
    const matchesCategory = category === 'All' || feature.category === category;
    const matchesState = stateFilter === 'All' || record?.state === stateFilter;
    return matchesCategory && matchesState && searchable.includes(deferredQuery.toLowerCase());
  }), [category, deferredQuery, stateFilter]);

  const counts = Object.fromEntries(featureCategories.map((item) => [item, featureCatalog.filter((feature) => feature.category === item).length]));

  return (
    <main className="page catalog-page">
      <section className="catalog-hero surface-card">
        <div>
          <span className="pill pill-amber"><Icon name="layers" size={14} /> HONEST DELIVERY MAP</span>
          <h2>Every PRD item has an adapter. <em>None are staging or production.</em></h2>
          <p>U0–U7 is a local launch bar. Mocked UI, file-store APIs, and missing providers stay labelled. User-usable count is zero until a provider is up and UAT’d.</p>
        </div>
        <div className="catalog-count">
          <span>PRD FEATURES</span>
          <strong>100</strong>
          <p>{interviewSummary.userUsable} user-usable · {interviewSummary.counts.local_only} local only · {interviewSummary.counts.mocked} mocked</p>
          <div className="catalog-dot-row">{featureCategories.map((item) => <i key={item} className={`catalog-dot dot-${categoryTone[item]}`} title={item} />)}</div>
        </div>
      </section>

      <CapabilityTruthBar product="interview" />

      <section className="catalog-summary-grid">{featureCategories.map((item) => (
        <button className={`catalog-summary-card summary-${categoryTone[item]} ${category === item ? 'is-selected' : ''}`} key={item} onClick={() => setCategory(category === item ? 'All' : item)}>
          <span>{item.replace(' Features', '').replace(', Privacy, Compliance & Trust', '')}</span>
          <strong>{counts[item]}</strong>
          <small>See per-ID state</small>
          <i />
        </button>
      ))}</section>

      <section className="surface-card catalog-list-card">
        <div className="catalog-list-top">
          <div>
            <span className="section-kicker">FEATURE INVENTORY</span>
            <h2>{results.length} matching {results.length === 1 ? 'capability' : 'capabilities'}</h2>
          </div>
          <div className="catalog-search">
            <Icon name="search" size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search IDs, capabilities, or descriptions" aria-label="Search the feature catalog" />
            {query && <button onClick={() => setQuery('')} aria-label="Clear feature search"><Icon name="x" size={15} /></button>}
          </div>
        </div>
        <div className="catalog-filter-row">
          <button className={`filter-chip ${category === 'All' && stateFilter === 'All' ? 'is-active' : ''}`} onClick={() => { setCategory('All'); setStateFilter('All'); }}>All features</button>
          {STATE_ORDER.map((state) => (
            <button key={state} className={`filter-chip ${stateFilter === state ? 'is-active' : ''}`} onClick={() => setStateFilter(stateFilter === state ? 'All' : state)}>
              {IMPLEMENTATION_STATES[state].label} <span>{interviewSummary.counts[state]}</span>
            </button>
          ))}
        </div>
        <div className="catalog-filter-row">
          {featureCategories.map((item) => (
            <button className={`filter-chip ${category === item ? 'is-active' : ''}`} key={item} onClick={() => setCategory(item)}>
              {item.replace(' Features', '')} <span>{counts[item]}</span>
            </button>
          ))}
        </div>
        <div className="feature-list">
          {results.map((feature) => {
            const isExpanded = expanded === feature.id;
            const tone = categoryTone[feature.category];
            const record = getCapability(feature.id);
            const implementationTone = stateTone(record?.state);
            return (
              <article className={`feature-row ${isExpanded ? 'is-expanded' : ''}`} key={feature.id}>
                <button className="feature-row-main" onClick={() => setExpanded(isExpanded ? '' : feature.id)} aria-expanded={isExpanded}>
                  <span className={`feature-id feature-${tone}`}>{feature.id}</span>
                  <span className="feature-title-wrap">
                    <b>{feature.title}</b>
                    <small>{feature.category}</small>
                  </span>
                  <span className={`implementation-tag tag-${implementationTone}`}>{stateLabel(record?.state)}</span>
                  <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} size={18} />
                </button>
                {isExpanded && (
                  <div className="feature-detail">
                    <p>{feature.description}</p>
                    <p className="feature-user-can">{record?.userCan}</p>
                    <div>
                      <span><Icon name="layers" size={14} /> Next phase {record?.nextPhase}</span>
                      <span><Icon name="shield" size={14} /> Gate: {(record?.productionGate ?? 'blocked_on_decision').replaceAll('_', ' ')}</span>
                      {record?.auditIds?.length ? <span>Audit {record.auditIds.join(', ')}</span> : null}
                      <button className="text-button" onClick={() => onToast(`${feature.id} was added to the next implementation review.`)}>Add to review <Icon name="plus" size={14} /></button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {results.length === 0 && (
          <div className="catalog-empty">
            <Icon name="search" size={28} />
            <h3>No feature found</h3>
            <p>Try a different ID, domain, state, or keyword.</p>
            <button className="button button-secondary" onClick={() => { setQuery(''); setCategory('All'); setStateFilter('All'); }}>Clear filters</button>
          </div>
        )}
      </section>
    </main>
  );
}
