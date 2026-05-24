import { ALL_TRANSITION_POLICIES, TransitionPolicy } from "./transition-policies";

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
