/**
 * World-level constants shared across the codebase.
 *
 * ISLAND_OFFSET — every island is spawned at world-X = islandIndex * ISLAND_OFFSET.
 * Used for save/load island-relative position math and shadow camera repositioning.
 */
export const WORLD_CONFIG = {
  ISLAND_OFFSET: 2000,
  ISLAND_COUNT: 4,
} as const;
