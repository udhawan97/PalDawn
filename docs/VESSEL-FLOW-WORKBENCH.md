# Vessel flow workbench — R3 engineering slice

2026-09-08. An isolated synthetic fixture advances the rendering portion of
[R3](GRAPHICS-REBUILD.md). It does not complete R3 anatomical acceptance or
promote the pending heart artwork into the public app.

## Delivered behavior

- A curved, constant-radius cutaway with inner and outer surfaces, end rims,
  and connected cut edges. The upper half is intentionally absent.
- Original three-dimensional cell-shaped fixtures with opaque stock materials.
  Shape, scale, density, speed, and all dimensions are arbitrary study choices.
- Seeded GPU instancing: 80 or 240 fixtures, with identical shared identities
  across quality settings. One time uniform moves and rotates the geometry;
  there are no per-frame CPU instance matrices or history-dependent simulation.
- A finite 12-second teaching passage with play, pause, seek in either
  direction, restart, orbit, and camera reset. Cells shrink out near the ends
  and never wrap to the entrance. Restart is explicit.
- Reduced motion keeps still-frame seeking and disables playback. Hiding the
  document pauses it; returning leaves it paused. WebGL loss stops playback,
  and retry restores the selected time and detail.
- A separate `flow-study.html` entry, linked from the heart workbench. It loads
  no heart GLB, registers no service worker, and uses no study storage.

## Geometry and ownership

`app/graphics/flowModel.ts` is the editable original engineering fixture. It
uses the already pinned Three.js dependency and no third-party mesh, texture,
scan, dataset, medical prose, new library, or ontology mapping. Mathematical
fixture code remains in the MIT code zone; it is not an adopted anatomy pack.
No qualified reviewer or approval is claimed.

The CPU wall builder and GPU motion share circular-route constants. Cell
centers stay within the wall radius minus the cell's entire bounding sphere
and a clearance margin. Distance to the circle is 1-Lipschitz, so adding that
bounding radius conservatively covers all cell vertices at every orientation.
Open-end planes are checked separately. This proof applies only to this
constant-radius, unbranched fixture, not arbitrary vessel networks.

## Run and check

From `app/`, run `npm run graphics:dev` and follow the synthetic-flow link, or
open `/flow-study.html` on that local server. `npm run graphics:build` creates
both workbenches in ignored `dist-graphics/`; the regular app and Pages build
exclude both entries and their data.

`npm test` includes `graphics:verify`: deterministic heart generation,
public-build exclusion, and the new flow verifier. The flow verifier checks
11,991 visible time/seed samples for full-extent radial and end-plane
containment, geometry finiteness, inward wall faces, repeatable seeking, and
quality identity preservation.

`npm run graphics:test` runs the two-engine workbench browser suite. Its new
flow cases compare actual canvas pixels across motion, pause, backward seek,
and detail changes; cover reduced motion, keyboard seeking, simulated document
visibility events, WebGL recovery, narrow layouts, and absent storage/GLB loads.
The visibility test exercises the event handler; it is not an OS backgrounding
measurement. Captures are in ignored `output/playwright/heart-study/`.

Native Safari was also visually inspected locally: the opaque cutaway and
cells render, playback advances to its finite end, and low detail changes the
rendered density. Obscura could not open the loopback URL because its server
blocks private IP addresses. Native Safari inspection is separate from the
Chromium/WebKit regression results.

## Remaining R3 acceptance

Exterior-to-lumen continuity, reviewed cell shape and relative scale, branch
splitting, varying/deforming radii, physiological motion, and measured target
performance remain outstanding. The fixture is not a literal LAD route or a
validated blood simulation. The public app still uses its existing conceptual
scenes. R1/R2 review ownership and anatomy corrections remain prerequisites
for public anatomical adoption; this code-only fixture does not satisfy them.

Next: author the reviewed route/branch and radius contract, then extend the
full-extent containment checks before integrating exterior continuity. The
full R4 storyboard remains separate from this bounded playback control.
