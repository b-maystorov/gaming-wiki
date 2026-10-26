# Content sources and image origins

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

Reviewed [Red Hook's contact / Fan Creation Usage Policy page](https://www.darkestdungeon.com/contact/).
It discusses fan creations but was not treated as explicit permission to
redistribute extracted game art in a public source repository. No game artwork
was downloaded, hotlinked, or copied. Permission for that use remains
**unverified**, so this milestone uses clearly labeled placeholders. Replace
these only after recording a suitable origin and permission.

All six SVG files below were authored directly for this project on 2026-10-26,
with simple original vector geometry, no external image inputs, and no embedded
game assets. The five content placeholders are labeled in visible captions and
image alternative text. These are symbols, not accurate depictions of the items.

| Local file under `dist/assets/images/` | Origin / purpose |
| --- | --- |
| `hero-placeholder.svg` | Original generic hooded silhouette; Highwayman portrait stand-in. |
| `ring-placeholder.svg` | Original ring symbol; Focus Ring stand-in. |
| `buckle-placeholder.svg` | Original buckle symbol; Gunslinger's Buckle stand-in. |
| `charm-placeholder.svg` | Original pendant symbol; Reckless Charm stand-in. |
| `stone-placeholder.svg` | Original faceted-stone symbol; Damage Stone stand-in. |
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

Once appropriately reusable **Darkest Dungeon 1** images are available, put them
at these exact paths (create `dist/assets/images/darkest-dungeon/` first):

| Required image | Local destination | Data field to update |
| --- | --- | --- |
| Highwayman artwork / portrait | `dist/assets/images/darkest-dungeon/highwayman.png` | Shared `portrait` object in `heroes.js` |
| Focus Ring in-game icon | `dist/assets/images/darkest-dungeon/focus-ring.png` | Focus Ring `image` object |
| Gunslinger's Buckle in-game icon | `dist/assets/images/darkest-dungeon/gunslingers-buckle.png` | Gunslinger's Buckle `image` object |
| Reckless Charm in-game icon | `dist/assets/images/darkest-dungeon/reckless-charm.png` | Reckless Charm `image` object |
| Damage Stone in-game icon | `dist/assets/images/darkest-dungeon/damage-stone.png` | Damage Stone `image` object |

Those files do not exist yet; the live page continues referencing valid SVG
placeholders. Merely placing files in that directory will not change the page.
For each asset, record the original direct URL, rights holder/attribution, reuse
terms, and actual dimensions here. Decode it with an image viewer/library to
confirm it is an image, not just an HTTP success or a `.png` filename, then compare
it visually to the correct DD1 hero/item reference. Set its `src` relative to
`dist/` (for example `assets/images/darkest-dungeon/focus-ring.png`), intrinsic
`width`/`height`, meaningful `alt`, and `placeholder: false` in `heroes.js`.
Use the original icon resolution rather than an enlarged thumbnail. Remove
placeholder-only explanatory copy when genuine assets have replaced it.

Vestal, Plague Doctor, Crusader, and Hellion team portraits also remain missing
from the earlier request, shown as labeled text placeholders. They are separate
from the five priority images above and do not expand the hero roster.
