import { useMemo, useState } from 'react';
import { BossCard } from '../components/BossCard';
import type { BossContentPack } from '../types/content';

interface BossesPageProps {
  content: BossContentPack;
  legacySiteUrl: string;
}

export function BossesPage({ content, legacySiteUrl }: BossesPageProps) {
  const [query, setQuery] = useState('');
  const [regionId, setRegionId] = useState('all');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingBosses = useMemo(() => content.bosses.filter((boss) => {
    const matchesQuery = `${boss.name} ${(boss.aliases ?? []).join(' ')} ${boss.regionLabel} ${boss.summary}`
      .toLocaleLowerCase().includes(normalizedQuery);
    const matchesRegion = regionId === 'all' || boss.regionIds.includes(regionId);
    return matchesQuery && matchesRegion;
  }), [content.bosses, normalizedQuery, regionId]);

  return (
    <main className="react-bosses" aria-labelledby="react-bosses-title">
      <p className="eyebrow">BM Gaming Wiki / React development preview</p>
      <h1 id="react-bosses-title">Bosses</h1>
      <p className="lede">
        A component pilot using the existing boss records, route destinations, and charcoal/crimson styles.
        Guide status reflects the current content pack.
      </p>

      <section className="react-boss-filters" aria-label="Filter boss entries">
        <div>
          <label htmlFor="react-boss-search">Search bosses</label>
          <input
            id="react-boss-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Name, alias, or region"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="react-boss-region">Filter by region</label>
          <select id="react-boss-region" value={regionId} onChange={(event) => setRegionId(event.currentTarget.value)}>
            <option value="all">All regions and events</option>
            {content.regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
          </select>
        </div>
      </section>

      <p className="react-boss-count" role="status" aria-live="polite" aria-atomic="true">
        {matchingBosses.length} matching {matchingBosses.length === 1 ? 'boss entry' : 'boss entries'}.
      </p>

      {matchingBosses.length ? (
        <div className="boss-card-grid">
          {matchingBosses.map((boss) => (
            <BossCard key={boss.id} boss={boss} dlcs={content.dlcs} legacySiteUrl={legacySiteUrl} />
          ))}
        </div>
      ) : (
        <p className="panel react-boss-empty" role="status">No bosses match those filters. Try a different search or region.</p>
      )}
    </main>
  );
}
