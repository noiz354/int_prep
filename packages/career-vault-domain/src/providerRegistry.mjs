// Provider registry for the Career Vault bounded context.
// Every external capability is an opt-in connection. Candidates can disable a
// connection now (it stops affecting behavior immediately) or connect it when
// the provider becomes available. Providers that need a decision/credentials are
// reported as blocked_on_provider_decision with a truthful reason.

export const PROVIDER_CATALOG = [
  { id: 'rag_coach', label: 'RAG Career Coach', capability: 'Cited answers and seven-day plans over candidate-owned records (local deterministic retrieval)', provider: 'Local scaffold', status: 'available', scope: 'candidate-authorized retrieval only', requires: 'none for local scaffold', connectable: true, defaultEnabled: true },
  { id: 'email', label: 'Email import', capability: 'Import application receipts and recruiter messages with review-before-save', provider: 'Gmail / Microsoft OAuth', status: 'available', scope: 'application receipts and recruiter messages only', requires: 'OAuth app credentials', connectable: true, defaultEnabled: false },
  { id: 'calendar', label: 'Calendar sync', capability: 'Import interview, coach, and deadline events (review-before-save)', provider: 'Google / Microsoft Calendar', status: 'available', scope: 'candidate-selected events only', requires: 'OAuth app credentials', connectable: true, defaultEnabled: false },
  { id: 'notifications', label: 'Reminders & follow-ups', capability: 'Candidate-consented reminders for deadlines and follow-up actions', provider: 'Email / in-app', status: 'available', scope: 'candidate-consented reminders only', requires: 'notification provider decision', connectable: true, defaultEnabled: false },
  { id: 'object_storage', label: 'Encrypted artifact storage', capability: 'Store candidate-owned recordings, transcripts, and documents at rest', provider: 'S3 / MinIO / GCS', status: 'blocked_on_provider_decision', scope: 'candidate-owned artifacts only', requires: 'storage account + KMS key + retention policy', connectable: false, defaultEnabled: false },
  { id: 'vector_index', label: 'Vector retrieval index', capability: 'Embedding-based retrieval for the RAG Career Coach', provider: 'Qdrant / Pinecone / Weaviate', status: 'blocked_on_provider_decision', scope: 'candidate-tenant isolated index only', requires: 'vector provider + embedding model + tenant isolation policy', connectable: false, defaultEnabled: false },
  { id: 'model_gateway', label: 'AI model gateway', capability: 'Grounded RAG answers and plans with approved model + evaluation', provider: 'Azure OpenAI / Anthropic / Ollama', status: 'blocked_on_provider_decision', scope: 'candidate-authorized retrieval only', requires: 'model provider + prompt/rubric versioning + red-team evaluation', connectable: false, defaultEnabled: false },
];

export function createProviderRegistry() {
  const states = new Map(PROVIDER_CATALOG.map((provider) => [provider.id, { enabled: provider.defaultEnabled }]));
  const audit = [];

  const record = (action, providerId, tenantId, candidateId, metadata = {}) => {
    const entry = { id: `cv-provider-${crypto.randomUUID().slice(0, 8)}`, action, providerId, tenantId, candidateId, metadata, at: new Date().toISOString() };
    audit.unshift(entry);
    return entry;
  };

  return {
    list({ tenantId, candidateId }) {
      return PROVIDER_CATALOG.map((provider) => {
        const state = states.get(provider.id);
        const blocked = provider.status === 'blocked_on_provider_decision';
        return {
          ...provider,
          enabled: state.enabled,
          available: !blocked,
          action: state.enabled ? 'disable' : blocked ? 'blocked' : 'connect',
          reason: blocked ? `Requires ${provider.requires}. Select a provider before this connection can be enabled.` : state.enabled ? 'This connection is active for candidate-owned data only.' : 'Not connected. Enable it to allow this capability to process candidate-authorized data.',
        };
      });
    },

    setEnabled({ tenantId, candidateId, providerId, enabled }) {
      const provider = PROVIDER_CATALOG.find((item) => item.id === providerId);
      if (!provider) throw new Error('Unknown provider.');
      if (enabled && provider.status === 'blocked_on_provider_decision') {
        throw new Error(`Cannot enable '${provider.label}' until a provider is selected (${provider.requires}).`);
      }
      states.set(providerId, { enabled });
      record(enabled ? 'provider.enabled' : 'provider.disabled', providerId, tenantId, candidateId);
      return this.list({ tenantId, candidateId }).find((item) => item.id === providerId);
    },

    isEnabled(providerId) {
      return states.get(providerId)?.enabled === true;
    },

    audit({ tenantId }) {
      return audit.filter((entry) => entry.tenantId === tenantId);
    },
  };
}
