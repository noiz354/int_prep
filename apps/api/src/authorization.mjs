const rolePermissions = {
  talent_ops_lead: new Set([
    'organization:read', 'feature:read', 'interview:read', 'interview:create',
    'interview:room:join', 'scorecard:submit', 'consent:write', 'audit:read',
    'event:read', 'presence:connect', 'ai:use', 'artifact:read', 'artifact:write',
    'workflow:read', 'workflow:write', 'featureflag:read', 'featureflag:write',
    'data:operate', 'analytics:read', 'operations:read', 'operations:write',
    'security:read', 'privacy:redact', 'webhook:write',
    'schedule:read', 'schedule:write', 'calendar:sync', 'invitation:write',
    'invitation:read', 'search:read', 'notification:write', 'notification:read',
    'media:provision', 'media:control', 'media:join', 'whiteboard:control',
    'media:enhance',
    'security:stepup', 'security:rotate', 'security:dlp', 'security:waf',
    'security:evidence', 'security:dr', 'delivery:iac', 'delivery:release',
  ]),
  interviewer: new Set(['feature:read', 'interview:read', 'interview:room:join', 'scorecard:submit', 'consent:write', 'presence:connect', 'ai:use', 'artifact:read', 'schedule:read', 'invitation:read', 'search:read', 'notification:read', 'media:provision', 'media:control', 'media:join', 'whiteboard:control', 'media:enhance']),
  candidate: new Set(['interview:read:assigned', 'interview:room:join:assigned', 'consent:write:assigned', 'presence:connect', 'invitation:read:assigned']),
  privacy_admin: new Set(['organization:read', 'audit:read', 'consent:write', 'feature:read', 'security:read', 'privacy:redact', 'data:operate', 'operations:read', 'search:read', 'notification:read', 'security:stepup', 'security:rotate', 'security:dlp', 'security:evidence', 'security:dr']),
};

export function hasPermission(principal, permission, resource = {}) {
  if (!principal?.roles?.length) return false;
  if (principal.roles.some((role) => rolePermissions[role]?.has(permission))) return true;
  const assigned = principal.attributes?.assignedInterviews || [];
  if (permission === 'interview:read' && principal.roles.includes('candidate')) return assigned.includes(resource.interviewId);
  if (permission === 'interview:room:join' && principal.roles.includes('candidate')) return assigned.includes(resource.interviewId);
  if (permission === 'consent:write' && principal.roles.includes('candidate')) return assigned.includes(resource.interviewId);
  return false;
}

export function requirePermission(permission, resolveResource = () => ({})) {
  return (req, res, next) => {
    const resource = resolveResource(req);
    if (!hasPermission(req.principal, permission, resource)) {
      return res.status(403).json({ error: 'You do not have permission for this action' });
    }
    return next();
  };
}

export function tenantFor(principal, requestedTenant) {
  if (!principal?.tenantId) return null;
  if (requestedTenant && requestedTenant !== principal.tenantId) return null;
  return principal.tenantId;
}
