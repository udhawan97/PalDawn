/// <reference types="vite/client" />

declare module '*?scene-recovery' {
  const component: typeof import('./scene/SceneCanvas')['default']
  export default component
}
