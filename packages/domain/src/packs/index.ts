import { constructionPack } from "./construction";
import { propertyConditionPack } from "./property-condition";
import { vehiclePack } from "./vehicle";
import { workplaceSafetyPack } from "./workplace-safety";
import type { StarterPack } from "./build";

export type { StarterPack } from "./build";

export const STARTER_PACKS: StarterPack[] = [
  propertyConditionPack,
  vehiclePack,
  constructionPack,
  workplaceSafetyPack,
];

export function starterPackByKey(key: string): StarterPack | undefined {
  return STARTER_PACKS.find((pack) => pack.key === key);
}
