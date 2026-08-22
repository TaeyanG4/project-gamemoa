import type { RuntimeGame } from "../modules/game/domain/runtimeGame.js";
import type { RuntimeGameRegistry } from "../modules/game/ports/runtimeGameRegistry.js";
import { RuntimeGameAvailability } from "./runtimeGameAvailability.js";

/** The application-level public catalog boundary shared by HTTP, Discord, achievements,
 * personalization, and rankings. It combines D1/B2 runtime resolution with the D1 kill switch;
 * no caller may fall back to Git metadata when an entry is incomplete or unavailable. */
export interface PublicGameCatalog {
  findBySlug(slug: string): Promise<RuntimeGame | null>;
  list(): Promise<readonly RuntimeGame[]>;
}

export class AvailableRuntimeGameCatalog implements PublicGameCatalog {
  constructor(
    private readonly registry: RuntimeGameRegistry,
    private readonly availability: RuntimeGameAvailability,
  ) {}

  async findBySlug(slug: string): Promise<RuntimeGame | null> {
    const runtime = await this.registry.findBySlug(slug);
    if (!runtime) return null;
    return (await this.availability.isVersionServable(runtime.identity.id, runtime.liveVersion.id))
      ? runtime
      : null;
  }

  async list(): Promise<readonly RuntimeGame[]> {
    const runtimes = await this.registry.listPublic();
    const checked = await Promise.all(
      runtimes.map(async (runtime) => ({
        runtime,
        available: await this.availability.isVersionServable(
          runtime.identity.id,
          runtime.liveVersion.id,
        ),
      })),
    );
    return checked.filter((entry) => entry.available).map((entry) => entry.runtime);
  }
}
