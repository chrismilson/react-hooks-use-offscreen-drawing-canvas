# Use Offscreen Drawing Canvas

This module is based on my simmilar module
[react-hooks-use-drawing-canvas](https://www.npmjs.com/package/react-hooks-use-drawing-canvas)
that runs the drawing code on the main thread. When running potentially complex
drawings however, the main thread will block while drawing calculation is being
done.

To overcome this, we can make use of the
[`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
interface, and run the drawing method in a web-worker thread that will never
block the main thread. Even while it is calculating!

## Installation

```bash
yarn add react-hooks-use-offscreen-drawing-canvas
```

<!-- TODO: ## Usage -->



<!-- TODO: ## Types -->


