import sourcePack from '../../../../dist/data/games/darkest-dungeon-1.json';
import type { BossContentPack, BossRecord, DlcRecord, RegionRecord } from '../types/content';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isBossRecord(value: unknown): value is BossRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<BossRecord>;
  const requirements = record.requirements;
  const artwork = record.artwork;

  return typeof record.id === 'string'
    && typeof record.routeId === 'string'
    && typeof record.name === 'string'
    && typeof record.regionLabel === 'string'
    && typeof record.summary === 'string'
    && (record.guideStatus === 'available' || record.guideStatus === 'in-development')
    && isStringArray(record.categoryIds)
    && isStringArray(record.regionIds)
    && (record.aliases === undefined || isStringArray(record.aliases))
    && requirements !== undefined
    && typeof requirements.baseGame === 'boolean'
    && isStringArray(requirements.dlc)
    && isStringArray(requirements.mods)
    && (artwork === undefined || (typeof artwork.path === 'string' && typeof artwork.alt === 'string'));
}

function isDlcRecord(value: unknown): value is DlcRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DlcRecord>;
  return typeof record.id === 'string' && typeof record.name === 'string';
}

function isRegionRecord(value: unknown): value is RegionRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<RegionRecord>;
  return typeof record.id === 'string' && typeof record.name === 'string';
}

const rawPack = sourcePack as unknown as Record<string, unknown>;

export const bossContent: BossContentPack = {
  bosses: Array.isArray(rawPack.bosses) ? rawPack.bosses.filter(isBossRecord) : [],
  dlcs: Array.isArray(rawPack.dlcs) ? rawPack.dlcs.filter(isDlcRecord) : [],
  regions: Array.isArray(rawPack.regions) ? rawPack.regions.filter(isRegionRecord) : []
};
