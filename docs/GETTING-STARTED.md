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
research** for more reading space. Export the queue as Markdown before reloading
or closing: it lives in memory, even though it survives switching references.
Source links and PubMed searches open external websites.

## Install as a web app

There is no native macOS, Windows, Linux, iOS, or Android installer.
Open **Settings → Installation help** in the public app. Your browser decides
whether to offer **Install App** or **Add to Home Screen**. Installation is
optional; the browser version remains available. The app cannot guarantee
installation support on every browser or device.

The [v0.4.0 release](https://github.com/udhawan97/PalDawn/releases/tag/v0.4.0)
provides source ZIP/tar archives. Reference-model packs are prepared separately;
the newer research desk is on `main` after that tag. There is no native signing,
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
| Reading queue disappeared | Candidate queues reset on reload. Rebuild it from your exported Markdown plan; the candidate does not import that export. |
| Local build fails | Use Node.js 22+, run `npm ci` in `app/`, then the documented test command. Keep the first error when reporting a problem. |

[Report a reproducible problem](https://github.com/udhawan97/PalDawn/issues).
Include the browser, the action, and the visible error; exclude patient data,
private notes, and credentials. See [app commands](../app/README.md) for development.
