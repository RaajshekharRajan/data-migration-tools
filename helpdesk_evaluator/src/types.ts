// --- 1. CORE TYPES ---

// Represents the complexity/level of a feature
export type Tier = "basic" | "standard" | "advanced" | "enterprise" | "add-on";

// The standard structure for every single feature checkbox
export interface Feature {
  included: boolean;
  tier?: Tier;             // Badge text (e.g., "Enterprise")
  limit?: string | number; // e.g., "5000/mo" or "5 Users"
  display_text?: string;   // Override label (e.g., "Via Integration" instead of "Yes")
  details?: string[];      // Bullet points for deep-dive tooltips
  tooltip?: string;        // Short hover explanation
}

// --- 2. CATEGORY INTERFACES (The 8 Pillars) ---

export interface ChannelFeatures {
  email: Feature;
  voice: Feature;
  chat: Feature;
  sms: Feature;
  whatsapp: Feature;
  social: Feature; // Instagram, Messenger, X, etc.
  customer_portal: Feature;
}

export interface AIFeatures {
  generative_drafts: Feature;    // AI writing assistants (rephrase, expand)
  summarization: Feature;        // Conversation summaries
  sentiment_analysis: Feature;   // Customer mood detection
  live_translation: Feature;     // Real-time language translation
  auto_triage: Feature;          // AI tagging/routing
  resolution_bot: Feature;       // Customer-facing chatbots (deflection)
  agent_copilot: Feature;        // Internal agent assist bots
}

export interface RoutingFeatures {
  automation_workflows: Feature; // Triggers/Automations
  sla_management: Feature;       // Service Level Agreements
  macros: Feature;               // Canned Responses
  round_robin: Feature;          // Auto-assignment
  skill_based: Feature;          // Routing by expertise
  business_hours: Feature;       // Timezone specific schedules
}

export interface SelfServiceFeatures {
  knowledge_base: Feature;
  community_forums: Feature;
  portal_customization: Feature; // CSS/HTML control
  multi_brand: Feature;          // Managing multiple help centers
  article_versioning: Feature;   // History tracking
}

export interface ReportingFeatures {
  prebuilt_dashboards: Feature;
  custom_builder: Feature;       // Drag-and-drop report creator
  scheduled_exports: Feature;    // PDF/CSV emailing
  real_time: Feature;            // Live wallboards
  agent_activity: Feature;       // Log of specific agent actions
}

export interface SecurityFeatures {
  sso: Feature;                  // Single Sign-On (SAML/JWT)
  ip_restriction: Feature;       // VPN locking/Whitelisting
  custom_roles: Feature;         // RBAC (Granular permissions)
  audit_logs: Feature;           // Admin activity tracking
  hipaa: Feature;                // Healthcare compliance
  data_locality: Feature;        // EU vs US hosting options
}

export interface PlatformFeatures {
  custom_objects: Feature;       // Storing non-ticket data (Orders/Assets)
  sandbox: Feature;              // Testing environment
  api_access: Feature;           // Full API availability
  native_salesforce: Feature;    // Deep 2-way sync
  native_jira: Feature;          // Dev tool integration
}

export interface SupportFeatures {
  email_support: Feature;
  chat_support: Feature;
  phone_support: Feature;
  dedicated_csm: Feature;        // Customer Success Manager
  onboarding_services: Feature;  // Implementation packages
}

// --- 3. MAIN PLAN INTERFACE ---

export interface Plan {
  id: string;
  brand_name: string;
  plan_name: string;
  brand_color: string;
  official_url: string;
  
  // RUNTIME FIELDS (Calculated dynamically in page.tsx)
  matchScore?: number; 
  missingFeatures?: string[]; // For the "Why this score?" tooltip
  annualCost?: number; 

  // PRICING ENGINE
  pricing: {
    cost_per_agent: number;
    currency: string;
    period: "monthly" | "annual";
    model: "per_agent" | "flat_fee" | "per_seat" | "per_user"; 
  };

  // LIMITS & CONSTRAINTS
  constraints: {
    ticket_limit?: string | number; // "Unlimited" or specific number
    min_seats?: number;
    max_seats?: number;
    tooltip?: string;
  };

  // THE 8 FEATURE PILLARS
  channels: ChannelFeatures;
  ai: AIFeatures;
  routing: RoutingFeatures;
  self_service: SelfServiceFeatures;
  reporting: ReportingFeatures;
  security: SecurityFeatures;
  platform: PlatformFeatures;
  vendor_support: SupportFeatures; 
}