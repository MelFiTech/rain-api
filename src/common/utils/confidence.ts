import type { ConfidenceInfo, ConfidenceLevel } from '../../domain/types';

export function levelFromCount(sourceCount: number): ConfidenceLevel {
  if (sourceCount >= 10) return 'very_high';
  if (sourceCount >= 5) return 'high';
  if (sourceCount >= 2) return 'medium';
  return 'low';
}

const levelLabel: Record<ConfidenceLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
};

/** Public API confidence shape (matches developer docs). */
export function buildApiConfidence(sourceCount: number): ConfidenceInfo {
  const level = levelFromCount(sourceCount);
  const labelWord = levelLabel[level];
  const institutions =
    sourceCount === 1
      ? '1 independent institution'
      : `${sourceCount} independent institutions`;

  return {
    level,
    independent_source_count: sourceCount,
    label: `${labelWord} · ${sourceCount}`,
    description: `${institutions} reported this identifier.`,
  };
}

/** Dashboard / platform confidence (matches rain-web). */
export function buildPlatformConfidence(sourceCount: number): {
  level: ConfidenceLevel;
  independentSourceCount: number;
  label: string;
  description: string;
} {
  const level = levelFromCount(sourceCount);
  const labelWord = levelLabel[level];
  const institutions =
    sourceCount === 1
      ? '1 independent institution'
      : `${sourceCount} independent institutions`;

  return {
    level,
    independentSourceCount: sourceCount,
    label: labelWord,
    description: `${labelWord} confidence, reported by ${institutions}.`,
  };
}
