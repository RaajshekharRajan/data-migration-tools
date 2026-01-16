import { PLATFORMS, ENTITY_LABELS } from '../data/platforms';
import { CalculatorInputs, TimelineResult, DataEntity } from '../types';

export const calculateTimeline = (inputs: CalculatorInputs): TimelineResult => {
  const srcConfig = PLATFORMS[inputs.source];
  const dstConfig = PLATFORMS[inputs.destination];
  
  const srcPlan = srcConfig.plans[inputs.sourcePlan];
  const dstPlan = dstConfig.plans[inputs.destPlan];

  // 1. Categorize Tasks (API vs Manual)
  const apiTasks: string[] = [];
  const manualTasks: string[] = [];

  inputs.selectedEntities.forEach(entity => {
    const canExport = srcConfig.capabilities.export.includes(entity);
    const canImport = dstConfig.capabilities.import.includes(entity);

    if (canExport && canImport) {
      apiTasks.push(ENTITY_LABELS[entity]);
    } else {
      manualTasks.push(ENTITY_LABELS[entity]);
    }
  });

  // 2. Determine Speed Limits (Bottleneck)
  const srcExportBatchSize = inputs.source === 'zendesk' ? 1000 : 30; 
  const srcLimit = srcPlan.exportLimit || srcPlan.requestsPerMinute;
  const srcRecordsPerMin = srcLimit * srcExportBatchSize;

  const dstImportBatchSize = dstConfig.features.batchSize; 
  const dstLimit = dstPlan.createTicketLimit || dstPlan.requestsPerMinute;
  const dstRecordsPerMin = dstLimit * dstImportBatchSize;

  const effectiveRecordsPerMin = Math.min(srcRecordsPerMin, dstRecordsPerMin);
  const bottleneckName = srcRecordsPerMin < dstRecordsPerMin 
    ? `${srcConfig.name} Export Limits` 
    : `${dstConfig.name} Import Limits`;

  // 3. Define Confidence Scenarios (Buffers)
  // APIs fluctuate. We calculate 3 scenarios to give a realistic range.
  const baseBuffer = Math.min(srcConfig.limits.throughputBuffer, dstConfig.limits.throughputBuffer);
  
  const scenarios = {
    likely: 1 - baseBuffer,        // Standard efficiency (e.g. ~80-85%)
    optimistic: 0.95,              // Best case (95% efficiency, low latency)
    conservative: 0.60             // Worst case (60% efficiency, heavy throttling/retries)
  };

  // 4. Calculation Helper
  const calculateDuration = (efficiency: number) => {
    const speed = effectiveRecordsPerMin * efficiency;
    const finalSpeed = speed > 0 ? speed : 1;

    let foundationMinutes = 0;
    let coreDataMinutes = 0; // Tickets
    const breakdown: Partial<Record<DataEntity, number>> = {};

    inputs.selectedEntities.forEach(entity => {
      const isApi = srcConfig.capabilities.export.includes(entity) && dstConfig.capabilities.import.includes(entity);
      if (!isApi) {
        breakdown[entity] = 0;
        return;
      }

      const volume = inputs.volumes[entity] || 0;
      let ops = volume;

      // Apply complexity multiplier for heavy items like Tickets
      if (entity === 'tickets') {
        ops = volume * dstConfig.features.complexityMultiplier;
      }

      const minutes = ops / finalSpeed;
      breakdown[entity] = minutes / 60; // Store as hours

      if (entity === 'tickets') {
        coreDataMinutes += minutes;
      } else {
        foundationMinutes += minutes;
      }
    });

    return { foundationMinutes, coreDataMinutes, breakdown };
  };

  // Run calculations for all 3 scenarios
  const likely = calculateDuration(scenarios.likely);
  const optimistic = calculateDuration(scenarios.optimistic);
  const conservative = calculateDuration(scenarios.conservative);

  // 5. Attachments (Bandwidth Bound) 
  // We apply variance here too (network conditions fluctuate)
  let attachmentMinutes = 0;
  let totalDataMB = 0;
  if (inputs.selectedEntities.includes('tickets')) {
    const ticketCount = inputs.volumes['tickets'] || 0;
    const totalAttachments = ticketCount * inputs.avgAttachmentsPerTicket;
    totalDataMB = totalAttachments * inputs.avgAttachmentSizeMB;
    const estimatedBandwidthMBPerMin = 90; // ~1.5 MB/s conservative avg
    attachmentMinutes = totalDataMB / estimatedBandwidthMBPerMin;
  }
  
  const attLikely = attachmentMinutes;
  const attOptimistic = attachmentMinutes * 0.9; // 10% faster upload
  const attConservative = attachmentMinutes * 1.3; // 30% slower upload

  // 6. Sum Totals
  const totalLikely = (likely.foundationMinutes + likely.coreDataMinutes + attLikely) / 60;
  const totalOptimistic = (optimistic.foundationMinutes + optimistic.coreDataMinutes + attOptimistic) / 60;
  const totalConservative = (conservative.foundationMinutes + conservative.coreDataMinutes + attConservative) / 60;

  // 7. Risk Assessment
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
  const ticketCount = inputs.volumes['tickets'] || 0;
  
  if (ticketCount > 100000 || totalDataMB > 50000) riskLevel = 'High';
  else if (manualTasks.length > 2 || ticketCount > 50000) riskLevel = 'Medium'; 

  return {
    totalDurationHours: totalLikely,
    minDurationHours: totalOptimistic,
    maxDurationHours: totalConservative,
    
    breakdown: {
      foundation: likely.foundationMinutes / 60,
      coreData: likely.coreDataMinutes / 60,
      attachments: attLikely / 60,
    },
    entityBreakdown: likely.breakdown, // We use "Likely" for the detailed list
    bottleneck: bottleneckName,
    riskLevel,
    apiTasks,
    manualTasks
  };
};