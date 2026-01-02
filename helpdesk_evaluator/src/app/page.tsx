"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Check, X, ShieldCheck, Star, AlertTriangle, RefreshCcw, 
  Search, SlidersHorizontal, ArrowRight, ChevronDown, 
  Plus, Minus, XCircle, Users, Download, Share2, ExternalLink, Info,
  ChevronUp, Lock, BarChart2, Table as TableIcon
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

import plansData from "../data/plans.json"; 
import { Plan, Feature } from "../types"; 

// --- HELPER: PRICING ENGINE ---
const calculateAnnualCost = (plan: Plan, teamSize: number) => {
  if (plan.pricing.model === "flat_fee") {
    return plan.pricing.cost_per_agent * 12; 
  }
  return plan.pricing.cost_per_agent * teamSize * 12;
};

// --- HELPER: CALCULATE CATEGORY SCORES FOR SPIDER CHART ---
const calculateCategoryScores = (plan: Plan) => {
  const score = (features: any[]) => {
    const total = features.length;
    const included = features.filter(f => f?.included).length;
    return Math.round((included / total) * 100);
  };

  return {
    "AI & Intel": score(Object.values(plan.ai)),
    "Channels": score(Object.values(plan.channels)),
    "Security": score(Object.values(plan.security)),
    "Reporting": score(Object.values(plan.reporting)),
    "Support": score(Object.values(plan.vendor_support)),
    "Platform": score(Object.values(plan.platform)),
  };
};

// --- HELPER: MATCH SCORE & MISSING FEATURES ---
const analyzeMatch = (plan: Plan, currentFilters: any) => {
  const activeFilters = Object.entries(currentFilters).filter(([key, isActive]) => isActive && key !== 'budget');
  
  if (activeFilters.length === 0) return { score: 100, missing: [] }; 

  let matches = 0;
  const missing: string[] = [];

  activeFilters.forEach(([key]) => {
     let isMatch = false;
     let label = key.replace(/_/g, " ");

     // 1. CHANNELS
     if (key === 'email') { isMatch = plan.channels.email?.included; label = "Email Channel"; }
     else if (key === 'voice') { isMatch = plan.channels.voice?.included; label = "Voice"; }
     else if (key === 'chat') { isMatch = plan.channels.chat?.included; label = "Live Chat"; }
     else if (key === 'sms') { isMatch = plan.channels.sms?.included; label = "SMS"; }
     else if (key === 'whatsapp') { isMatch = plan.channels.whatsapp?.included; label = "WhatsApp"; }
     else if (key === 'social') { isMatch = plan.channels.social?.included; label = "Social Media"; }
     else if (key === 'portal') { isMatch = plan.channels.customer_portal?.included; label = "Customer Portal"; }

     // 2. AI
     else if (key === 'ai_gen') { isMatch = plan.ai.generative_drafts?.included; label = "Generative Drafts"; }
     else if (key === 'ai_sum') { isMatch = plan.ai.summarization?.included; label = "Summarization"; }
     else if (key === 'ai_sent') { isMatch = plan.ai.sentiment_analysis?.included; label = "Sentiment Analysis"; }
     else if (key === 'ai_trans') { isMatch = plan.ai.live_translation?.included; label = "Live Translation"; }
     else if (key === 'ai_triage') { isMatch = plan.ai.auto_triage?.included; label = "Auto Triage"; }
     else if (key === 'ai_bot') { isMatch = plan.ai.resolution_bot?.included; label = "Resolution Bot"; }
     else if (key === 'ai_copilot') { isMatch = plan.ai.agent_copilot?.included; label = "Agent Copilot"; }

     // 3. ROUTING
     else if (key === 'rt_auto') { isMatch = plan.routing.automation_workflows?.included; label = "Workflows"; }
     else if (key === 'rt_sla') { isMatch = plan.routing.sla_management?.included; label = "SLA Management"; }
     else if (key === 'rt_macro') { isMatch = plan.routing.macros?.included; label = "Macros"; }
     else if (key === 'rt_rr') { isMatch = plan.routing.round_robin?.included; label = "Round Robin"; }
     else if (key === 'rt_skill') { isMatch = plan.routing.skill_based?.included; label = "Skill Routing"; }
     else if (key === 'rt_biz') { isMatch = plan.routing.business_hours?.included; label = "Business Hours"; }

     // 4. SELF SERVICE
     else if (key === 'ss_kb') { isMatch = plan.self_service.knowledge_base?.included; label = "Knowledge Base"; }
     else if (key === 'ss_forum') { isMatch = plan.self_service.community_forums?.included; label = "Forums"; }
     else if (key === 'ss_style') { isMatch = plan.self_service.portal_customization?.included; label = "Portal Customization"; }
     else if (key === 'ss_brand') { isMatch = plan.self_service.multi_brand?.included; label = "Multi-brand"; }

     // 5. REPORTING
     else if (key === 'rpt_custom') { isMatch = plan.reporting.custom_builder?.included; label = "Custom Reports"; }
     else if (key === 'rpt_sched') { isMatch = plan.reporting.scheduled_exports?.included; label = "Scheduled Exports"; }
     else if (key === 'rpt_real') { isMatch = plan.reporting.real_time?.included; label = "Real-time Dash"; }
     else if (key === 'rpt_agent') { isMatch = plan.reporting.agent_activity?.included; label = "Agent Logs"; }

     // 6. SECURITY
     else if (key === 'sec_sso') { isMatch = plan.security.sso?.included; label = "SSO"; }
     else if (key === 'sec_ip') { isMatch = plan.security.ip_restriction?.included; label = "IP Restriction"; }
     else if (key === 'sec_role') { isMatch = plan.security.custom_roles?.included; label = "Custom Roles"; }
     else if (key === 'sec_audit') { isMatch = plan.security.audit_logs?.included; label = "Audit Logs"; }
     else if (key === 'sec_hipaa') { isMatch = plan.security.hipaa?.included; label = "HIPAA"; }
     else if (key === 'sec_data') { isMatch = plan.security.data_locality?.included; label = "Data Locality"; }

     // 7. PLATFORM
     else if (key === 'plt_obj') { isMatch = plan.platform.custom_objects?.included; label = "Custom Objects"; }
     else if (key === 'plt_sand') { isMatch = plan.platform.sandbox?.included; label = "Sandbox"; }
     else if (key === 'plt_api') { isMatch = plan.platform.api_access?.included; label = "API Access"; }
     else if (key === 'plt_sf') { isMatch = plan.platform.native_salesforce?.included; label = "Salesforce Sync"; }
     else if (key === 'plt_jira') { isMatch = plan.platform.native_jira?.included; label = "Jira Sync"; }

     // 8. SUPPORT
     else if (key === 'sup_phone') { isMatch = plan.vendor_support.phone_support?.included; label = "Phone Support"; }
     else if (key === 'sup_csm') { isMatch = plan.vendor_support.dedicated_csm?.included; label = "Dedicated CSM"; }
     else if (key === 'sup_onb') { isMatch = plan.vendor_support.onboarding_services?.included; label = "Onboarding"; }

     if (isMatch) matches++;
     else missing.push(label);
  });

  return {
    score: Math.round((matches / activeFilters.length) * 100),
    missing
  };
};

