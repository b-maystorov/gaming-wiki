# Local Darkest Dungeon I artwork

Private artwork belongs only in `private/`, which is excluded from Git:

```
private/
  heroes/
  bosses/
  enemies/
  trinkets/
  items/
  curios/
  locations/
  ui/
```

Run `python3 tools/build_game_art_manifest.py` from the repository root to create
these empty directories and refresh the public metadata manifest. Git does not
store empty directories. Do not place authentic images next to this README.
See `docs/artwork-preparation.md` for the metadata contract and Round 2 workflow.
