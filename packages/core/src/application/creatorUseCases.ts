import { GAME_MANIFEST_MAP } from "../registry/gameRegistry.generated.js";
import { levelForTotalXp } from "../domain/progression.js";
import {
  FEATURED_POLICY,
  evaluateFeaturedInitial,
  evaluateFeaturedRevalidation,
  evaluateFeaturedRecheck,
  type FeaturedReviewStatus,
  type FeaturedRevalidationDecision,
  type RecheckFeaturedDecision,
} from "../domain/featuredPolicy.js";
import type {
  CreatorReviewAction,
  CreatorManualReviewDecisionResult,
  CreatorReviewAuditResult,
  CreatorRepository,
  CreatorRankEntry,
  CreatorPlatformType,
  CreatorProfile,
  CreatorPlatformAccount,
  CreatorReviewRepository,
  CreatorReviewJob,
  CreatorReviewQueueResult,
} from "../ports/repositories.js";
import type { CreatorChannelInfo, CreatorProviderAdapter } from "../ports/creatorProvider.js";

export interface FeaturedReviewRunSummary {
  processed: number;
  featured: number;
  notEligible: number;
  manualReview: number;
  failed: number;
}

export interface FeaturedRevalidationRunSummary {
  processed: number;
  retained: number;
  revoked: number;
  manualReview: number;
  failed: number;
}

export class CreatorUseCases {
  constructor(
    private creatorRepo: CreatorRepository,
    private reviewRepo?: CreatorReviewRepository,
  ) {}

  async getCreatorRankings(options: {
    mode: "score" | "xp";
    gameId?: string;
    platform?: CreatorPlatformType;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: CreatorRankEntry[]; total: number }> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);

    const selectedGameId = options.gameId && options.gameId !== "all" ? options.gameId : undefined;
    const manifest = selectedGameId ? GAME_MANIFEST_MAP[selectedGameId] : undefined;
    const direction = manifest?.scoreConfig?.direction ?? "desc";

    const queryOpts: {
      mode: "score" | "xp";
      gameId?: string;
      direction?: "asc" | "desc";
      platform?: CreatorPlatformType;
      limit?: number;
      offset?: number;
    } = {
      mode: options.mode,
      direction,
      limit,
      offset,
    };
    if (selectedGameId !== undefined) queryOpts.gameId = selectedGameId;
    if (options.platform !== undefined) queryOpts.platform = options.platform;

    const res = await this.creatorRepo.getCreatorRankings(queryOpts);

    const entries: CreatorRankEntry[] = res.entries.map((entry) => {
      if (options.mode === "score" && entry.gameId && entry.score !== undefined) {
        const gManifest = GAME_MANIFEST_MAP[entry.gameId];
        const formattedScore = gManifest?.scoreConfig
          ? `${entry.score.toLocaleString()} ${gManifest.scoreConfig.unit}`
          : String(entry.score);
        return {
          ...entry,
          formattedScore,
          gameTitle: gManifest ? gManifest.title : entry.gameId,
        };
      } else if (options.mode === "xp" && entry.totalXp !== undefined) {
        const level = levelForTotalXp(entry.totalXp);
        return {
          ...entry,
          level,
        };
      }
      return entry;
    });

