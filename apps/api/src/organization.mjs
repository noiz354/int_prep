export const northstarOrganization = {
  id: 'org-northstar',
  tenantId: 'northstar',
  name: 'Northstar Systems',
  plan: 'Enterprise',
  dataRegion: 'ap-southeast-1',
  units: [
    { id: 'unit-talent', name: 'Talent Operations', children: [{ id: 'team-product', name: 'Product & Engineering Hiring' }, { id: 'team-data', name: 'Data Hiring' }] },
    { id: 'unit-trust', name: 'Trust & Governance', children: [{ id: 'team-privacy', name: 'Privacy Office' }] },
  ],
};
