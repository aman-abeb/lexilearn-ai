import type { AdaptationMode, AdaptationResult, Material, MaterialSection } from "../../lib/contracts";
import { HttpError } from "../http";

/** Owner 3 implements this interface; API route and UI response shape remain stable. */
export interface AdaptationProvider {
  readonly configured: boolean;
  adapt(input: {
    material: Material;
    section: MaterialSection;
    mode: AdaptationMode;
  }): Promise<AdaptationResult>;
}

export const adaptationProvider: AdaptationProvider = {
  configured: false,
  async adapt() {
    throw new HttpError(
      501,
      "AI_NOT_CONFIGURED",
      "AI adaptation is not connected yet. You can read the original content and adjust its presentation.",
    );
  },
};
