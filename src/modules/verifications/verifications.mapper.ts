import type { VerificationEntity } from '../../domain/types';
import { buildPlatformConfidence } from '../../common/utils/confidence';

export function toApiVerification(v: VerificationEntity) {
  return {
    id: v.id,
    reference: v.reference,
    identifier_type: v.identifierType,
    masked_identifier: v.maskedIdentifier,
    result: v.result,
    confidence: v.confidence,
    independent_source_count: v.independentSourceCount,
    total_reports: v.totalReports,
    categories: v.categories,
    first_reported_at: v.firstReportedAt,
    most_recent_report_at: v.mostRecentReportAt,
    created_at: v.createdAt,
  };
}

export function toPlatformVerification(v: VerificationEntity) {
  return {
    id: v.id,
    reference: v.reference,
    identifierType: v.identifierType,
    maskedIdentifier: v.maskedIdentifier,
    result: v.result,
    confidence: v.confidence
      ? buildPlatformConfidence(v.confidence.independent_source_count)
      : null,
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
