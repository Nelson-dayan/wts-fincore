import { ALL_TRANSITION_POLICIES, TransitionPolicy, TransitionSideEffect, PolicyMetadata } from "./transition-policies";

export interface RecommendationResult {
  canTransition: boolean;
  recommendedStatus?: string;
  policyId?: string;
  blockers: string[];
}

export async function assessTransitions(params: {
  entityType: "quotation" | "purchase_order" | "invoice" | "project" | "client";
  entity: any;
  ctx?: any;
}): Promise<RecommendationResult[]> {
  const policies = Object.values(ALL_TRANSITION_POLICIES).filter(
    p => p.entityType === params.entityType && p.from.includes(params.entity.status)
  );

  const results: RecommendationResult[] = [];

  for (const policy of policies) {
    const blockers: string[] = [];

    for (const condition of policy.conditions) {
      try {
        const check = await condition.validate(params.entity, params.ctx);
        if (!check.ok) {
          blockers.push(check.blocker || condition.description);
        }
      } catch (err: any) {
        blockers.push(`Condition verification error (${condition.code}): ${err.message}`);
      }
    }

    results.push({
      canTransition: blockers.length === 0,
      recommendedStatus: policy.to,
      policyId: policy.id,
      blockers
    });
  }

  return results;
}

export interface SimulationResult {
  allowed: boolean;
  policyId?: string;
  blockers: string[];
  warnings: string[];
  sideEffects: TransitionSideEffect[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  contractVersion: string;
  metadata?: PolicyMetadata;
}

export async function simulateTransition(params: {
  entityType: "quotation" | "purchase_order" | "invoice" | "project" | "client";
  entity: any;
  targetState: string;
  ctx?: any;
}): Promise<SimulationResult> {
  const policy = Object.values(ALL_TRANSITION_POLICIES).find(
    p => p.entityType === params.entityType && 
         p.to === params.targetState && 
         p.from.includes(params.entity.status)
  );

  if (!policy) {
    return {
      allowed: false,
      blockers: [`No valid transition policy defined from state '${params.entity.status}' to '${params.targetState}'.`],
      warnings: [],
      sideEffects: [],
      confidence: "HIGH",
      contractVersion: "v1"
    };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const condition of policy.conditions) {
    try {
      const check = await condition.validate(params.entity, params.ctx);
      if (!check.ok) {
        blockers.push(check.blocker || condition.description);
      }
    } catch (err: any) {
      blockers.push(`Condition verification error (${condition.code}): ${err.message}`);
    }
  }

  if (params.entityType === "invoice") {
    const totalIntended = params.entity.totalsCache?.totalIntendedBase ? Number(params.entity.totalsCache.totalIntendedBase) : 0;
    if (totalIntended <= 0) {
      warnings.push("Invoice has an intended total amount of zero.");
    }
  }

  return {
    allowed: blockers.length === 0,
    policyId: policy.id,
    blockers,
    warnings,
    sideEffects: policy.sideEffects || [],
    confidence: "HIGH",
    contractVersion: "v1",
    metadata: policy.metadata
  };
}
