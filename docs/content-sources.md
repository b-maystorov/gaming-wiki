# Content sources and image origins

## Earlier image-source audit before local assets were supplied — 2026-10-26

The approved website was inspected at commit `73c8925`. At that audit, the
three local game-image files described below had not yet been added. Its source
and network findings are retained as historical notes; the files were later
supplied in the working tree with provenance still unknown.

**Current download-path failure:** a direct Python HTTPS request to
`https://www.darkestdungeon.com/contact/` failed before an HTTP response:

```text
URLError: <urlopen error [Errno -3] Temporary failure in name resolution>
```

This recorded the name-resolution failure in the local download path for that
request, not a server refusal or a failed image decode. No binary asset was
retrieved during that audit. The separate web-search tool had previously returned indexed text;
that does not establish that this environment can download an image to disk.

**Earlier source-access failures:** wiki.gg page requests returned HTTP 403 and
the legacy Highwayman page returned HTTP 402. These were source-page requests,
not downloads from verified image-file URLs. The official Marketing Kit response
exposed no usable file inventory or reuse terms. Direct image URLs remain
unverified; no image download should be described as successful or corrupt.

**Separate reuse uncertainty:** the documented official policy and wiki notice
did not establish applicable permission for public-repository redistribution.
That is distinct from the network errors and is not a claim that every fan-wiki
use is forbidden. Supplying a file should include its original source and any
applicable attribution/reuse terms.

### Five requested files at that audit (three later supplied)

That audit proposed the following DD1 filenames. Three assets were later
supplied at different original filenames; those files are organized under
`dist/assets/images/darkest-dungeon/`. The two item icons still requested are
Reckless Charm and Damage Stone:

