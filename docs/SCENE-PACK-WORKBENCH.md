# Scene-pack lab — P3 engineering

This fourth development workbench switches original block, wedge and octahedron
meshes. It proves software integrity and recovery with mathematical fixtures;
it supplies no anatomical or physiological acceptance.

From `app/`, with Node.js 22+ and locked dependencies:

```sh
npm ci
npm run graphics:dev
```

Choose **Scene pack lab** from the heart or junction page, or open
`/pack-study.html`. Select a scene and detail tier. The prior canvas and caption
remain usable until verified replacement bytes draw successfully. Retry is
explicit. Text mode releases scene resources and retains the last explanation;
returning rebuilds the requested scene. Rendering is static, so reduced motion
requires no continuous animation. Notes explain scope and accounting.

## Contract and trust

`graphics/scenePack.ts` is distinct from `DiseasePackProposal`, whose planning
schema and publication restrictions remain unchanged. Schema 1 declares pack
identity/version, app compatibility, units/frame, bounds, anchors, low/high LOD,
digests, original-source attribution, scoped reviews and text alternatives.
The fixtures require app >=0.6.2 and <0.7.0, arbitrary units and right-handed Y-up.
Review is `not_applicable` only for synthetic engineering; no clinical reviewer
is implied.

`graphics/pack-fixtures.mjs` generates six deterministic binary `.mesh` files,
the JSON manifest and compiled `packCatalog.ts`. Each binary has an 8-byte
`PDMSH001` magic, two little-endian uint32 counts, float32 positions and uint32
indices. The catalog pins manifest digest/length and exact same-origin assets.
There is no URL input. Fetch omits credentials, rejects redirects and avoids
cache. Unknown fields, IDs, references, incompatible versions, malformed mesh
counts, out-of-bounds coordinates and digest mismatches fail before activation.

## Frozen limits

| Limit | Ceiling |
| --- | --- |
| Raw manifest | 65,536 bytes |
| Each source mesh | 65,536 bytes |
| Each mesh | 4,096 vertices; 8,192 triangles |
| Textures | 0 |
| Tracked aggregate payload | 524,288 bytes |
| Request timeout | 5,000 ms |

The aggregate includes retained raw manifest bytes, resident CPU/GPU geometry
and stream/decode reservations: twice source bytes plus twice decoded geometry
for outstanding work. Old active scenes, requested neighbors and canceled work
remain charged until replacement/disposal/settlement. This conservative model
is **not measured browser RAM, JavaScript allocator, canvas or driver/VRAM**.
The manifest validates worst-neighborhood overlap; additional packs require
measured exports and adoption review before these limits can change.

Only active plus declared transition neighbors load. Generation checks prevent
late replies from activating. Digest verification precedes decoding and drawing;
a synchronous successful draw precedes old-geometry disposal. Corrupt, missing,
timed-out or superseded work retains the previous scene or readable fallback.
WebGL loss destroys resources, publishes settled accounting and retains text;
retry uses a fresh canvas. Effect cleanup waits outstanding destruction before
opening another loader. No learner storage, backend, dependencies or public
service-worker entries are added.

## Reproduce checks

From `app/`:

```sh
node graphics/pack-fixtures.mjs
npm test
npm run graphics:build
npm run graphics:test
```

Generation is deterministic; commit fixtures/catalog together after inspecting
the diff. `graphics:verify` exercises real Three geometry, invalid inputs,
stream bounds, stale work, timeout, presentation rollback and exact disposal.
Browser tests use actual mesh pixels, keyboard Enter, two engines, 320/1440px,
corruption/missing/timeout, rapid switching, buffer disposal and WebGL loss while
ready and while loading. Public build verification excludes all four workbench
entries, fixture bytes and identifiers from output and the service-worker shell.

The [seven-shot dossier](review/heart-seven-shot.md) concerns the separate
5.7 MB CC BY-SA heart artwork. Those assets are not loaded by this runtime pack.
P4 composition and P5 measured/native/accessibility/publication gates remain open.
