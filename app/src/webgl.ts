/** Pre-mount capability probe. PalDawn P0 requires WebGL2 (locked decision). */
export function webgl2Available(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null
  } catch {
    return false
  }
}