| Image | Known candidate source page | Destination filename in that directory |
| --- | --- | --- |
| Highwayman portrait | [Highwayman](https://darkestdungeon.wiki.gg/wiki/Highwayman_(Darkest_Dungeon)) | `highwayman.png` (supplied as `highwayman-idle.gif`) |
| Focus Ring icon | [Campaign trinkets](https://darkestdungeon.wiki.gg/wiki/Trinkets) | `focus-ring.png` |
| Gunslinger's Buckle icon | [Highwayman trinkets](https://darkestdungeon.wiki.gg/wiki/Highwayman_(Darkest_Dungeon)#Trinkets) | `gunslingers-buckle.png` |
| Reckless Charm icon | [Campaign trinkets](https://darkestdungeon.wiki.gg/wiki/Trinkets) | `reckless-charm.png` |
| Damage Stone icon | [Campaign trinkets](https://darkestdungeon.wiki.gg/wiki/Trinkets) | `damage-stone.png` |

At the time of that audit, placing files alone did not change the page. The
three later-supplied files are integrated in the image-integration record at the
end of this document. The two remaining item images still require an appropriate
source and reuse terms before integration. Browser rendering remains unavailable;
earlier browser socket failures are separate from the DNS failure above.


## Original content research — 2026-10-26

Reviewed on 2026-10-26. Scope: **Darkest Dungeon 1 single-player campaign**,
unmodded. No Darkest Dungeon II or Butcher's Circus skill values are used.
All included heroes, selected skills, and recommended trinkets are base-game
content. No DLC or mod is required by these examples.

## Verification method and limits

Compared mechanics, targeting ranks, and the listed trinket effects with the
published references below. Wiki.gg's indexed article extracts were available
through web search; direct requests to the Highwayman and Trinkets pages
returned HTTP 403. The skill rank table in the GameFAQs guide provided an
additional cross-check. No local game files were available for validation.
This is reference verification, not a claim that the latest installed game
patch was tested. Recheck values if a game update or mod changes them.

The two builds, preferred positions, trinket pairings, party names, and opening
priorities are original editorial recommendations inferred from those mechanics.
They have not been playtested for this project and are not guarantees of safety
or optimal play. Numerical skill damage, accuracy, and status chances vary by
upgrade level and are deliberately not reproduced in this milestone. Rank and
movement numbers are positioning information. Trinket numbers are fixed item
effects from the campaign tables; ACC is a flat accuracy modifier, not a percent.

## Claim-to-source map

| Source | Content checked / used |
| --- | --- |
| [Highwayman — official community wiki](https://darkestdungeon.wiki.gg/wiki/Highwayman_(Darkest_Dungeon)) | Damage role, Duelist's Advance movement/Riposte, class skill set, Gunslinger's Buckle effects and rarity. |
| [Highwayman strategy](https://darkestdungeon.wiki.gg/wiki/Highwayman/Strategy) | Riposte's dependence on targeting, ranged versus mixed builds, drawbacks of forcing a Point Blank Shot loop, situational Tracking Shot. Tactical context, not a universally best build. |
| [Highwayman — GameFAQs campaign guide](https://gamefaqs.gamespot.com/pc/228501-darkest-dungeon-the-color-of-madness/faqs/76458/highwayman) | Actor/target ranks for all six selected skills, movement on Advance/Point Blank Shot, and Tracking Shot's once-per-battle limit. The guide's title references The Color of Madness, but these skills do not require that DLC. Its numerical skill/buff statistics are not used. |
| [Highwayman — legacy wiki](https://darkestdungeon.fandom.com/wiki/Highwayman) | Additional check of Point Blank Shot's rank restriction and backward movement, and Tracking Shot's stealth removal. |
| [Trinkets — official community wiki](https://darkestdungeon.wiki.gg/wiki/Trinkets) | Focus Ring, Reckless Charm, and Damage Stone effects and rarity. Common is a rarity label, not a guaranteed early drop. |
| [Plague Doctor strategy](https://darkestdungeon.wiki.gg/wiki/Plague_Doctor/Strategy) | Blinding Gas targets the enemy rear pair; blight resistance limits damage; support positioning and bleed/blight cure context. |
| [Vestal strategy](https://darkestdungeon.wiki.gg/wiki/Vestal/Strategy) | Divine Grace single-target healing, Divine Comfort party healing, Dazzling Light stun, and backline support role. |
| [Crusader campaign skills](https://darkestdungeon.wiki.gg/wiki/Crusader_(Darkest_Dungeon)) | Holy Lance from rear positions, forward movement, Inspiring Cry stress recovery. |
| [Crusader strategy](https://darkestdungeon.wiki.gg/wiki/Crusader/Strategy) | Frontline attack/stun options and movement compatibility; informs the rotating-middle example. |
| [Hellion strategy](https://darkestdungeon.wiki.gg/wiki/Hellion_(Darkest_Dungeon)/Strategy) | Iron Swan requires own rank 1 and targets enemy rank 4, explaining why the moving build should preserve her front position. |

## Item values transcribed into the data module

| Item | Benefits | Drawbacks | Requirement |
| --- | --- | --- | --- |
| Focus Ring | +10 ACC; +5% CRIT | −8 DODGE | Base game; very rare |
| Gunslinger's Buckle | +20% DMG ranged skills; +15 ACC ranged skills | −10% DMG melee skills; −5% CRIT melee skills | Base game; Highwayman only; very rare |
| Reckless Charm | +5 ACC | −2 DODGE | Base game; common |
| Damage Stone | +10% DMG | −4 DODGE | Base game; common |

## Images and permission

At the initial placeholder milestone, [Red Hook's contact / Fan Creation Usage Policy page](https://www.darkestdungeon.com/contact/)
was reviewed. It was not treated as explicit permission to redistribute extracted
game art in a public source repository. The original download and reuse status
for each later-supplied image remains **unverified**, as recorded below.

The six SVGs below were authored for the initial placeholder milestone on
2026-10-26, with original vector geometry and no embedded game assets. The
portrait and two item SVGs now remain only as unused fallbacks; Reckless Charm
and Damage Stone still display their labeled placeholders.

| Legacy local file under `dist/assets/images/` | Initial placeholder purpose |
| --- | --- |
| `hero-placeholder.svg` | Original generic hooded silhouette; no longer used for the Highwayman portrait. |
| `ring-placeholder.svg` | Original ring symbol; now-unused Focus Ring fallback. |
| `buckle-placeholder.svg` | Original buckle symbol; now-unused Gunslinger's Buckle fallback. |
| `charm-placeholder.svg` | Original pendant symbol; current Reckless Charm placeholder. |
| `stone-placeholder.svg` | Original faceted-stone symbol; current Damage Stone placeholder. |
| `ledger-mark.svg` | Original four-point decorative mark; site favicon, not a game image. |

No game asset license is claimed. Darkest Dungeon and its characters belong to
Red Hook Studios. Source prose is linked and summarized in original wording;
this project does not copy the source articles or game flavor quotations.

## Design milestone: additional image research

Rechecked on 2026-10-26. **No real game image was imported.** The image request
remains unresolved for the five heroes and four trinkets below. Attribution
alone was not treated as permission, and no Darkest Dungeon II image was used.

- [Wiki.gg game-image copyright notice](https://darkestdungeon.wiki.gg/wiki/Template:Copyright_game)
  identifies Red Hook as the rights holder and explains the wiki's fair-use
  rationale. The indexed notice was readable; direct access returned HTTP 403.
  This is not a license granting this repository redistribution rights.
- [Red Hook's policy / press-kit entry](https://www.darkestdungeon.com/contact/)
  was inspected again. The fan-creation guidance concerns fan merchandise and
  does not establish permission for this project's raw game-asset distribution.
  Its restrictions were not generalized into a legal conclusion about fan wikis.
- The official page links to this [Marketing Kit](https://drive.google.com/drive/folders/1m_ghUF54cxbBnJE6ZbYy5bxHHtKC4IWp).
  The accessible response exposed no file inventory or reuse terms. A press-kit
  link alone was not treated as permission for arbitrary extracted game icons.
- [Legacy wiki copyrights](https://darkestdungeon.fandom.com/wiki/Darkest_Dungeon_Wiki:Copyrights)
  distinguish game-owner rights from content the wiki can lawfully license.
  A wiki's general Creative Commons footer is insufficient evidence that game
  assets can be redistributed under that license.
- Direct Highwayman/Trinkets wiki.gg requests returned HTTP 403; the legacy
  Highwayman page returned HTTP 402. Searches for team portraits also surfaced
  Darkest Dungeon II results, which were rejected. No direct image file URL,
  exact native dimensions, or suitable asset-specific permission was verified.

These are **candidate source pages, not downloaded-image URLs**:

| Missing image | Candidate DD1 source page | Current fallback |
| --- | --- | --- |
| Highwayman artwork and team portrait | [Highwayman](https://darkestdungeon.wiki.gg/wiki/Highwayman_(Darkest_Dungeon)) | Existing labeled SVG; text placeholder in teams |
| Vestal portrait | [Vestal](https://darkestdungeon.wiki.gg/wiki/Vestal_(Darkest_Dungeon)) | Labeled text placeholder |
| Plague Doctor portrait | [Plague Doctor](https://darkestdungeon.wiki.gg/wiki/Plague_Doctor_(Darkest_Dungeon)) | Labeled text placeholder |
| Crusader portrait | [Crusader](https://darkestdungeon.wiki.gg/wiki/Crusader_(Darkest_Dungeon)) | Labeled text placeholder |
| Hellion portrait | [Hellion](https://darkestdungeon.wiki.gg/wiki/Hellion_(Darkest_Dungeon)) | Labeled text placeholder |
| Focus Ring icon | [Campaign trinkets](https://darkestdungeon.wiki.gg/wiki/Trinkets) | Existing labeled ring SVG |
| Gunslinger's Buckle icon | [Highwayman trinkets](https://darkestdungeon.wiki.gg/wiki/Highwayman_(Darkest_Dungeon)#Trinkets) | Existing labeled buckle SVG |
| Reckless Charm icon | [Campaign trinkets](https://darkestdungeon.wiki.gg/wiki/Trinkets) | Existing labeled charm SVG |
| Damage Stone icon | [Campaign trinkets](https://darkestdungeon.wiki.gg/wiki/Trinkets) | Existing labeled stone SVG |

The pre-existing SVGs were recolored to match the navy theme, with their original
geometry and placeholder labels retained. Team placeholders are text initials,
not generated art. When appropriately reusable DD1 files become available,
record the exact original file URL, attribution, permission terms, local filename,
and native dimensions before replacing a placeholder. Do not infer any license
from the candidate-page list above.

## Home/navigation milestone: exact asset blocker and handoff

The previous work attempted **source-page access**, not downloads from verified
image-file URLs. No real image was saved, so there is no downloaded binary to
validate or compare with the item. The actual observed blockers were:

1. Wiki.gg Highwayman, Trinkets, and copyright-notice page requests returned HTTP
   403; the legacy Highwayman page returned HTTP 402. These responses did not
   provide verified direct DD1 image-file URLs or per-file reuse information.
2. The official Marketing Kit response provided no inspectable asset inventory
   or terms. No asset-specific public-repository redistribution permission was
   established. Attribution alone does not resolve this.
3. The web search tool works: the official policy and wiki copyright notice were
   checked again through indexed search for this milestone. They did not supply
   the missing file URLs or additional permission. The wiki states a fair-use
   rationale, not an unrestricted game-asset license. No claim is made that all
   fan-wiki image use is prohibited.
4. Local HTTP access still fails with `Operation not permitted`; this prevents
   preview validation. No new remote binary transfer was attempted, so it would
   be inaccurate to claim a particular image download failed due to that socket
   restriction. Previously blocked page requests were not retried.

Sources remain [Red Hook's policy and press entry](https://www.darkestdungeon.com/contact/),
[the wiki game-image notice](https://darkestdungeon.wiki.gg/wiki/Template:Copyright_game),
and the candidate DD1 pages listed above. No guessed image URL, DD2 asset,
hotlink, HTML error response saved as an image, or imitation artwork was added.

The two remaining **Darkest Dungeon 1** item images can use these paths under
`dist/assets/images/darkest-dungeon/`:

| Remaining image | Local destination | Data field to update |
| --- | --- | --- |
| Reckless Charm in-game icon | `dist/assets/images/darkest-dungeon/reckless-charm.png` | Reckless Charm `image` object |
| Damage Stone in-game icon | `dist/assets/images/darkest-dungeon/damage-stone.png` | Damage Stone `image` object |

The page still uses labeled SVG placeholders for these two items. Before
integrating a supplied file, record its original URL, rights holder/attribution,
reuse terms, and actual dimensions. Decode and visually confirm it is the correct
DD1 icon, then update the matching `image` object in `heroes.js`. Keep its natural
dimensions and meaningful alt text. Do not infer the source or permissions for
the already-integrated files from the candidate pages listed here.

Vestal, Plague Doctor, Crusader, and Hellion team portraits also remain missing
from the earlier request, shown as labeled text placeholders. They are separate
from the five requested Highwayman/trinket assets and do not expand the hero roster.


## Image integration milestone

The following existing working-tree files were validated and organized locally:

| Organized file under `dist/assets/images/darkest-dungeon/` | Validated type and dimensions | Visual check | Original source / reuse status |
| --- | --- | --- | --- |
| `highwayman-idle.gif` | GIF, 175 × 301 px, 31 frames, palette transparency | Highwayman holding pistol and knife | Original URL, creator attribution, and reuse permission unverified |
| `focus-ring.png` | PNG, RGBA, 36 × 72 px | Focus Ring icon | Original URL, creator attribution, and reuse permission unverified |
| `gunslingers-buckle.png` | PNG, RGBA, 36 × 72 px | Gunslinger's Buckle icon | Original URL, creator attribution, and reuse permission unverified |

The input files were named `Hwm_idle.gif`, `focus-ring.png`, and
`gunslinger-buckle.png` under `dist/assets/images/`. They were moved into the
Darkest Dungeon subdirectory and renamed consistently. Their original download
URLs and applicable license terms were not included with the files and could not
be verified; nearby wiki article pages in the earlier candidate-source table are
not asserted to be their actual origins. No attribution or reuse permission is
invented here. The remaining Focus Ring/Gunslinger's Buckle placeholder SVGs are
kept as unused fallbacks, while Reckless Charm and Damage Stone still display
labeled placeholders.

The Highwayman GIF is used for his guide portrait and party member portrait. When
`prefers-reduced-motion: reduce` is active, the GIF is hidden and an accessible
text alternative is displayed. No static copy or replacement artwork was created.

## Global portal visual milestone (2026-10-27)

The homepage uses original CSS geometry and gradients in `dist/css/styles.css`:
compass rings, a gothic gateway, an orbital seal, a crystal, and an ember horizon.
These are abstract decorative placeholders, not official game artwork or logos.
The homepage labels the scenery accordingly. No remote images, fonts, generated
bitmap artwork, or new third-party assets were imported. The existing original
four-point site mark remains the favicon and branding motif.

The available 175 × 301 Highwayman GIF and 36 × 72 item icons are unsuitable for
large backgrounds and have unverified reuse terms; they were not reused on the
portal. Their existing internal-page uses and provenance records remain unchanged.

## BM branding and interactive showcase (2026-10-27)

`dist/assets/images/bm-mark.svg` is an original geometric BM crest authored for
this project, using vector paths with no embedded fonts or third-party artwork.
It appears in the homepage hero and can be reused at smaller sizes for future
header/favicon work. The existing shared header and favicon remain unchanged.

The homepage showcase now uses a crimson gateway with torch glows, an icy
blue/gold citadel silhouette, a blue-purple crystal with gold orbital rings,
and an ember horizon with a receding road. All are original abstract CSS
scenery, not official locations, logos, or promotional artwork. No remote assets
or game sprites are used in the showcase; existing provenance notes still apply.

## Game universe previews and scene layout (2026-10-27)

Portal styling now lives in `dist/css/portal.css`. Scene geometry is placed in a
separate visible environment layer, with text scrims limited to the reading area.
The same original CSS scenery is reused on the three future-game preview pages.
The BM shield remains original vector artwork, now displayed more prominently.
No new third-party imagery or gameplay facts were introduced. Preview categories
are development plans only, not available guides or promises of a release date.

## Portal polish (2026-10-27)

The existing BM crest is reused in the portal header and footer. Scene refinements
add original CSS ruins and steps, frozen ridges and fortress lights, an arcane
platform, and an eclipse over an ash road. These are decorative abstractions,
not official game locations or copied artwork. No external assets were added.

## DD I original hero gallery (2026-10-27)

Scope matches the 17 entries in the requested [Hintbook gallery](https://darkestdungeon.hintbook.co/heroes/):
15 base-game classes plus Flagellant and Shieldbreaker. This is an explicitly
bounded historical roster, not a claim about the current total of all playable
classes. Musketeer and later DLC additions are outside this milestone. The
reference informed the portrait/name/role/DLC hierarchy only; no images, prose,
markup or stylesheet were copied.

Role tags are editorial capability labels checked against the indexed
[DD I Getting Started class descriptions](https://darkestdungeon.wiki.gg/wiki/Getting_Started)
and [DD I hero overview](https://darkestdungeon.wiki.gg/wiki/Heroes_%28Darkest_Dungeon%29).
Direct wiki.gg overview access returned HTTP 403; indexed text was readable.
No installed game build or balance values were verified. Tags do not imply
optimal builds, mandatory party roles, or equal healing strength. Self-sustain
means self-healing/defensive recovery rather than ally healing.

| Class | Gallery capabilities |
| --- | --- |
| Abomination | Damage, Stun, Blight |
| Antiquarian | Support, Debuff |
| Arbalest | Damage, Healing, Mark |
| Bounty Hunter | Damage, Stun, Mark |
| Crusader | Damage, Stress relief |
| Grave Robber | Damage, Blight |
| Hellion | Damage, Bleed, Stun |
| Highwayman | Damage, Riposte |
| Houndmaster | Support, Guard, Stun |
| Jester | Stress relief, Support, Bleed |
| Leper | Damage, Self-sustain |
| Man-at-Arms | Guard, Support, Riposte |
| Occultist | Healing, Debuff, Mark |
| Plague Doctor | Blight, Stun, Healing |
| Vestal | Healing, Stun |
| Flagellant | Bleed, Healing |
| Shieldbreaker | Damage, Armor piercing, Guard break |

Flagellant's DLC requirement was cross-checked with the class overview and
[The Crimson Court's Steam listing](https://store.steampowered.com/app/580100/Darkest_Dungeon_The_Crimson_Court/).
Shieldbreaker's requirement and capability tags were checked against
[The Shieldbreaker's official Steam description](https://store.steampowered.com/app/702540/Darkest_Dungeon_The_Shieldbreaker/).
All entries require the base game; neither DLC is a mod, and no mods are required.

Artwork audit: the only local class image is the previously supplied 175 × 301
Highwayman GIF, whose original source and reuse terms remain unverified. It is
not reused in the new gallery; its approved existing guide/team usage is intact.
The two small item icons are not portraits. No portraits for the other 16 classes
are available locally with verified reuse permission. No remote images were
requested or copied. Every gallery card therefore uses an original typographic
class monogram and CSS frame, visibly labeled as a placeholder, not game art.

`galleryArt.src` is null for all 17 entries. Highwayman's gallery permission
status is `unverified`; the remaining classes are `missing`. Only an explicitly
`permitted` future portrait is rendered. Record its original URL, attribution,
reuse terms and native dimensions here first. Failed loads reveal the monogram;
animated portraits also reveal it under reduced motion.
