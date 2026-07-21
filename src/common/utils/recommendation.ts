import type {
  ReportCategory,
  VerificationResult,
} from '../../domain/types';
import { levelFromCount } from './confidence';

export type RecommendationAction = 'proceed' | 'review' | 'decline';

export type RecommendationSeverity =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface VerificationRecommendation {
  action: RecommendationAction;
  severity: RecommendationSeverity;
  title: string;
  summary: string;
}

const HIGH_RISK_CATEGORIES: ReportCategory[] = [
  'fraud',
  'mule_account',
  'loan_fraud',
  'identity_theft',
];

function categoryHint(categories?: ReportCategory[]): string {
  if (!categories?.length) return '';
  const labels = categories.map((c) => c.replace(/_/g, ' ')).join(', ');
  return ` Report categories include ${labels}.`;
}

export function buildVerificationRecommendation(input: {
  result: VerificationResult;
  sourceCount: number;
  categories?: ReportCategory[];
}): VerificationRecommendation {
  if (input.result === 'no_match') {
    return {
      action: 'proceed',
      severity: 'none',
      title: 'No adverse signals',
      summary:
        'Rain found no matching reports in the network. Continue with your standard onboarding and KYC checks.',
    };
  }

  const level = levelFromCount(input.sourceCount);
  const severe = input.categories?.some((c) =>
    HIGH_RISK_CATEGORIES.includes(c),
  );
  const hint = categoryHint(input.categories);

  if (level === 'very_high') {
    return {
      action: 'decline',
      severity: 'critical',
      title: 'Critical alert: do not proceed',
      summary: `Very high confidence: ${input.sourceCount} independent institutions reported this identifier.${hint} Decline onboarding or escalate to compliance immediately.`,
    };
  }

  if (level === 'high') {
    return {
      action: 'decline',
      severity: severe ? 'critical' : 'high',
      title: severe ? 'High alert: block onboarding' : 'Strong adverse signal',
      summary: severe
        ? `${input.sourceCount} institutions flagged this identifier with serious fraud-related categories.${hint} We recommend declining until compliance clears the case.`
        : `${input.sourceCount} independent institutions reported this identifier.${hint} Decline or hold the application for manual compliance review.`,
    };
  }

  if (level === 'medium') {
    return {
      action: 'review',
      severity: 'medium',
      title: 'Manual review required',
      summary: `${input.sourceCount} institutions reported this identifier.${hint} Have an analyst review before approving.`,
    };
  }

  return {
    action: 'review',
    severity: 'low',
    title: 'Review recommended',
    summary: `A limited network signal exists (${input.sourceCount} institution). Apply extra verification before proceeding.${hint}`,
  };
}
