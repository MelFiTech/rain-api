import type { VerificationEntity } from '../../domain/types';
import { buildPlatformConfidence } from '../../common/utils/confidence';
import { buildVerificationRecommendation } from '../../common/utils/recommendation';

function recommendationPayload(v: VerificationEntity) {
  return buildVerificationRecommendation({
    result: v.result,
    sourceCount: v.independentSourceCount,
    categories: v.categories,
  });
}

export function toApiVerification(v: VerificationEntity) {
  const recommendation = recommendationPayload(v);
  return {
    id: v.id,
    reference: v.reference,
    identifier_type: v.identifierType,
    masked_identifier: v.maskedIdentifier,
    result: v.result,
    confidence: v.confidence,
    recommendation: {
      action: recommendation.action,
      severity: recommendation.severity,
      title: recommendation.title,
      summary: recommendation.summary,
    },
    independent_source_count: v.independentSourceCount,
    total_reports: v.totalReports,
    categories: v.categories,
    first_reported_at: v.firstReportedAt,
    most_recent_report_at: v.mostRecentReportAt,
    created_at: v.createdAt,
  };
}

export function toPlatformVerification(v: VerificationEntity) {
  const recommendation = recommendationPayload(v);
  return {
    id: v.id,
    reference: v.reference,
    identifierType: v.identifierType,
    maskedIdentifier: v.maskedIdentifier,
    result: v.result,
    confidence: v.confidence
      ? buildPlatformConfidence(v.confidence.independent_source_count)
      : null,
    recommendation,
    independentSourceCount: v.independentSourceCount,
    totalReports: v.totalReports,
    categories: v.categories,
    firstReportedAt: v.firstReportedAt,
    mostRecentReportAt: v.mostRecentReportAt,
    matchingIdentifiers: [v.maskedIdentifier],
    amountCharged: v.amountCharged,
    createdAt: v.createdAt,
  };
}
