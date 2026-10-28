import { useState } from 'react';
import type { BossRecord, DlcRecord } from '../types/content';

interface BossCardProps {
  boss: BossRecord;
  dlcs: DlcRecord[];
  legacySiteUrl: string;
}

export function BossCard({ boss, dlcs, legacySiteUrl }: BossCardProps) {
  const [artworkFailed, setArtworkFailed] = useState(false);
  const isAvailable = boss.guideStatus === 'available';
  const requiredDlc = boss.requirements.dlc
    .map((id) => dlcs.find((dlc) => dlc.id === id)?.name ?? id);
  const requirements = [
    ...(boss.requirements.baseGame ? ['Base game'] : []),
    ...requiredDlc.map((name) => `DLC: ${name}`),
    ...boss.requirements.mods.map((name) => `Mod: ${name}`)
  ].join(' · ');
  const theme = boss.categoryIds[0]?.split(':').at(-1) ?? 'ruins';
  const href = `${legacySiteUrl.replace(/\/$/, '')}/#game/darkest-dungeon/bosses/${encodeURIComponent(boss.routeId)}`;
  const imageSource = boss.artwork && !artworkFailed
    ? `${legacySiteUrl.replace(/\/$/, '')}/${boss.artwork.path.replace(/^\//, '')}`
    : null;
  const initials = boss.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 3).toUpperCase();

  return (
    <a className="boss-card" href={href}>
      <span
        className={`boss-artwork${imageSource ? ' has-local-artwork' : ''}`}
        data-boss-theme={theme}
        role="img"
        aria-label={imageSource ? boss.artwork?.alt : `Atmospheric placeholder for ${boss.name}; no local portrait available`}
      >
        {imageSource ? (
          <img className="boss-local-artwork" src={imageSource} alt="" onError={() => setArtworkFailed(true)} />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
        <small>{imageSource ? 'Local portrait' : 'Encounter dossier'}</small>
      </span>
      <span className="boss-card-copy">
        <span className="boss-card-meta">
          <span>{boss.regionLabel}</span>
          <span>{requirements}</span>
        </span>
        <strong>{boss.name}</strong>
        {boss.aliases?.length ? (
          <span className="boss-card-alias">Also listed as {boss.aliases.join(', ')}</span>
        ) : null}
        <span className="boss-card-summary">{boss.summary}</span>
        <span className="boss-card-footer">
          <span className={`boss-status${isAvailable ? ' is-available' : ''}`}>
            {isAvailable ? 'Guide available' : 'Guide in development'}
          </span>
          <span aria-hidden="true">Open on current site →</span>
        </span>
      </span>
    </a>
  );
}
