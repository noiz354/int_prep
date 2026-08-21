// Canonical PRD IDs represented by working local foundations or provider-ready adapters.
// Keep this list, Feature Catalog labels, docs/BATCH-100-FEATURES.md, and progess.md in sync.
export const implementedFoundationIds = [
  // AI Agent Features (15)
  'AI-01', 'AI-02', 'AI-03', 'AI-04', 'AI-05', 'AI-06', 'AI-07', 'AI-08', 'AI-09', 'AI-10', 'AI-11', 'AI-12', 'AI-13', 'AI-14', 'AI-15',
  // Data Engineering Features (15)
  'DE-01', 'DE-02', 'DE-03', 'DE-04', 'DE-05', 'DE-06', 'DE-07', 'DE-08', 'DE-09', 'DE-10', 'DE-11', 'DE-12', 'DE-13', 'DE-14', 'DE-15',
  // Frontend Features (15)
  'FE-01', 'FE-02', 'FE-03', 'FE-04', 'FE-05', 'FE-06', 'FE-07', 'FE-08', 'FE-09', 'FE-10', 'FE-11', 'FE-12', 'FE-13', 'FE-14', 'FE-15',
  // Backend & Platform Services (14)
  'BE-01', 'BE-02', 'BE-03', 'BE-04', 'BE-05', 'BE-06', 'BE-07', 'BE-08', 'BE-09', 'BE-10', 'BE-11', 'BE-12', 'BE-13', 'BE-14',
  // Security, Privacy, Compliance & Trust (14)
  'SC-01', 'SC-02', 'SC-03', 'SC-04', 'SC-05', 'SC-06', 'SC-07', 'SC-08', 'SC-09', 'SC-10', 'SC-11', 'SC-12', 'SC-13', 'SC-14',
  // DevOps, Reliability & Observability (14)
  'DO-01', 'DO-02', 'DO-03', 'DO-04', 'DO-05', 'DO-06', 'DO-07', 'DO-08', 'DO-09', 'DO-10', 'DO-11', 'DO-12', 'DO-13', 'DO-14',
  // Enterprise Operations, Hiring Workflow & Integrations (13)
  'EO-01', 'EO-02', 'EO-03', 'EO-04', 'EO-05', 'EO-06', 'EO-07', 'EO-08', 'EO-09', 'EO-10', 'EO-11', 'EO-12', 'EO-13',
];

export const implementedFoundationIdSet = new Set(implementedFoundationIds);
