import type { GameCanonicalDocument } from "./gameCanonicalDocument.js";
import type { GameIdentity } from "./gameIdentity.js";
import type { GameVersion } from "./gameVersion.js";

/**
 * Provider-neutral runtime read model. Publisher authority, immutable live bytes, and canonical
 * game semantics remain separate persistence facts and are joined only at this boundary.
 */
export interface RuntimeGame {
  readonly identity: GameIdentity;
  readonly liveVersion: GameVersion;
  readonly canonical: GameCanonicalDocument;
}
