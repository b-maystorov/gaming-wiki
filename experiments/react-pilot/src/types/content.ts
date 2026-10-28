export type GuideStatus = 'available' | 'in-development';

export interface BossArtwork {
  path: string;
  alt: string;
}

export interface BossRequirements {
  baseGame: boolean;
  dlc: string[];
  mods: string[];
}

export interface BossRecord {
  id: string;
  routeId: string;
  name: string;
  aliases?: string[];
  categoryIds: string[];
  regionIds: string[];
  regionLabel: string;
  requirements: BossRequirements;
  guideStatus: GuideStatus;
  summary: string;
  artwork?: BossArtwork;
}

export interface DlcRecord {
  id: string;
  name: string;
}

export interface RegionRecord {
  id: string;
  name: string;
}

export interface BossContentPack {
  bosses: BossRecord[];
  dlcs: DlcRecord[];
  regions: RegionRecord[];
}
