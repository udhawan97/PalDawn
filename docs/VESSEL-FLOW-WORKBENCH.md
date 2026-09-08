# Vessel flow workbench — R3 engineering slice

2026-09-08. An isolated synthetic fixture advances the rendering portion of
[R3](GRAPHICS-REBUILD.md). It does not complete R3 anatomical acceptance or
promote the pending heart artwork into the public app.

## Delivered behavior

- Uniform, tapered, and narrowed curved cutaways with inner and outer surfaces,
  end rims, and connected cut edges. The upper half is intentionally absent.
  Changing shape pauses at the same time, refits the camera, and preserves the
  selected detail. These profiles are geometry fixtures, not disease models.
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

The CPU wall builder and GPU motion share circular-route constants and one
81-row Float32 radius table. Each row contains the wall radius and a safe
center-lane radius. The GPU reads that exact table through a tiny local data
texture; it does not reimplement the authored radius formulas. Adjacent rows
are interpolated linearly. Seeds store normalized radial positions, so shared
cell identities survive changes of shape and detail.

Containment reserves the cell's entire bounding sphere, a clearance margin,
and the worst possible radius drop over that sphere's angular span. The
maximum slope of the sampled profile bounds that drop. This prevents a cell
whose center fits from clipping a narrower neighboring cross-section. Invalid,
non-finite, oversized, or abruptly narrowed profiles that leave no safe lane
are rejected before rendering. Open-end planes are checked separately.
This contract applies to these static, unbranched circular routes; it does
not prove containment in arbitrary vessel networks or moving walls.

## Run and check

From `app/`, run `npm run graphics:dev` and follow the synthetic-flow link, or
open `/flow-study.html` on that local server. `npm run graphics:build` creates
both workbenches in ignored `dist-graphics/`; the regular app and Pages build
exclude both entries and their data.

`npm test` includes `graphics:verify`: deterministic heart generation,
public-build exclusion, and the new flow verifier. The flow verifier checks
35,973 visible time/seed samples across three profiles for radial and end-plane
containment, plus 935,298 independent probes around expanded cell bounds at
their own nearest route coordinates. It also checks invalid-profile rejection,
GPU-table/mesh-row agreement, geometry finiteness, inward wall faces, 15 flow
camera fits, repeatable seeking, and quality identity preservation. The heart
verifier retains its separate 40 camera cases.

`npm run graphics:test` runs the two-engine workbench browser suite. Its new
flow cases compare actual canvas pixels across motion, pause, backward seek,
and detail/profile changes; cover reduced motion, keyboard seeking and profile
selection, simulated document visibility events, WebGL recovery with the
selected profile, narrow layouts, and absent storage/GLB loads.
The visibility test exercises the event handler; it is not an OS backgrounding
measurement. Captures are in ignored `output/playwright/heart-study/`.

Native Safari was also visually inspected locally. The initial slice covered
rendering, completion, and low detail; the variable-radius continuation checked
tapered and narrowed geometry and playback in the narrowed profile. Obscura's
server blocks private IP addresses, so native Safari is the local visual
fallback. Safari inspection is separate from Chromium/WebKit regression results.

## Remaining R3 acceptance

Exterior-to-lumen continuity, reviewed cell shape and relative scale, branch
splitting, deforming radii, physiological motion, and measured target
performance remain outstanding. The fixture is not a literal LAD route or a
validated blood simulation. The public app still uses its existing conceptual
scenes. R1/R2 review ownership and anatomy corrections remain prerequisites
for public anatomical adoption; this code-only fixture does not satisfy them.

Next: define the branch contract and author connected junction geometry before
introducing divergent trajectories. Overlapping closed tubes do not establish
an open junction or safe branch handoff. Extend full-extent containment checks
at that junction before integrating exterior continuity. Anatomical route
identity and physiology still require qualified review. The full R4 storyboard
remains separate from this bounded playback control.