// --- COMPONENT: LEAD GEN MODAL ---
const LeadGenModal = ({ onClose, onUnlock }: { onClose: () => void, onUnlock: () => void }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onUnlock();
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <Lock className="text-blue-600" size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Unlock Full Analysis</h2>
        <p className="text-center text-slate-500 mb-6">Enter your work email to view detailed feature breakdowns and download the PDF report.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
            <input 
              type="email" 
              required 
              placeholder="name@company.com" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Unlocking..." : "View Results & Download"}
          </button>
        </form>
        <p className="text-xs text-center text-slate-400 mt-4">We respect your inbox. No spam.</p>
      </div>
    </div>
  );
};


// --- COMPONENT: COMPARISON MODAL ---
const ComparisonModal = ({ plans, onClose, teamSize }: { plans: Plan[], onClose: () => void, teamSize: number }) => {
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  if (plans.length === 0) return null;

  // Prepare Spider Chart Data
  const chartData = useMemo(() => {
    const categories = ["AI & Intel", "Channels", "Security", "Reporting", "Support", "Platform"];
    return categories.map(cat => {
      const dataPoint: any = { subject: cat, fullMark: 100 };
      plans.forEach(plan => {
        const scores = calculateCategoryScores(plan);
        dataPoint[plan.id] = scores[cat as keyof typeof scores];
      });
      return dataPoint;
    });
  }, [plans]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-slate-900/5">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Compare Plans</h2>
            <p className="text-sm text-slate-500">Comparing annual impact for <span className="font-bold text-slate-900">{teamSize} agents</span></p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* VIEW TOGGLE */}
             <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  <TableIcon size={16} /> Table
                </button>
                <button 
                  onClick={() => setViewMode("chart")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === "chart" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  <BarChart2 size={16} /> Visual
                </button>
             </div>
             <div className="w-px h-6 bg-slate-200"></div>
             <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-slate-900"><X size={20} /></button>
          </div>
        </div>

        <div className="overflow-auto flex-1 p-6 bg-slate-50/50">
          
          {viewMode === "chart" ? (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl shadow-sm p-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Feature Coverage Analysis</h3>
                <div className="w-full h-[400px] max-w-4xl">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      {plans.map((plan, index) => (
                        <Radar
                          key={plan.id}
                          name={plan.brand_name + " " + plan.plan_name}
                          dataKey={plan.id}
                          stroke={plan.brand_color}
                          fill={plan.brand_color}
                          fillOpacity={0.2}
                        />
                      ))}
                      <Legend />
                      <RechartsTooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-slate-400 text-sm mt-4">Chart shows percentage of features included in each category.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse bg-white rounded-lg shadow-sm overflow-hidden">
              <thead>
                <tr>
                  <th className="p-4 bg-white sticky left-0 z-10 w-48 min-w-[150px] shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)] border-b border-slate-100"></th>
                  {plans.map(p => {
                    const annualCost = calculateAnnualCost(p, teamSize);
                    return (
                      <th key={p.id} className="p-6 min-w-[220px] border-b border-slate-100 align-bottom bg-white relative group">
                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: p.brand_color }}></div>
                        <div className="font-bold text-lg text-slate-900 tracking-tight">{p.brand_name}</div>
                        <div className="text-blue-600 font-semibold mb-4 text-sm">{p.plan_name}</div>
                        <div className="pb-2">
                            <div className="text-2xl font-bold text-slate-900 tracking-tight">${annualCost.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Est. Annual Cost</div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50"><td colSpan={plans.length + 1} className="px-4 py-2 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Pricing & Limits</td></tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white">Monthly Price</td>
                  {plans.map(p => (
                      <td key={p.id} className="p-4 bg-white font-bold text-slate-900">${p.pricing.cost_per_agent} <span className="text-xs font-normal text-slate-500">/ {p.pricing.model === 'flat_fee' ? 'mo' : 'agent'}</span></td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-700 sticky left-0 bg-white">Ticket Cap</td>
                  {plans.map(p => (
                    <td key={p.id} className="p-4 bg-white">
                       {p.constraints.ticket_limit && String(p.constraints.ticket_limit) !== "Unlimited" 
                         ? <span className="text-red-700 font-bold bg-red-50 border border-red-100 px-2 py-0.5 rounded text-xs">{p.constraints.ticket_limit}</span> 
                         : <span className="text-slate-500 text-xs font-medium">Unlimited</span>}
                    </td>
                  ))}
                </tr>

                <tr className="bg-slate-50"><td colSpan={plans.length + 1} className="px-4 py-2 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Channels</td></tr>
                <CompareRow label="Voice" plans={plans} field="channels" subfield="voice" />
                <CompareRow label="Chat" plans={plans} field="channels" subfield="chat" />
                <CompareRow label="WhatsApp" plans={plans} field="channels" subfield="whatsapp" />
                <CompareRow label="SMS" plans={plans} field="channels" subfield="sms" />
                <CompareRow label="Customer Portal" plans={plans} field="channels" subfield="customer_portal" />

                <tr className="bg-slate-50"><td colSpan={plans.length + 1} className="px-4 py-2 font-bold text-[10px] uppercase text-slate-400 tracking-widest">AI & Intelligence</td></tr>
                <CompareRow label="Generative Drafts" plans={plans} field="ai" subfield="generative_drafts" />
                <CompareRow label="Sentiment" plans={plans} field="ai" subfield="sentiment_analysis" />
                <CompareRow label="Auto Triage" plans={plans} field="ai" subfield="auto_triage" />
                <CompareRow label="Resolution Bot" plans={plans} field="ai" subfield="resolution_bot" />

                <tr className="bg-slate-50"><td colSpan={plans.length + 1} className="px-4 py-2 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Routing & Workflow</td></tr>
                <CompareRow label="SLA Management" plans={plans} field="routing" subfield="sla_management" />
                <CompareRow label="Round Robin" plans={plans} field="routing" subfield="round_robin" />
                <CompareRow label="Skill-based" plans={plans} field="routing" subfield="skill_based" />

                <tr className="bg-slate-50"><td colSpan={plans.length + 1} className="px-4 py-2 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Reporting</td></tr>
                <CompareRow label="Custom Builder" plans={plans} field="reporting" subfield="custom_builder" />
                <CompareRow label="Real-time Dash" plans={plans} field="reporting" subfield="real_time" />
                <CompareRow label="Scheduled Reports" plans={plans} field="reporting" subfield="scheduled_exports" />

                <tr className="bg-slate-50"><td colSpan={plans.length + 1} className="px-4 py-2 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Security & Platform</td></tr>
                <CompareRow label="SSO" plans={plans} field="security" subfield="sso" />
                <CompareRow label="HIPAA" plans={plans} field="security" subfield="hipaa" />
                <CompareRow label="Data Locality" plans={plans} field="security" subfield="data_locality" />
                <CompareRow label="Salesforce Sync" plans={plans} field="platform" subfield="native_salesforce" />
                <CompareRow label="Sandbox" plans={plans} field="platform" subfield="sandbox" />
                
                <tr className="bg-slate-50"><td colSpan={plans.length + 1} className="px-4 py-2 font-bold text-[10px] uppercase text-slate-400 tracking-widest">Support</td></tr>
                <CompareRow label="Phone Support" plans={plans} field="vendor_support" subfield="phone_support" />
                <CompareRow label="Dedicated CSM" plans={plans} field="vendor_support" subfield="dedicated_csm" />
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const CompareRow = ({ label, plans, field, subfield }: any) => (
  <tr className="hover:bg-slate-50/80 transition-colors">
    <td className="p-4 font-medium text-slate-600 sticky left-0 bg-white shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)] z-10 border-b border-slate-50">
      {label}
    </td>
    {plans.map((p: any) => {
      const feat = p[field]?.[subfield];
      const tierColors: Record<string, string> = {
        basic: "bg-slate-100 text-slate-600 border-slate-200",
        standard: "bg-blue-50 text-blue-700 border-blue-200",
        advanced: "bg-violet-50 text-violet-700 border-violet-200",
        enterprise: "bg-emerald-50 text-emerald-700 border-emerald-200",
        "add-on": "bg-amber-50 text-amber-700 border-amber-200",
      };

      return (
        <td key={p.id} className="p-4 align-top border-b border-slate-50 relative group bg-white hover:bg-slate-50/50">
          {feat?.included ? (
            <div className="flex flex-col gap-2 items-start">
              <div className="flex items-start gap-2">
                <div className="bg-green-100 text-green-700 rounded-full p-0.5 mt-0.5">
                    <Check size={10} strokeWidth={4} />
                </div>
                <span className="text-sm font-medium text-slate-900 leading-tight">{feat.display_text || "Included"}</span>
              </div>
              {feat.tier && (
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${tierColors[feat.tier] || tierColors.basic}`}>
                  {feat.tier}
                </span>
              )}
            </div>
          ) : (
             <div className="flex items-center gap-2 opacity-30"><Minus size={16} /> <span className="text-sm">—</span></div>
          )}
        </td>
      );
    })}
  </tr>
);


// --- COMPONENT: PLAN DETAILS MODAL ---
const PlanDetailsModal = ({ plan, onClose }: { plan: Plan, onClose: () => void }) => {
    if (!plan) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 text-white relative" style={{ backgroundColor: plan.brand_color || '#1e293b' }}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition"><X size={20} /></button>
                    <div className="flex items-center gap-3 mb-2">
                         <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-lg">{plan.brand_name.charAt(0)}</div>
                         <h2 className="text-2xl font-bold">{plan.brand_name}</h2>
                    </div>
                    <h3 className="text-3xl font-bold">{plan.plan_name} Plan</h3>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    
                    {/* RESTORED: Pricing & Ticket Limits */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-500 text-xs uppercase mb-1">Pricing</h4>
                            <div className="text-2xl font-bold text-slate-900">${plan.pricing.cost_per_agent}</div>
                            <div className="text-sm text-slate-500">{plan.pricing.model === 'flat_fee' ? 'Flat Fee / Month' : 'Per Agent / Month'}</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-500 text-xs uppercase mb-1">Ticket Limit</h4>
                            <div className="text-2xl font-bold text-slate-900">{plan.constraints.ticket_limit || "Unlimited"}</div>
                            <div className="text-sm text-slate-500">Monthly Cap</div>
                        </div>
                    </div>

                    {/* FULL 8 CATEGORIES */}
                    <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Channels</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                         <DetailItem label="Voice" feature={plan.channels.voice} />
                         <DetailItem label="Chat" feature={plan.channels.chat} />
                         <DetailItem label="SMS" feature={plan.channels.sms} />
                         <DetailItem label="WhatsApp" feature={plan.channels.whatsapp} />
                         <DetailItem label="Customer Portal" feature={plan.channels.customer_portal} />
                    </div>

                    <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">AI & Intelligence</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                         <DetailItem label="Generative Drafts" feature={plan.ai.generative_drafts} />
                         <DetailItem label="Resolution Bot" feature={plan.ai.resolution_bot} />
                         <DetailItem label="Sentiment Analysis" feature={plan.ai.sentiment_analysis} />
                         <DetailItem label="Auto Triage" feature={plan.ai.auto_triage} />
                    </div>

                    <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Reporting & Analytics</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                         <DetailItem label="Custom Builder" feature={plan.reporting.custom_builder} />
                         <DetailItem label="Real-time Dash" feature={plan.reporting.real_time} />
                         <DetailItem label="Scheduled Exports" feature={plan.reporting.scheduled_exports} />
                         <DetailItem label="Agent Logs" feature={plan.reporting.agent_activity} />
                    </div>

                    <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Security & Platform</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                         <DetailItem label="SSO" feature={plan.security.sso} />
                         <DetailItem label="Data Locality" feature={plan.security.data_locality} />
                         <DetailItem label="Sandbox" feature={plan.platform.sandbox} />
                         <DetailItem label="Salesforce Sync" feature={plan.platform.native_salesforce} />
                    </div>

                    <h4 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Routing & Self-Service</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                         <DetailItem label="SLA Management" feature={plan.routing.sla_management} />
                         <DetailItem label="Round Robin" feature={plan.routing.round_robin} />
                         <DetailItem label="Knowledge Base" feature={plan.self_service.knowledge_base} />
                         <DetailItem label="Multi-brand" feature={plan.self_service.multi_brand} />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition">Close</button>
                    <a href={plan.official_url} target="_blank" rel="noreferrer" className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition flex items-center gap-2">
                        Visit Official Site <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        </div>
    );
};

const DetailItem = ({ label, feature }: { label: string, feature: Feature | undefined }) => (
    <div className={`flex items-center justify-between p-2 rounded ${feature?.included ? 'bg-green-50/50' : 'bg-slate-50'}`}>
        <span className="text-sm font-medium text-slate-600">{label}</span>
        {feature?.included ? 
            <div className="flex items-center gap-1.5">
               {feature.tier && <span className="text-[9px] uppercase font-bold bg-blue-100 text-blue-700 px-1.5 rounded">{feature.tier}</span>}
               <span className="text-xs font-bold text-green-700 flex items-center gap-1"><Check size={10} /> Yes</span>
            </div> 
            : 
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">No</span>
        }
    </div>
);


// --- COMPONENT: PLAN CARD ---
const PlanCard = ({ plan, isTopPick, isSelected, teamSize, matchData, onToggleCompare, onViewDetails }: 
  { plan: Plan; isTopPick: boolean, isSelected: boolean, teamSize: number, matchData: { score: number | null, missing: string[] }, onToggleCompare: () => void, onViewDetails: () => void }) => {
  
  const brandColor = plan.brand_color || "#475569";
  const isFlatFee = plan.pricing.model === "flat_fee";
  const annualTotal = calculateAnnualCost(plan, teamSize);

  return (
    <div className={`group relative border rounded-2xl overflow-hidden flex flex-col h-full bg-white transition-all duration-300 ${
      isSelected ? "ring-2 ring-blue-500 border-blue-500 shadow-xl scale-[1.02]" :
      isTopPick ? "border-amber-200 shadow-lg shadow-amber-500/10 hover:-translate-y-1 hover:shadow-xl" 
      : "border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-lg hover:-translate-y-1"
    }`}>
      
      {isTopPick && !isSelected && <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-transparent pointer-events-none opacity-50" />}

      {/* MATCH SCORE - FIXED: Shows 100% now */}
      {matchData.score !== null && (
        <div className="absolute top-4 right-4 z-20 group/tooltip">
            <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border flex items-center gap-1.5 backdrop-blur-sm cursor-help ${
            matchData.score >= 80 ? "bg-emerald-100/90 text-emerald-800 border-emerald-200" : 
            matchData.score >= 50 ? "bg-blue-50/90 text-blue-700 border-blue-200" :
            "bg-slate-100/90 text-slate-500 border-slate-200"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${matchData.score >= 80 ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></div>
              {matchData.score}% Match
            </div>
            
            {/* Missing Features Tooltip */}
            {matchData.missing.length > 0 ? (
                <div className="absolute right-0 top-8 w-48 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50">
                    <p className="font-bold mb-1 text-slate-300">Missing Features:</p>
                    <ul className="list-disc pl-3 space-y-0.5 text-slate-400">
                        {matchData.missing.slice(0, 5).map(m => <li key={m}>{m}</li>)}
                        {matchData.missing.length > 5 && <li>+ {matchData.missing.length - 5} more</li>}
                    </ul>
                </div>
            ) : (
               <div className="absolute right-0 top-8 w-32 bg-emerald-900 text-white text-xs p-2 rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 text-center font-bold">
                   Perfect Match!
               </div>
            )}
        </div>
      )}

      <div className="h-1.5 w-full" style={{ backgroundColor: brandColor }}></div>

      <div className="p-6 flex flex-col h-full relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ring-1 ring-black/5" style={{ backgroundColor: brandColor }}>
                {plan.brand_name.charAt(0)}
             </div>
             <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{plan.brand_name}</div>
                <h2 className="text-xl font-bold text-slate-900 leading-none tracking-tight">{plan.plan_name}</h2>
             </div>
          </div>
        </div>

        <div className="mb-6 pb-6 border-b border-slate-100">
           <div className="flex items-baseline gap-1">
             <span className="text-4xl font-extrabold text-slate-900 tracking-tight">${plan.pricing.cost_per_agent}</span>
             <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {isFlatFee ? "/mo flat" : "/agent/mo"}
             </span>
           </div>
           
           <div className="mt-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 flex justify-between items-center group-hover:bg-slate-100 transition-colors">
             <span className="font-medium">Est. Annual Cost</span>
             <span className="font-bold text-slate-900">${annualTotal.toLocaleString()}</span>
           </div>
        </div>

        <div className="space-y-3 flex-grow">
          {/* UPDATED: Decision Driver Features */}
          <FeatureRow label="Generative AI" feature={plan.ai.generative_drafts} />
          <FeatureRow label="SLA Management" feature={plan.routing.sla_management} />
          <FeatureRow label="Custom Reports" feature={plan.reporting.custom_builder} />
          <FeatureRow label="SSO (Security)" feature={plan.security.sso} />
          <div className="h-px bg-slate-100 my-3"></div>
          <FeatureRow label="Voice Channel" feature={plan.channels.voice} />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 items-center">
            <button onClick={onViewDetails} className="text-slate-500 hover:text-blue-600 text-xs font-bold transition-colors flex items-center gap-1">
                Full Plan Details
            </button>

            <label className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-bold active:scale-[0.98] ${
                isSelected ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
                <input type="checkbox" checked={isSelected} onChange={onToggleCompare} className="hidden" />
                {isSelected ? <Check size={14} /> : <Plus size={14} />}
                {isSelected ? "Added" : "Compare"}
            </label>
        </div>
      </div>
    </div>
  );
};

const FeatureRow = ({ label, feature }: { label: string; feature: Feature | undefined }) => {
    const hasIt = feature?.included;
    const tierColor = feature?.tier === "enterprise" ? "bg-emerald-500" : 
                      feature?.tier === "advanced" ? "bg-violet-500" : 
                      feature?.tier === "add-on" ? "bg-amber-500" : "bg-blue-500";

    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500 font-medium">{label}</span>
        {hasIt ? (
            <div className="flex items-center gap-2">
               {feature.tier && <div className={`w-2 h-2 rounded-full ${tierColor} ring-2 ring-white`} title={`${feature.tier} tier`} />}
               <Check size={16} className="text-slate-800" strokeWidth={2.5} />
            </div>
        ) : (
            <span className="text-slate-200 text-xs">—</span>
        )}
      </div>
    );
};


// --- MAIN CONTROLLER ---
function HelpdeskEvaluatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [budget, setBudget] = useState<number>(() => {
    const p = searchParams.get("budget");
    return p ? Number(p) : 200;
  });
  const [teamSize, setTeamSize] = useState<number>(() => {
    const t = searchParams.get("team");
    return t ? Number(t) : 5;
  });
  const [search, setSearch] = useState<string>(searchParams.get("q") || "");
  const [sortOption, setSortOption] = useState<string>("match_desc");
  const [toast, setToast] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<Plan | null>(null);
  
  // LEAD GEN STATE
  const [isLeadCaptured, setIsLeadCaptured] = useState(false);
  const [showLeadGen, setShowLeadGen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // GRANULAR FILTERS STATE (8 Pillars)
  const initialFilters = {
    // 1. Channels
    email: searchParams.get("email") === "true",
    voice: searchParams.get("voice") === "true",
    chat: searchParams.get("chat") === "true",
    sms: searchParams.get("sms") === "true",
    whatsapp: searchParams.get("whatsapp") === "true",
    social: searchParams.get("social") === "true",
    portal: searchParams.get("portal") === "true",
    
    // 2. AI
    ai_gen: searchParams.get("ai_gen") === "true",
    ai_sum: searchParams.get("ai_sum") === "true",
    ai_sent: searchParams.get("ai_sent") === "true",
    ai_trans: searchParams.get("ai_trans") === "true",
    ai_triage: searchParams.get("ai_triage") === "true",
    ai_bot: searchParams.get("ai_bot") === "true",
    ai_copilot: searchParams.get("ai_copilot") === "true",

    // 3. Routing
    rt_auto: searchParams.get("rt_auto") === "true",
    rt_sla: searchParams.get("rt_sla") === "true",
    rt_macro: searchParams.get("rt_macro") === "true",
    rt_rr: searchParams.get("rt_rr") === "true",
    rt_skill: searchParams.get("rt_skill") === "true",
    rt_biz: searchParams.get("rt_biz") === "true",

    // 4. Self Service
    ss_kb: searchParams.get("ss_kb") === "true",
    ss_forum: searchParams.get("ss_forum") === "true",
    ss_style: searchParams.get("ss_style") === "true",
    ss_brand: searchParams.get("ss_brand") === "true",

    // 5. Reporting
    rpt_custom: searchParams.get("rpt_custom") === "true",
    rpt_sched: searchParams.get("rpt_sched") === "true",
    rpt_real: searchParams.get("rpt_real") === "true",
    rpt_agent: searchParams.get("rpt_agent") === "true",

    // 6. Security
    sec_sso: searchParams.get("sec_sso") === "true",
    sec_hipaa: searchParams.get("sec_hipaa") === "true",
    sec_data: searchParams.get("sec_data") === "true",
    sec_audit: searchParams.get("sec_audit") === "true",
    sec_role: searchParams.get("sec_role") === "true",
    sec_ip: searchParams.get("sec_ip") === "true",

    // 7. Platform
    plt_obj: searchParams.get("plt_obj") === "true",
    plt_sand: searchParams.get("plt_sand") === "true",
    plt_api: searchParams.get("plt_api") === "true",
    plt_sf: searchParams.get("plt_sf") === "true",
    plt_jira: searchParams.get("plt_jira") === "true",

    // 8. Support
    sup_phone: searchParams.get("sup_phone") === "true",
    sup_csm: searchParams.get("sup_csm") === "true",
    sup_onb: searchParams.get("sup_onb") === "true",
  };

  const [filters, setFilters] = useState(initialFilters);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Sync Logic
  useEffect(() => {
    const params = new URLSearchParams();
    if (budget < 200) params.set("budget", budget.toString());
    if (search) params.set("q", search);
    if (teamSize !== 5) params.set("team", teamSize.toString());
    Object.keys(filters).forEach(key => { if (filters[key as keyof typeof filters]) params.set(key, "true"); });
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [budget, filters, search, teamSize, router]);

  const toggleFilter = (key: keyof typeof filters) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleCompare = (id: string) => {
      setCompareList(prev => {
          if (prev.includes(id)) return prev.filter(item => item !== id);
          if (prev.length >= 3) { alert("You can compare up to 3 plans at a time."); return prev; }
          return [...prev, id];
      });
  };
  const clearFilters = () => {
    setBudget(200); setSearch(""); setTeamSize(5);
    setFilters(Object.keys(initialFilters).reduce((acc, key) => ({...acc, [key]: false}), {} as any));
  };
  
  const shareUrl = () => {
      navigator.clipboard.writeText(window.location.href);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
  };

  const handleLeadGenUnlock = () => {
    setIsLeadCaptured(true);
    setShowLeadGen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const handleRestrictedAction = (action: () => void) => {
    if (isLeadCaptured) {
      action();
    } else {
      setPendingAction(() => action);
      setShowLeadGen(true);
    }
  };

  const filteredPlans = useMemo(() => {
    let result = (plansData as Plan[]).filter((plan) => {
        if (search && !plan.brand_name.toLowerCase().includes(search.toLowerCase())) return false;
        if (plan.pricing.model !== 'flat_fee' && plan.pricing.cost_per_agent > budget) return false;
        return true;
    });

    const scoredPlans = result.map(plan => {
        const { score, missing } = analyzeMatch(plan, filters);
        return { ...plan, matchScore: score || 0, missingFeatures: missing };
    });

    if (sortOption === "match_desc") {
        return scoredPlans.sort((a, b) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            return a.pricing.cost_per_agent - b.pricing.cost_per_agent;
        });
    }
    if (sortOption === "price_asc") return scoredPlans.sort((a, b) => a.pricing.cost_per_agent - b.pricing.cost_per_agent);
    if (sortOption === "price_desc") return scoredPlans.sort((a, b) => b.pricing.cost_per_agent - a.pricing.cost_per_agent);
    if (sortOption === "name") return scoredPlans.sort((a, b) => a.brand_name.localeCompare(b.brand_name));
    
    return scoredPlans;
  }, [budget, filters, search, sortOption]);

  const comparePlansData = (plansData as Plan[]).filter(p => compareList.includes(p.id));

  const downloadComparisonReport = () => {
    const doc = new jsPDF();
    const targetPlans = compareList.length > 0 ? (plansData as Plan[]).filter(p => compareList.includes(p.id)) : filteredPlans.slice(0, 5);
    const date = new Date().toLocaleDateString();

    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("Helpdesk Evaluation Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generated: ${date} | Team Size: ${teamSize} Agents`, 14, 30);

    let summaryY = 50;
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Executive Summary", 14, summaryY);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Projected Annual Costs based on current selection:", 14, summaryY + 7);
    
    let yPos = summaryY + 15;
    targetPlans.forEach(p => {
        const cost = calculateAnnualCost(p, teamSize);
        const matchData = analyzeMatch(p, filters);
        const match = matchData.score || 0;
        doc.text(`• ${p.brand_name} ${p.plan_name}`, 14, yPos);
        doc.setFont("helvetica", "bold");
        doc.text(`$${cost.toLocaleString()}/yr`, 120, yPos);
        doc.setFont("helvetica", "normal");
        
        if(match > 70) {
            doc.setTextColor(22, 163, 74); 
            doc.text(`(${match}% Match)`, 160, yPos);
            doc.setTextColor(80, 80, 80); 
        }
        yPos += 7;
    });

    const tableData = targetPlans.map(p => [
      `${p.brand_name}\n${p.plan_name}`,
      p.pricing.model === 'flat_fee' ? `$${p.pricing.cost_per_agent}/mo (Flat)` : `$${p.pricing.cost_per_agent}/agent`,
      `$${calculateAnnualCost(p, teamSize).toLocaleString()}`,
      p.ai.generative_drafts?.included ? "Yes" : "No",
      p.security.sso?.included ? "Yes" : "No", 
      p.platform.native_salesforce?.included ? "Yes" : "No"
    ]);

    autoTable(doc, {
      head: [['Plan', 'Unit Price', `Total Annual (${teamSize})`, 'AI Drafts', 'SSO', 'Salesforce']],
      body: tableData,
      startY: yPos + 10,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 
          0: { fontStyle: 'bold', cellWidth: 40 },
          2: { fontStyle: 'bold', textColor: [22, 163, 74] } 
      }
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Note: Prices are based on public data. 'Flat Fee' plans do not increase with agent count.", 14, pageHeight - 10);

    doc.save(`helpdesk-report-${teamSize}-agents.pdf`);
  };

  return (
    <main className="min-h-screen bg-grid-pattern text-slate-900 font-sans pb-32">
      <header className="border-b border-slate-200/60 sticky top-0 z-40 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={clearFilters}>
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-1.5 rounded-lg shadow-md"><ShieldCheck size={24} /></div>
            <h1 className="text-lg font-bold text-slate-800 hidden md:block tracking-tight">Data-Migration-Tools</h1>
          </div>
          <div className="flex-1 max-w-lg relative group">
             <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
             <input type="text" placeholder="Search brands..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100/50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-full text-sm outline-none transition-all" />
          </div>
          <button onClick={shareUrl} className="hidden md:flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95"><Share2 size={16} /> <span className="hidden lg:inline">Share</span></button>
          
          {/* LEAD GEN PROTECTED BUTTONS */}
          <button 
            onClick={() => handleRestrictedAction(downloadComparisonReport)}
            className="hidden md:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Download size={16} /> <span className="hidden lg:inline">Export PDF</span>
          </button>

          <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setShowMobileFilters(!showMobileFilters)}><SlidersHorizontal size={24} /></button>
        </div>
      </header>
      
      {toast && <div className="fixed top-20 right-10 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-bold animate-in fade-in slide-in-from-top-5">Link copied!</div>}

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative">
        <aside className={`md:col-span-3 space-y-6 ${showMobileFilters ? "block" : "hidden"} md:block md:sticky md:top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar`}>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">Filters</h3>
               <button onClick={clearFilters} className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-colors"><RefreshCcw size={10} /> RESET</button>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-100 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><Users size={48} /></div>
                <h3 className="font-bold text-blue-900 text-sm mb-3 flex items-center gap-2 relative z-10">
                    <Users size={16} /> Team Calculator
                </h3>
                <div className="mb-2 flex justify-between relative z-10">
                    <label className="text-xs font-bold text-blue-700 uppercase">Agents</label>
                    <span className="text-sm font-bold text-blue-700 bg-white px-2 rounded shadow-sm">{teamSize}</span>
                </div>
                <input type="range" min="1" max="100" step="1" value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600 relative z-10" />
            </div>

            <div className="mb-6">
              <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-400 uppercase">Max Price / Agent</label><span className="text-sm font-bold text-blue-600">${budget}</span></div>
              <input type="range" min="0" max="200" step="10" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>

            <CollapsibleFilterSection title="Channels">
               <Checkbox label="Voice / Phone" checked={filters.voice} onChange={() => toggleFilter('voice')} />
               <Checkbox label="Chat / Messaging" checked={filters.chat} onChange={() => toggleFilter('chat')} />
               <Checkbox label="WhatsApp" checked={filters.whatsapp} onChange={() => toggleFilter('whatsapp')} />
               <Checkbox label="SMS" checked={filters.sms} onChange={() => toggleFilter('sms')} />
               <Checkbox label="Customer Portal" checked={filters.portal} onChange={() => toggleFilter('portal')} />
               <Checkbox label="Social Media" checked={filters.social} onChange={() => toggleFilter('social')} />
            </CollapsibleFilterSection>

            <CollapsibleFilterSection title="AI Features">
               <Checkbox label="Generative Drafts" checked={filters.ai_gen} onChange={() => toggleFilter('ai_gen')} />
               <Checkbox label="Summarization" checked={filters.ai_sum} onChange={() => toggleFilter('ai_sum')} />
               <Checkbox label="Sentiment Analysis" checked={filters.ai_sent} onChange={() => toggleFilter('ai_sent')} />
               <Checkbox label="Live Translation" checked={filters.ai_trans} onChange={() => toggleFilter('ai_trans')} />
               <Checkbox label="Auto Triage" checked={filters.ai_triage} onChange={() => toggleFilter('ai_triage')} />
               <Checkbox label="Resolution Bot" checked={filters.ai_bot} onChange={() => toggleFilter('ai_bot')} />
               <Checkbox label="Agent Copilot" checked={filters.ai_copilot} onChange={() => toggleFilter('ai_copilot')} />
            </CollapsibleFilterSection>

            <CollapsibleFilterSection title="Routing & Workflow">
               <Checkbox label="Automation Workflows" checked={filters.rt_auto} onChange={() => toggleFilter('rt_auto')} />
               <Checkbox label="SLA Management" checked={filters.rt_sla} onChange={() => toggleFilter('rt_sla')} />
               <Checkbox label="Macros / Canned" checked={filters.rt_macro} onChange={() => toggleFilter('rt_macro')} />
               <Checkbox label="Round Robin" checked={filters.rt_rr} onChange={() => toggleFilter('rt_rr')} />
               <Checkbox label="Skill-based Routing" checked={filters.rt_skill} onChange={() => toggleFilter('rt_skill')} />
               <Checkbox label="Business Hours" checked={filters.rt_biz} onChange={() => toggleFilter('rt_biz')} />
            </CollapsibleFilterSection>

            <CollapsibleFilterSection title="Self Service">
               <Checkbox label="Knowledge Base" checked={filters.ss_kb} onChange={() => toggleFilter('ss_kb')} />
               <Checkbox label="Community Forums" checked={filters.ss_forum} onChange={() => toggleFilter('ss_forum')} />
               <Checkbox label="Portal Customization" checked={filters.ss_style} onChange={() => toggleFilter('ss_style')} />
               <Checkbox label="Multi-brand" checked={filters.ss_brand} onChange={() => toggleFilter('ss_brand')} />
            </CollapsibleFilterSection>

            <CollapsibleFilterSection title="Reporting">
               <Checkbox label="Custom Builder" checked={filters.rpt_custom} onChange={() => toggleFilter('rpt_custom')} />
               <Checkbox label="Scheduled Exports" checked={filters.rpt_sched} onChange={() => toggleFilter('rpt_sched')} />
               <Checkbox label="Real-time Dash" checked={filters.rpt_real} onChange={() => toggleFilter('rpt_real')} />
               <Checkbox label="Agent Logs" checked={filters.rpt_agent} onChange={() => toggleFilter('rpt_agent')} />
            </CollapsibleFilterSection>

            <CollapsibleFilterSection title="Security & Admin">
               <Checkbox label="SSO (SAML/JWT)" checked={filters.sec_sso} onChange={() => toggleFilter('sec_sso')} />
               <Checkbox label="IP Restrictions" checked={filters.sec_ip} onChange={() => toggleFilter('sec_ip')} />
               <Checkbox label="Custom Roles" checked={filters.sec_role} onChange={() => toggleFilter('sec_role')} />
               <Checkbox label="Audit Logs" checked={filters.sec_audit} onChange={() => toggleFilter('sec_audit')} />
               <Checkbox label="HIPAA Compliance" checked={filters.sec_hipaa} onChange={() => toggleFilter('sec_hipaa')} />
               <Checkbox label="Data Locality" checked={filters.sec_data} onChange={() => toggleFilter('sec_data')} />
            </CollapsibleFilterSection>

            <CollapsibleFilterSection title="Platform">
               <Checkbox label="Custom Objects" checked={filters.plt_obj} onChange={() => toggleFilter('plt_obj')} />
               <Checkbox label="Sandbox" checked={filters.plt_sand} onChange={() => toggleFilter('plt_sand')} />
               <Checkbox label="API Access" checked={filters.plt_api} onChange={() => toggleFilter('plt_api')} />
               <Checkbox label="Salesforce Sync" checked={filters.plt_sf} onChange={() => toggleFilter('plt_sf')} />
               <Checkbox label="Jira Sync" checked={filters.plt_jira} onChange={() => toggleFilter('plt_jira')} />
            </CollapsibleFilterSection>

            <CollapsibleFilterSection title="Vendor Support">
               <Checkbox label="Phone Support" checked={filters.sup_phone} onChange={() => toggleFilter('sup_phone')} />
               <Checkbox label="Dedicated CSM" checked={filters.sup_csm} onChange={() => toggleFilter('sup_csm')} />
               <Checkbox label="Onboarding Services" checked={filters.sup_onb} onChange={() => toggleFilter('sup_onb')} />
            </CollapsibleFilterSection>
          </div>
        </aside>

        <section className="md:col-span-9 min-h-[500px]">
          <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
             <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Select the best tool</h2>
                <p className="text-slate-500">Showing {filteredPlans.length} plans ranked by relevance.</p>
             </div>
             
             <div className="flex items-center gap-3">
                 <button onClick={() => handleRestrictedAction(downloadComparisonReport)} className="md:hidden flex items-center justify-center w-10 h-10 bg-slate-800 text-white rounded-lg shadow-sm">
                    <Download size={18} />
                 </button>
                 <div className="relative">
                    <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="appearance-none bg-white border border-slate-200 text-sm font-medium py-2.5 pl-4 pr-10 rounded-xl shadow-sm outline-none cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
                      <option value="match_desc">Best Match</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="name">Name (A-Z)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3.5 pointer-events-none text-slate-400" />
                 </div>
             </div>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-300">
                <div className="text-slate-200 mb-4"><Search size={64} className="mx-auto" /></div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No plans found</h3>
                <p className="text-slate-500 mb-6">Try increasing your budget.</p>
                <button onClick={clearFilters} className="text-white bg-blue-600 px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">Clear all filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredPlans.map((plan, index) => {
                    const matchData = analyzeMatch(plan, filters);
                    return (
                        <PlanCard 
                            key={plan.id} 
                            plan={plan} 
                            isTopPick={index < 2 && !search && sortOption === "match_desc"} 
                            isSelected={compareList.includes(plan.id)}
                            teamSize={teamSize}
                            matchData={matchData}
                            onToggleCompare={() => toggleCompare(plan.id)}
                            onViewDetails={() => handleRestrictedAction(() => setSelectedPlanDetails(plan))}
                        />
                    );
                })}
            </div>
          )}
        </section>
      </div>

      {compareList.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white p-4 pr-6 rounded-2xl shadow-2xl z-50 flex items-center gap-6 animate-in slide-in-from-bottom-8 w-[90%] md:w-auto justify-between md:justify-start ring-1 ring-white/10">
           <div className="flex items-center gap-3">
              <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner">{compareList.length}</div>
              <div className="flex flex-col">
                  <span className="font-bold text-sm leading-none">Selection Active</span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">{compareList.length} plans ready to compare</span>
              </div>
           </div>
           <div className="flex items-center gap-3">
               <button onClick={() => setShowCompareModal(true)} className="bg-white text-slate-900 px-5 sm:px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 transition whitespace-nowrap shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                 Compare Plans
               </button>
               <button onClick={() => setCompareList([])} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition"><XCircle size={24} /></button>
           </div>
        </div>
      )}

      {showCompareModal && <ComparisonModal plans={comparePlansData} onClose={() => setShowCompareModal(false)} teamSize={teamSize} />}
      {selectedPlanDetails && <PlanDetailsModal plan={selectedPlanDetails} onClose={() => setSelectedPlanDetails(null)} />}
      {showLeadGen && <LeadGenModal onClose={() => setShowLeadGen(false)} onUnlock={handleLeadGenUnlock} />}
    </main>
  );
}

export default function HelpdeskEvaluator() { return <Suspense fallback={<div>Loading...</div>}><HelpdeskEvaluatorContent /></Suspense>; }

const FilterSection = ({ title, children, className = "" }: any) => (<div className={className}><h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</h4><div className="space-y-3">{children}</div></div>);

// NEW: Collapsible Filter Section for Granular Categories
const CollapsibleFilterSection = ({ title, children }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 pb-4 mb-4">
       <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 hover:text-blue-600 transition-colors">
         {title}
         <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
       </button>
       {isOpen && <div className="space-y-3 pl-2 animate-in slide-in-from-top-2">{children}</div>}
    </div>
  );
};

const Checkbox = ({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none">
    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${checked ? "bg-blue-600 border-blue-600 shadow-sm" : "bg-white border-slate-300 group-hover:border-blue-400"}`}>
       {checked && <Check size={12} className="text-white" strokeWidth={3} />}
    </div>
    <span className={`text-sm transition-colors ${checked ? "text-slate-900 font-semibold" : "text-slate-600 group-hover:text-slate-800"}`}>{label}</span>
    <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
  </label>
);