export interface GamePublicationFacts {
  readonly publishedAt: string;
  readonly manifestKey: string;
  readonly publishedSizeBytes: number;
  readonly fileCount: number;
}

/**
 * Narrow command port used while publishing one already-allocated numeric game version.
 * Publisher-specific identity, authorization and review lifecycle never cross this boundary.
 */
export interface GameVersionPublicationRepository {
  markPublishing(versionId: number): Promise<void>;
  markReady(versionId: number, facts: GamePublicationFacts): Promise<void>;
  markFailed(versionId: number, safeReason: string): Promise<void>;
}
