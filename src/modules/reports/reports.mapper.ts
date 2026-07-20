import type { ReportEntity } from '../../domain/types';
import { buildPlatformConfidence } from '../../common/utils/confidence';

export function toApiReport(r: ReportEntity) {
  return {
    id: r.id,
    reference: r.reference,
    identifier_type: r.identifierType,
    masked_identifier: r.maskedIdentifier,
    masked_email: r.maskedEmail,
    masked_phone: r.maskedPhone,
    category: r.category,
    description: r.description,
    incident_date: r.incidentDate,
    independent_source_count: r.independentSourceCount,
    confidence: r.confidence,
    earnings_generated: r.earningsGenerated,
    submitted_at: r.submittedAt,
  };
}

export function toPlatformReport(r: ReportEntity) {
  return {
    id: r.id,
    reference: r.reference,
    fullName: r.fullName,
    bank: r.bank,
    maskedAccountNumber: r.maskedAccountNumber,
    maskedPhone: r.maskedPhone,
    maskedEmail: r.maskedEmail,
    maskedBvn:
      r.identifierType === 'bvn' ? r.maskedIdentifier : undefined,
    maskedNin:
      r.identifierType === 'nin' ? r.maskedIdentifier : undefined,
    category: r.category,
    description: r.description,
    incidentDate: r.incidentDate,
    amountInvolved: r.amountInvolved,
    independentSourceCount: r.independentSourceCount,
    confidence: buildPlatformConfidence(r.independentSourceCount),
    earningsGenerated: r.earningsGenerated,
    submittedAt: r.submittedAt,
  };
}
