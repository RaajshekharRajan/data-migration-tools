"use client";

import React, { useState, useEffect } from 'react';
import { PlatformType, PlanType, TimelineResult, DataEntity } from '../types';
import { PLATFORMS, ENTITY_LABELS, ENTITY_DESCRIPTIONS } from '../data/platforms';
import { calculateTimeline } from '../utils/calculator';

// --- VISUAL AID: Tooltip Component ---
const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
  <div className="group relative flex items-center w-full">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 text-center leading-relaxed print:hidden">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
    </div>
  </div>
);

const MigrationCalculator: React.FC = () => {
  // --- State ---
  const [source, setSource] = useState<PlatformType>('zendesk');
  const [sourcePlan, setSourcePlan] = useState<PlanType>('professional');
  
  const [dest, setDest] = useState<PlatformType>('freshdesk');
  const [destPlan, setDestPlan] = useState<PlanType>('growth');

  const [selectedEntities, setSelectedEntities] = useState<DataEntity[]>([]);
  
  const [volumes, setVolumes] = useState<Partial<Record<DataEntity, number>>>({
    tickets: 10000, users: 5000, articles: 200, groups: 50, organizations: 100, macros: 50,
  });

  const [avgAttachments, setAvgAttachments] = useState<number>(0.5);
  const [avgSizeMB, setAvgSizeMB] = useState<number>(2);

  const [result, setResult] = useState<TimelineResult | null>(null);

  // Auto-select matches when platforms change
  useEffect(() => {
    const srcCap = PLATFORMS[source].capabilities.export;
    const dstCap = PLATFORMS[dest].capabilities.import;
    const matches = srcCap.filter(e => dstCap.includes(e));
    setSelectedEntities(matches);
  }, [source, dest]);

  useEffect(() => {
    const calcResult = calculateTimeline({
      source, sourcePlan,
      destination: dest, destPlan,
      selectedEntities,
      volumes,
      avgAttachmentsPerTicket: avgAttachments, avgAttachmentSizeMB: avgSizeMB,
    });
    setResult(calcResult);
  }, [source, sourcePlan, dest, destPlan, selectedEntities, volumes, avgAttachments, avgSizeMB]);

  const updateVolume = (entity: DataEntity, val: number) => {
    setVolumes(prev => ({ ...prev, [entity]: val }));
  };

  const formatTime = (hours: number) => {
    if (hours < 0.02) return `< 1m`;
    if (hours < 1) return `${Math.ceil(hours * 60)}m`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getIncompatibilityReason = (entity: DataEntity) => {
    const srcHasExport = PLATFORMS[source].capabilities.export.includes(entity);
    const dstHasImport = PLATFORMS[dest].capabilities.import.includes(entity);
    
    if (!srcHasExport) return `Source (${PLATFORMS[source].name}) missing Export API`;
    if (!dstHasImport) return `Destination (${PLATFORMS[dest].name}) missing Import API`;
    return "API Limitation";
  };

  const getManualItems = () => {
    const srcCap = PLATFORMS[source].capabilities.export;
    const dstCap = PLATFORMS[dest].capabilities.import;
    return srcCap.filter(e => !dstCap.includes(e));
  };

  const manualItemsList = getManualItems();

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-20 print:space-y-4 print:pb-0">
      
      {/* --- SECTION 1: CONFIGURATION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch print:hidden">
        
        {/* COL 1: SOURCE */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          <div className="mb-5 pb-4 border-b border-slate-100">
            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Step 1</span>
            <h2 className="text-lg font-bold text-slate-900 mt-2 flex items-center gap-2">
              Export From
            </h2>
          </div>
          <div className="space-y-3 mb-6">
            <select value={source} onChange={(e) => setSource(e.target.value as PlatformType)} className="w-full form-select text-sm border-slate-200 rounded-lg p-2.5 bg-slate-50 font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none">
              {Object.values(PLATFORMS).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={sourcePlan} onChange={(e) => setSourcePlan(e.target.value as PlanType)} className="w-full form-select text-xs border-slate-200 rounded-lg p-2 text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="growth">Growth Plan</option>
              <option value="professional">Professional Plan</option>
              <option value="enterprise">Enterprise Plan</option>
            </select>
          </div>
          <div className="mt-auto">
             <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capabilities ({PLATFORMS[source].capabilities.export.length})</span>
             </div>
             <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 max-h-48 overflow-y-auto">
               <ul className="space-y-1.5">
                 {PLATFORMS[source].capabilities.export.map(entity => (
                   <Tooltip key={entity} text={ENTITY_DESCRIPTIONS[entity]}>
                     <li className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-help w-full hover:text-blue-600">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"></span>
                       {ENTITY_LABELS[entity]}
                     </li>
                   </Tooltip>
                 ))}
               </ul>
             </div>
          </div>
        </div>

        {/* COL 2: DESTINATION */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
          <div className="mb-5 pb-4 border-b border-slate-100">
            <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Step 2</span>
            <h2 className="text-lg font-bold text-slate-900 mt-2 flex items-center gap-2">
              Import To
            </h2>
          </div>
          <div className="space-y-3 mb-6">
            <select value={dest} onChange={(e) => setDest(e.target.value as PlatformType)} className="w-full form-select text-sm border-slate-200 rounded-lg p-2.5 bg-slate-50 font-semibold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none">
              {Object.values(PLATFORMS).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={destPlan} onChange={(e) => setDestPlan(e.target.value as PlanType)} className="w-full form-select text-xs border-slate-200 rounded-lg p-2 text-slate-600 focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="growth">Growth Plan</option>
              <option value="professional">Professional Plan</option>
              <option value="enterprise">Enterprise Plan</option>
            </select>
          </div>
          <div className="mt-auto">
             <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capabilities ({PLATFORMS[dest].capabilities.import.length})</span>
             </div>
             <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 max-h-48 overflow-y-auto">
               <ul className="space-y-1.5">
                 {PLATFORMS[dest].capabilities.import.map(entity => (
                   <Tooltip key={entity} text={ENTITY_DESCRIPTIONS[entity]}>
                     <li className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-help w-full hover:text-purple-600">
                       <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                       {ENTITY_LABELS[entity]}
                     </li>
                   </Tooltip>
                 ))}
               </ul>
             </div>
          </div>
        </div>

        {/* COL 3: CAPABILITY MATRIX */}
        <div className="lg:col-span-4 bg-slate-900 rounded-xl shadow-lg p-5 text-white flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg width="120" height="120" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
          </div>

          <div className="mb-4 z-10">
            <h2 className="text-lg font-bold">Migration Analysis</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              We analyzed the API capabilities of both <strong>{PLATFORMS[source].name}</strong> and <strong>{PLATFORMS[dest].name}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6 z-10">
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
               <div>
                 <div className="text-[10px] font-bold uppercase text-slate-300">Automated</div>
                 <div className="text-[9px] text-slate-500">API to API</div>
               </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
               <div>
                 <div className="text-[10px] font-bold uppercase text-slate-300">Manual</div>
                 <div className="text-[9px] text-slate-500">API Gap</div>
               </div>
            </div>
          </div>

          <div className="mt-auto z-10">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Scope Summary</div>
             <div className="space-y-2">
                <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                  <span>Compatible Items</span>
                  <span className="font-mono text-green-400 font-bold">
                    {PLATFORMS[source].capabilities.export.filter(e => PLATFORMS[dest].capabilities.import.includes(e)).length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Incompatible Items</span>
                  <span className="font-mono text-red-400 font-bold">
                    {manualItemsList.length}
                  </span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* --- SECTION 2: SELECTION GRID (Hidden on Print) --- */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 print:hidden">
        <div className="mb-6 border-b border-slate-100 pb-4 flex justify-between items-end">
          <div>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Step 3</span>
            <h2 className="text-lg font-bold text-slate-900 mt-2">Select Scope & Volume</h2>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">
            <span className="font-bold text-slate-900">{selectedEntities.length}</span> API items selected
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS[source].capabilities.export.map(entity => {
            const canImport = PLATFORMS[dest].capabilities.import.includes(entity);
            const isSelected = selectedEntities.includes(entity);

            return (
              <div 
                key={entity}
                className={`border rounded-lg p-3 transition-all duration-200 ${
                  !canImport ? 'border-slate-100 bg-slate-50 opacity-70' : 
                  isSelected ? 'border-blue-300 bg-blue-50/20 shadow-md ring-1 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <input 
                    type="checkbox"
                    disabled={!canImport}
                    checked={isSelected}
                    onChange={() => setSelectedEntities(prev => prev.includes(entity) ? prev.filter(e => e !== entity) : [...prev, entity])}
                    className="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <div className="w-full">
                    <Tooltip text={ENTITY_DESCRIPTIONS[entity]}>
                      <span className={`block text-sm font-bold cursor-help ${!canImport ? 'text-slate-400' : 'text-slate-700'}`}>
                        {ENTITY_LABELS[entity]}
                      </span>
                    </Tooltip>
                    
                    {!canImport ? (
                      <span className="inline-block mt-1 text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase">
                         {getIncompatibilityReason(entity)}
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 uppercase">
                         API Compatible
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && canImport && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="relative">
                      <input 
                        type="number"
                        value={volumes[entity] || 0}
                        onChange={(e) => updateVolume(entity, Number(e.target.value))}
                        className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded text-sm font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">Qty</span>
                    </div>

                    {entity === 'tickets' && (
                      <div className="mt-2 grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Attachments</label>
                          <input type="number" step="0.1" value={avgAttachments} onChange={(e) => setAvgAttachments(Number(e.target.value))} className="w-full p-1 border border-slate-200 rounded text-xs"/>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Avg Size (MB)</label>
                          <input type="number" step="0.5" value={avgSizeMB} onChange={(e) => setAvgSizeMB(Number(e.target.value))} className="w-full p-1 border border-slate-200 rounded text-xs"/>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- SECTION 3: FINAL RESULTS (The Report Card) --- */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden relative print:shadow-none print:border-none">
          
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center print:bg-white print:border-b-2 print:border-slate-900">
             <div>
               <h2 className="text-xl font-bold text-slate-900">Migration Architecture Report</h2>
               <p className="text-xs text-slate-500 mt-1">Config: {PLATFORMS[source].name} ({sourcePlan}) &rarr; {PLATFORMS[dest].name} ({destPlan})</p>
             </div>
             <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border flex items-center gap-2 print:border-slate-900 print:text-slate-900 print:bg-transparent ${
               result.riskLevel === 'Low' ? 'bg-green-100 text-green-700 border-green-200' : 
               result.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
               'bg-red-50 text-red-700 border-red-200'
             }`}>
               <span className={`w-2 h-2 rounded-full ${result.riskLevel === 'Low' ? 'bg-green-500' : result.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-red-500'} print:hidden`}></span>
               {result.riskLevel} Complexity
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 print:grid-cols-2 print:divide-x">
            
            {/* Left Col: Timeline Breakdown */}
            <div className="p-8">
              <div className="flex flex-col items-center justify-center text-center mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Likely Runtime</p>
                <div className="text-6xl font-extrabold text-slate-900 tracking-tight">
                  {formatTime(result.totalDurationHours)}
                </div>
                
                {/* NEW: Confidence Bands */}
                <div className="flex gap-3 mt-3">
                   <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                     Best Case: {formatTime(result.minDurationHours)}
                   </span>
                   <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                     Worst Case: {formatTime(result.maxDurationHours)}
                   </span>
                </div>

                <div className="mt-4 px-3 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">
                   Bottleneck: {result.bottleneck}
                </div>
              </div>

               <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner mb-6 print:border print:border-slate-200">
                  <div className="bg-blue-500 h-full" style={{ width: `${(result.breakdown.foundation / result.totalDurationHours) * 100}%` }}></div>
                  <div className="bg-indigo-500 h-full" style={{ width: `${(result.breakdown.coreData / result.totalDurationHours) * 100}%` }}></div>
                  <div className="bg-purple-500 h-full" style={{ width: `${(result.breakdown.attachments / result.totalDurationHours) * 100}%` }}></div>
               </div>

              <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-100 pb-2 mb-4">Detailed Timeline</h3>
              <div className="space-y-3">
                {Object.entries(result.entityBreakdown || {}).map(([entity, hours]) => {
                  if (!hours || hours <= 0) return null;
                  return (
                    <div key={entity} className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-medium">{ENTITY_LABELS[entity as DataEntity]}</span>
                      <span className="font-mono font-bold text-slate-800">{formatTime(hours)}</span>
                    </div>
                  );
                })}
                {result.breakdown.attachments > 0 && (
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600 font-medium">Attachments (Files)</span>
                      <span className="font-mono font-bold text-purple-600">{formatTime(result.breakdown.attachments)}</span>
                    </div>
                )}
              </div>
            </div>

            {/* Right Col: Operational Impact & Manual Tasks */}
            <div className="p-8 bg-slate-50/30 print:bg-white">
              
              {/* NEW: Operational Impact Card */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6">
                <h3 className="text-xs font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Operational Impact
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Initial Data Sync</span>
                    <span className="font-mono font-bold">{formatTime(result.totalDurationHours)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Delta Sync (Cutover)</span>
                    <span className="font-mono font-bold text-blue-600">~30 Mins</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-slate-100 pt-2 mt-2">
                    <span className="font-bold text-slate-900">Required Downtime</span>
                    <span className="font-mono font-bold text-green-600">0 Mins</span>
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-100 pb-2 mb-4">
                Manual Attention Required ({manualItemsList.length})
              </h3>
              
              {manualItemsList.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 print:max-h-none print:overflow-visible">
                  {manualItemsList.map(entity => (
                    <div key={entity} className="bg-white p-3 rounded border border-slate-200 shadow-sm print:border-slate-300">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        <span className="text-sm font-bold text-slate-700">{ENTITY_LABELS[entity]}</span>
                      </div>
                      <div className="text-xs text-red-600 font-medium ml-6">
                        {getIncompatibilityReason(entity)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-slate-600">All available Source items are API compatible!</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer CTA (Hidden on Print) */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between print:hidden">
            <div>
              <p className="font-bold text-sm">Ready to execute this plan?</p>
              <p className="text-xs text-slate-400">Export this report or contact engineering.</p>
            </div>
            <div className="flex gap-3">
               <button 
                 onClick={handlePrint}
                 className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2"
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                 Download PDF
               </button>
               <button className="bg-white text-slate-900 hover:bg-blue-50 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors shadow-lg">
                 Book Engineer
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationCalculator;