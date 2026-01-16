import { PlatformType, PlatformConfig, DataEntity } from '../types';

export const PLATFORMS: Record<PlatformType, PlatformConfig> = {
  zendesk: {
    id: 'zendesk',
    name: 'Zendesk Support',
    plans: {
      growth: { requestsPerMinute: 400, exportLimit: 10 },
      professional: { requestsPerMinute: 400, exportLimit: 10 },
      enterprise: { requestsPerMinute: 700, exportLimit: 10 },
    },
    capabilities: {
      export: [
        'tickets', 'users', 'organizations', 'groups', 'articles', 
        'macros', 'triggers', 'automations', 'tags', 'custom_fields', 
        'ticket_forms', 'sla_policies'
      ],
      import: [
        'tickets', 'users', 'organizations', 'groups', 'articles', 
        'macros', 'tags', 'custom_fields'
      ],
    },
    features: {
      batchSize: 100,
      complexityMultiplier: 1.2,
    },
    limits: {
      maxAttachmentSizeMB: 50,
      throughputBuffer: 0.15,
    },
  },
  freshdesk: {
    id: 'freshdesk',
    name: 'Freshdesk',
    plans: {
      growth: { requestsPerMinute: 200, createTicketLimit: 80 },
      professional: { requestsPerMinute: 400, createTicketLimit: 160 },
      enterprise: { requestsPerMinute: 700, createTicketLimit: 280 },
    },
    capabilities: {
      export: [
        'tickets', 'users', 'organizations', 'groups', 'articles', 
        'macros', 'tags', 'custom_fields'
      ],
      import: [
        'tickets', 'users', 'organizations', 'groups', 'articles', 
        'tags', 'custom_fields'
      ],
    },
    features: {
      batchSize: 1,
      complexityMultiplier: 2.5,
    },
    limits: {
      maxAttachmentSizeMB: 20,
      throughputBuffer: 0.20,
    },
  },
};

export const ENTITY_LABELS: Record<DataEntity, string> = {
  tickets: 'Tickets & Conversations',
  users: 'Users (Agents & Customers)',
  organizations: 'Organizations',
  groups: 'Groups / Teams',
  articles: 'Knowledge Base',
  macros: 'Macros / Canned Responses',
  triggers: 'Triggers',
  automations: 'Automations',
  tags: 'Tags',
  custom_fields: 'Custom Fields',
  ticket_forms: 'Ticket Forms',
  sla_policies: 'SLA Policies',
};

// --- NEW: Visual Aid Descriptions ---
export const ENTITY_DESCRIPTIONS: Record<DataEntity, string> = {
  tickets: 'Core support records including status, priority, comments, and file attachments.',
  users: 'Profiles for both Support Agents and End-Users (Customers).',
  organizations: 'Company profiles that group multiple users together.',
  groups: 'Agent teams or departments (e.g., "Sales", "Support").',
  articles: 'Public or private help center documentation and categories.',
  macros: 'Pre-written responses used by agents to reply quickly.',
  triggers: '"If-This-Then-That" rules that run immediately on ticket updates.',
  automations: 'Time-based rules (e.g., "Close ticket after 4 days of inactivity").',
  tags: 'Labels attached to tickets for categorization and reporting.',
  custom_fields: 'Non-standard data fields added to tickets or user profiles.',
  ticket_forms: 'Different ticket layouts presented to customers based on request type.',
  sla_policies: 'Service Level Agreement rules defining response/resolution deadlines.',
};