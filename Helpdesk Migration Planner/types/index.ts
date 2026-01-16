// src/types/index.ts

export type PlatformType = 'zendesk' | 'freshdesk';
export type PlanType = 'growth' | 'professional' | 'enterprise';

// Expanded list of all possible helpdesk data types
export type DataEntity = 
  | 'tickets' 
  | 'users' 
  | 'organizations' 
  | 'groups' 
  | 'articles' 
  | 'macros' 
  | 'triggers' 
  | 'automations'
  | 'tags'
  | 'custom_fields'
  | 'ticket_forms'
  | 'sla_policies';

export interface PlanLimits {
  requestsPerMinute: number;
  createTicketLimit?: number;
  exportLimit?: number; 
}

export interface PlatformConfig {
  id: PlatformType;
  name: string;
  plans: Record<PlanType, PlanLimits>;
  
  // Detailed capabilities lists
  capabilities: {
    export: DataEntity[]; 
    import: DataEntity[]; 
  };

  features: {
    batchSize: number; 
    complexityMultiplier: number; 
  };
  limits: {
    maxAttachmentSizeMB: number;
    throughputBuffer: number; 
  };
}

export interface CalculatorInputs {
  source: PlatformType;
  sourcePlan: PlanType;
  destination: PlatformType;
  destPlan: PlanType;
  
  // The items the user explicitly chose to migrate
  selectedEntities: DataEntity[]; 
  
  // Dynamic map of volumes (e.g., { tickets: 1000, users: 500 })
  volumes: Partial<Record<DataEntity, number>>;

  // Complexity specifics
  avgAttachmentsPerTicket: number;
  avgAttachmentSizeMB: number;
}

export interface TimelineResult {
  totalDurationHours: number; // The "Likely" scenario
  
  // NEW: Confidence Bands
  minDurationHours: number; // Best case (Optimistic)
  maxDurationHours: number; // Worst case (Conservative)
  
  // High-level grouping for the progress bar
  breakdown: {
    foundation: number; // Users, Orgs, Groups, etc.
    coreData: number;   // Tickets
    attachments: number;// Files
  };

  // Detailed breakdown per entity
  entityBreakdown: Partial<Record<DataEntity, number>>;

  bottleneck: string; 
  riskLevel: 'Low' | 'Medium' | 'High';
  
  apiTasks: string[];
  manualTasks: string[];
}