    return { entries, total: res.total };
  }

  async getCreatorProfileByUserId(
    userId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null> {
    return this.creatorRepo.findProfileByUserId(userId);
  }

  /**
   * 프로필 단위로 가장 최근 Featured 심사/재심사 잡을 반환합니다 (UI 상태 표시용).
   */
  async getFeaturedReviewState(userId: number): Promise<CreatorReviewJob | null> {
    if (!this.reviewRepo) return null;
    const profile = await this.creatorRepo.findProfileByUserId(userId);
    if (!profile || profile.platformAccounts.length === 0) return null;
    return this.reviewRepo.findLatestJobByAccountIds(profile.platformAccounts.map((a) => a.id));
  }

  async listManualCreatorReviews(options: {
    limit?: number;
    offset?: number;
  }): Promise<CreatorReviewQueueResult & { audits: CreatorReviewAuditResult }> {
    if (!this.reviewRepo) {
      return { items: [], total: 0, audits: { entries: [], total: 0 } };
    }

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const offset = Math.max(options.offset ?? 0, 0);
    const [queue, audits] = await Promise.all([
      this.reviewRepo.listManualReviewQueue(limit, offset),
      this.reviewRepo.listAuditLogs(20, 0),
    ]);
    return { ...queue, audits };
  }

  async applyManualCreatorReview(input: {
    jobId: number;
    reviewerUserId: number;
    action: CreatorReviewAction;
    reason: string;
    now?: Date;
  }): Promise<CreatorManualReviewDecisionResult> {
    const reason = input.reason.trim();
    if (reason.length < 3) {
      return {
        applied: false,
        code: "INVALID_REASON",
        previousStatus: null,
        newStatus: null,
      };
    }
    if (!this.reviewRepo) {
      return {
        applied: false,
        code: "NOT_FOUND",
        previousStatus: null,
        newStatus: null,
      };
    }

    const nowMs = input.now?.getTime() ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const publicProfileReason =
      input.action === "APPROVE_FEATURED"
        ? "운영진 심사 승인"
        : input.action === "REJECT_FEATURED"
          ? "운영진 심사 결과 기준 미달"
          : "운영진 추가 확인 대기";

    return this.reviewRepo.applyManualReviewDecision({
      jobId: input.jobId,
      reviewerUserId: input.reviewerUserId,
      action: input.action,
      reason,
      publicProfileReason,
      nextRevalidationAt: new Date(nowMs + FEATURED_POLICY.REVALIDATION_INTERVAL_MS).toISOString(),
      nowIso,
    });
  }

  async verifyChannelOwnership(
    userId: number,
    channelInfo: CreatorChannelInfo,
  ): Promise<
    | {
        ok: true;
        profile: CreatorProfile;
        platformAccount: CreatorPlatformAccount;
        featuredReview: CreatorReviewJob | null;
      }
    | {
        ok: false;
        code: string;
        message: string;
      }
  > {
    // 1. Single-owner invariant: Check if another GAMEMOA user has ALREADY verified this identical platform + platformUserId channel
    const existingPlatformAcc = await this.creatorRepo.findPlatformAccount(
      channelInfo.platform,
      channelInfo.platformUserId,
    );

    if (existingPlatformAcc && existingPlatformAcc.verificationStatus === "VERIFIED") {
      const existingProfile = await this.creatorRepo.findProfileById(existingPlatformAcc.creatorId);
      if (existingProfile && existingProfile.userId !== userId) {
        return {
          ok: false,
          code: "CHANNEL_ALREADY_VERIFIED",
          message: "이 채널은 이미 다른 GAMEMOA 크리에이터 계정에 연동되어 있습니다.",
        };
      }
    }

    // 2. Ensure Creator profile exists / is updated for this user (status: 'VERIFIED')
    const profile = await this.creatorRepo.upsertProfile({
      userId,
      status: "VERIFIED",
    });

    // 3. Upsert platform account for this creator with canonical ID
    const platformAccount = await this.creatorRepo.upsertPlatformAccount({
      creatorId: profile.id,
      platform: channelInfo.platform,
      platformUserId: channelInfo.platformUserId,
      channelName: channelInfo.channelName,
      channelHandle: channelInfo.channelHandle,
      channelUrl: channelInfo.channelUrl,
      avatarUrl: channelInfo.avatarUrl,
      verificationStatus: "VERIFIED",
      audienceCount: channelInfo.audienceCount ?? 0,
      channelCreatedAt: channelInfo.channelCreatedAt ?? null,
    });

    // 4. Featured qualification: 평가는 소유권 스냅샷만으로 FEATURED를 부여하지 않고,
    //    AUTO_REVIEW_PENDING / MANUAL_REVIEW / NOT_ELIGIBLE만 결정합니다.
    let featuredReview: CreatorReviewJob | null = null;
    if (this.reviewRepo) {
      const decision = evaluateFeaturedInitial({
        ownershipVerified: true,
        audienceCount: channelInfo.audienceCount !== undefined ? channelInfo.audienceCount : null,
        channelCreatedAt: channelInfo.channelCreatedAt ?? null,
      });

      featuredReview = await this.reviewRepo.createOrResetJob({
        creatorPlatformAccountId: platformAccount.id,
        initialAudience: channelInfo.audienceCount !== undefined ? channelInfo.audienceCount : null,
        initialChannelCreatedAt: channelInfo.channelCreatedAt ?? null,
        nextCheckAt: new Date(Date.now() + FEATURED_POLICY.REVIEW_INTERVAL_MS).toISOString(),
      });

      await this.creatorRepo.upsertProfile({
        userId,
        status: "VERIFIED",
        featuredReason: decision.reason,
      });
    }

    return {
      ok: true,
      profile,
      platformAccount,
      featuredReview,
    };
  }

  /**
   * 스케줄러(6시간) 진입점: 예정 시각이 지난 AUTO_REVIEW_PENDING / FAILED_RETRYABLE 잡을
   * 바운디드 배치로 처리합니다. 단일 잡/프로바이더 실패가 나머지 잡 처리를 막지 않습니다.
   */
  async runDueFeaturedReviews(options: {
    adapters: Record<CreatorPlatformType, CreatorProviderAdapter>;
    now?: Date;
    batchSize?: number;
  }): Promise<FeaturedReviewRunSummary> {
    if (!this.reviewRepo) {
      return { processed: 0, featured: 0, notEligible: 0, manualReview: 0, failed: 0 };
    }

    const nowMs = options.now?.getTime() ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const batchSize = Math.min(
      Math.max(options.batchSize ?? FEATURED_POLICY.DEFAULT_BATCH_SIZE, 1),
      FEATURED_POLICY.MAX_BATCH_SIZE,
    );

    const jobs = await this.reviewRepo.listDuePendingJobs(batchSize, nowIso);
    const summary: FeaturedReviewRunSummary = {
      processed: jobs.length,
      featured: 0,
      notEligible: 0,
      manualReview: 0,
      failed: 0,
    };

    for (const job of jobs) {
      try {
        const outcome = await this.processReviewJob(job, options.adapters, nowMs);
        if (outcome === "FEATURED") summary.featured += 1;
        else if (outcome === "NOT_ELIGIBLE") summary.notEligible += 1;
        else if (outcome === "MANUAL_REVIEW") summary.manualReview += 1;
        else summary.failed += 1;
      } catch (err) {
        summary.failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        const nextCheckAt = new Date(nowMs + FEATURED_POLICY.RETRY_INTERVAL_MS).toISOString();

        if (job.attemptCount + 1 >= FEATURED_POLICY.MAX_ATTEMPTS) {
          await this.completeAndSetProfileReason(
            job,
            "MANUAL_REVIEW",
            nowIso,
            "자동 심사 재시도 횟수 초과로 추가 확인이 필요합니다.",
          );
        } else {
          await this.reviewRepo.markJobFailed(job.id, message, nextCheckAt, nowIso);
        }
      }
    }

    return summary;
  }

  private async processReviewJob(
    job: CreatorReviewJob,
    adapters: Record<CreatorPlatformType, CreatorProviderAdapter>,
    nowMs: number,
  ): Promise<RecheckFeaturedDecision | "FAILED_RETRYABLE"> {
    const nowIso = new Date(nowMs).toISOString();
    const reviewRepo = this.reviewRepo;
    if (!reviewRepo) return "FAILED_RETRYABLE";

    const account = await this.creatorRepo.findPlatformAccountById(job.creatorPlatformAccountId);
    if (!account) {
      await this.completeAndSetProfileReason(
        job,
        "NOT_ELIGIBLE",
        nowIso,
        "채널 계정이 존재하지 않습니다.",
      );
      return "NOT_ELIGIBLE";
    }

    const profile = await this.creatorRepo.findProfileById(account.creatorId);
    const userId = profile?.userId;

    // 소유권이 VERIFIED 상태가 아니면 Featured 자격 부여 불가
    if (account.verificationStatus !== "VERIFIED") {
      await this.completeAndSetProfileReason(
        job,
        "NOT_ELIGIBLE",
        nowIso,
        "채널 소유권이 검증되지 않아 Featured 자격을 부여할 수 없습니다.",
        userId,
      );
      return "NOT_ELIGIBLE";
    }

    // 사용자 토큰 없이 공식 app-level 지표 재조회가 불가능한 플랫폼 → 안전하게 MANUAL_REVIEW
    const adapter = adapters[account.platform];
    if (!adapter || !adapter.supportsAutomaticMetricRefresh()) {
      await this.completeAndSetProfileReason(
        job,
        "MANUAL_REVIEW",
        nowIso,
        "자동 재심사 미지원 플랫폼 — 추가 확인이 필요합니다.",
        userId,
      );
      return "MANUAL_REVIEW";
    }

    // 신선한 공식 지표 조회 (실패 시 상위 catch에서 FAILED_RETRYABLE 처리)
    const metrics = await adapter.fetchChannelMetrics(account.platformUserId);

    // 플랫폼이 필수 지표를 공식 API로 제공하지 않으면 추정 금지 → MANUAL_REVIEW
    if (metrics.audienceCount === null || metrics.channelCreatedAt === null) {
      await this.completeAndSetProfileReason(
        job,
        "MANUAL_REVIEW",
        nowIso,
        "공식 지표 일부를 제공하지 않는 플랫폼 — 추가 확인이 필요합니다.",
        userId,
      );
      return "MANUAL_REVIEW";
    }

    const decision = evaluateFeaturedRecheck({
      audienceCount: metrics.audienceCount,
      channelCreatedAt: metrics.channelCreatedAt,
      nowMs,
    });

    // 공식 지표 저장 (metrics_synced_at 갱신)
    await this.creatorRepo.updatePlatformAccountMetrics(account.id, {
      audienceCount: metrics.audienceCount,
      channelCreatedAt: metrics.channelCreatedAt,
      syncedAt: nowIso,
    });

    // 잡 전이: 이미 다른 실행에서 전이된 경우(멱등) 프로필 전이를 건너뜁니다.
    const transitioned = await reviewRepo.completeJob(
      job.id,
      decision.status,
      nowIso,
      decision.reason,
    );
    if (!transitioned) return decision.status;

    if (decision.status === "FEATURED" && userId !== undefined) {
      await this.creatorRepo.upsertProfile({
        userId,
        status: "VERIFIED",
        featuredStatus: "FEATURED",
        featuredReason: decision.reason,
      });
      try {
        await reviewRepo.scheduleRevalidationJob({
          creatorPlatformAccountId: account.id,
          nextCheckAt: new Date(nowMs + FEATURED_POLICY.REVALIDATION_INTERVAL_MS).toISOString(),
          nowIso,
        });
      } catch {
        // 다음 Cron의 보충 단계가 누락된 재검증 잡을 다시 예약합니다.
      }
    } else if (userId !== undefined) {
      await this.creatorRepo.upsertProfile({
        userId,
        status: "VERIFIED",
        featuredReason: decision.reason,
      });
    }

    return decision.status;
  }

  /** 기존 Featured 계정에 누락된 14일 재검증 잡을 제한된 수만큼 보충합니다. */
  async ensureFeaturedRevalidationJobs(options?: {
    now?: Date;
    batchSize?: number;
  }): Promise<number> {
    if (!this.reviewRepo) return 0;
    const nowMs = options?.now?.getTime() ?? Date.now();
    const limit = Math.min(
      Math.max(options?.batchSize ?? FEATURED_POLICY.DEFAULT_BATCH_SIZE, 1),
      FEATURED_POLICY.MAX_BATCH_SIZE,
    );
    const nowIso = new Date(nowMs).toISOString();
    return this.reviewRepo.ensureRevalidationJobs(
      limit,
      new Date(nowMs + FEATURED_POLICY.REVALIDATION_INTERVAL_MS).toISOString(),
      nowIso,
    );
  }

  /** 14일 Featured 재검증 파이프라인. 6시간 취득 심사와 별도 잡/배치로 실행합니다. */
  async runDueFeaturedRevalidations(options: {
    adapters: Record<CreatorPlatformType, CreatorProviderAdapter>;
    now?: Date;
    batchSize?: number;
  }): Promise<FeaturedRevalidationRunSummary> {
    if (!this.reviewRepo) {
      return { processed: 0, retained: 0, revoked: 0, manualReview: 0, failed: 0 };
    }

    const nowMs = options.now?.getTime() ?? Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const batchSize = Math.min(
      Math.max(options.batchSize ?? FEATURED_POLICY.DEFAULT_BATCH_SIZE, 1),
      FEATURED_POLICY.MAX_BATCH_SIZE,
    );
    const jobs = await this.reviewRepo.listDueRevalidationJobs(batchSize, nowIso);
    const summary: FeaturedRevalidationRunSummary = {
      processed: jobs.length,
      retained: 0,
      revoked: 0,
      manualReview: 0,
      failed: 0,
    };

    for (const job of jobs) {
      try {
        const outcome = await this.processRevalidationJob(job, options.adapters, nowMs);
        if (outcome === "RETAIN_FEATURED") summary.retained += 1;
        else if (outcome === "REVOKE_FEATURED") summary.revoked += 1;
        else summary.manualReview += 1;
      } catch {
        summary.failed += 1;
        const nextCheckAt = new Date(
          nowMs + FEATURED_POLICY.REVALIDATION_RETRY_INTERVAL_MS,
        ).toISOString();
        if (job.attemptCount + 1 >= FEATURED_POLICY.MAX_ATTEMPTS) {
          await this.completeAndSetProfileReason(
            job,
            "MANUAL_REVIEW",
            nowIso,
            "자동 Featured 재검증에 실패하여 추가 확인이 필요합니다.",
          );
        } else {
          await this.reviewRepo.markJobFailed(
            job.id,
            "재검증 공식 API 일시 실패",
            nextCheckAt,
            nowIso,
          );
        }
      }
    }

    return summary;
  }

  private async processRevalidationJob(
    job: CreatorReviewJob,
    adapters: Record<CreatorPlatformType, CreatorProviderAdapter>,
    nowMs: number,
  ): Promise<FeaturedRevalidationDecision> {
    const nowIso = new Date(nowMs).toISOString();
    const reviewRepo = this.reviewRepo;
    if (!reviewRepo) return "MANUAL_REVIEW";

    const account = await this.creatorRepo.findPlatformAccountById(job.creatorPlatformAccountId);
    if (!account) {
      await this.completeAndSetProfileReason(
        job,
        "NOT_ELIGIBLE",
        nowIso,
        "채널 계정이 존재하지 않아 Featured 자격을 유지할 수 없습니다.",
      );
      return "REVOKE_FEATURED";
    }

    const profile = await this.creatorRepo.findProfileById(account.creatorId);
    const userId = profile?.userId;
    if (!profile || profile.featuredStatus !== "FEATURED") {
      await this.completeAndSetProfileReason(
        job,
        "NOT_ELIGIBLE",
        nowIso,
        "현재 Featured 상태가 아니므로 재검증을 종료합니다.",
        userId,
      );
      return "REVOKE_FEATURED";
    }

    if (account.verificationStatus !== "VERIFIED") {
      await this.completeAndSetProfileReason(
        job,
        "NOT_ELIGIBLE",
        nowIso,
        "채널 소유권 검증이 유효하지 않아 Featured 자격을 철회합니다.",
        userId,
        "NONE",
      );
      return "REVOKE_FEATURED";
    }

    const adapter = adapters[account.platform];
    if (!adapter || !adapter.supportsAutomaticMetricRefresh()) {
      await this.completeAndSetProfileReason(
        job,
        "MANUAL_REVIEW",
        nowIso,
        "자동 재검증 미지원 플랫폼 — Featured를 자동 변경하지 않고 추가 확인이 필요합니다.",
        userId,
      );
      return "MANUAL_REVIEW";
    }

    const metrics = await adapter.fetchChannelMetrics(account.platformUserId);
    const decision = evaluateFeaturedRevalidation({
      audienceCount: metrics.audienceCount,
      channelState: metrics.channelState,
    });

    await this.creatorRepo.updatePlatformAccountMetrics(account.id, {
      audienceCount: metrics.audienceCount ?? account.audienceCount ?? null,
      channelCreatedAt: metrics.channelCreatedAt ?? account.channelCreatedAt ?? null,
      syncedAt: nowIso,
    });

    const status =
      decision.status === "RETAIN_FEATURED"
        ? "FEATURED"
        : decision.status === "REVOKE_FEATURED"
          ? "NOT_ELIGIBLE"
          : "MANUAL_REVIEW";
    const transitioned = await reviewRepo.completeJob(job.id, status, nowIso, decision.reason);
    if (!transitioned) return decision.status;

    if (userId !== undefined) {
      await this.creatorRepo.upsertProfile({
        userId,
        status: "VERIFIED",
        ...(decision.status === "REVOKE_FEATURED" ? { featuredStatus: "NONE" as const } : {}),
        featuredReason: decision.reason,
      });
    }

    if (decision.status === "RETAIN_FEATURED") {
      try {
        await reviewRepo.scheduleRevalidationJob({
          creatorPlatformAccountId: account.id,
          nextCheckAt: new Date(nowMs + FEATURED_POLICY.REVALIDATION_INTERVAL_MS).toISOString(),
          nowIso,
        });
      } catch {
        // 다음 Cron의 보충 단계가 누락된 재검증 잡을 다시 예약합니다.
      }
    }

    return decision.status;
  }

  private async completeAndSetProfileReason(
    job: CreatorReviewJob,
    status: Exclude<FeaturedReviewStatus, "AUTO_REVIEW_PENDING" | "FAILED_RETRYABLE">,
    completedAt: string,
    reason: string,
    userId?: number,
    featuredStatus?: "NONE" | "FEATURED" | "PARTNER",
  ): Promise<void> {
    const reviewRepo = this.reviewRepo;
    if (!reviewRepo) return;
    const transitioned = await reviewRepo.completeJob(job.id, status, completedAt, reason);
    if (!transitioned) return;
    if (userId === undefined) {
      const account = await this.creatorRepo.findPlatformAccountById(job.creatorPlatformAccountId);
      const profile = account ? await this.creatorRepo.findProfileById(account.creatorId) : null;
      userId = profile?.userId;
    }
    if (userId !== undefined) {
      await this.creatorRepo.upsertProfile({
        userId,
        status: "VERIFIED",
        ...(featuredStatus ? { featuredStatus } : {}),
        featuredReason: reason,
      });
    }
  }
}
