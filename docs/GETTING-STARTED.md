# Start studying with PalDawn

## Open the web app

[Open PalDawn](https://udhawan97.github.io/PalDawn/) in a browser with JavaScript.
Choose **Explore diabetes** for an authored disease pathway, or **Begin the
voyage** for the five-stage First Light introduction. With reduced motion,
the voyage action is **Enter step mode**.

In the disease explorer, move through steps, switch between **Plain English**
and **Clinical terms**, select a highlighted structure for close focus, and open
**Research Lens** for source-to-step links. Atlas Wayfinder searches existing
routes. The 50-condition curriculum includes ten previews and forty planned
entries; unavailable entries cannot open a lesson.

Open **Atlas desk** from the starting-journeys rail to search local Atlas work,
filter saved/open/studied steps, continue the next open saved step, browse exact
authored pathways by body structure, or search the bundled evidence library.
Complete-study export excludes private notes until you opt in.

The public 3D map is conceptual and not to scale. Its content and geometry have
not received named qualified clinical review. Use it for exploration, not
clinical decisions or a substitute for your course materials.

## Study with reference anatomy

[Anatomy Lab](ANATOMY-LAB.md) is a separate **local preview**, excluded from the
public website. Follow that guide to prepare its reference packs and start it.

Choose the male or female assembly, enter the lab, and search a structure.
The research desk offers **How it works**, **Conditions**, and a reading queue.
Choose any area; use **Locate** only where the current reference has a mapped
source concept. Suggestions can describe a broader system instead of the exact
selected structure, and are labeled accordingly.

Save the questions or topics you want to investigate. Turn on search across all
areas to search all 113 condition topics. Use compact cards or **Focus on
research** for more reading space. The queue, read marks, saved source IDs, and
last validated selection persist locally across reloads and reference switches.
Use the separate JSON backup for restoration; Markdown is a readable plan, not
an import file. Source links and PubMed searches open external websites.

## Install as a web app

There is no native macOS, Windows, Linux, iOS, or Android installer.
Open **Settings → Installation help** in the public app. Your browser decides
whether to offer **Install App** or **Add to Home Screen**. Installation is
optional; the browser version remains available. The app cannot guarantee
installation support on every browser or device.

The [v0.5.1 release notes](releases/v0.5.1.md) describe the release scope. After
the exact-commit gate publishes v0.5.1, its GitHub Release page provides source
ZIP/tar archives. Reference-model packs are prepared separately. There is no native signing,
notarization, or installer checksum to verify for this source-only release.

## Updates and local work

The public app stores preferences and First Light learner work in browser
storage, with no account or server backup. Use its study export or validated
local backup before switching browsers, removing site data, or uninstalling a
web app. Do not enter patient or personal health data.

When offered, **Update and reload open tabs** checks that every open PalDawn
tab can save. If saving fails, the update pauses. If the open tab set changes
after activation has committed, the app freezes and asks you to close every
PalDawn tab and reopen. Follow that instruction rather than repeatedly retrying.
An older tab's **Update now** request is vetoed because it cannot confirm that
memory-only work is saved: copy or save its work, then close and reopen.

A waiting update may also activate after all PalDawn tabs close. Browser storage
is not a backup. Removing the web app and clearing its site data are separate
browser actions; export first and consult your browser's controls.

## Troubleshooting

| What you see | Next step |
|---|---|
| 3D unavailable or WebGL recovery | Choose **Use text voyage**. The disease guides also remain available without the scene. |
| Motion feels uncomfortable | Open Settings and enable reduced motion; choose text voyage or stage controls. |
| Anatomy reference preview unavailable | Confirm `npm run anatomy:prepare` completed, then restart `anatomy:dev`. Reference files are not in a normal source checkout or default build. |
| A structure has no lesson/locator | Coverage is incomplete. Browse an independent research area or source directory; the viewer does not invent a mapping. |
| Anatomy study work is missing | Restore a JSON Anatomy backup from **Saved Anatomy study & backup**. Markdown reading plans cannot be imported. If storage was blocked, export before reloading. |
| Local build fails | Use Node.js 22+, run `npm ci` in `app/`, then the documented test command. Keep the first error when reporting a problem. |

[Report a reproducible problem](https://github.com/udhawan97/PalDawn/issues).
Include the browser, the action, and the visible error; exclude patient data,
private notes, and credentials. See [app commands](../app/README.md) for development.
