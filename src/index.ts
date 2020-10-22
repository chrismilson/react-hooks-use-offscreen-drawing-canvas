import { expose, transfer, wrap } from 'comlink'
import { useEffect, useMemo, useRef, useState } from 'react'
import useCanvasSize from 'react-hooks-use-canvas-size'

export type DrawingMethodProps = {
  /** The width of the context */
  width: number
  /** The height of the context */
  height: number
  /**
   * A flag that tells the drawing method about the user's motion preferences.
   * Perhaps a drawing method that has excessive movement would include a case
   * for users that prefer reduced motion. Defaults to reduced motion.
   */
  prefersReducedMotion: boolean
}

/**
 * A drawing method for an OffscreenCanvas 2d drawing context. If any cleanup is
 * needed before the context is removed, then a cleanup method can be returned.
 */
export type OffscreenDrawingMethod = (
  /** A 2d context on the referenced canvas */
  context: OffscreenCanvasRenderingContext2D,
  /**
   * Some properties about the drawing context.
   */
  props: DrawingMethodProps
) => void | (() => void)

export function useOffscreenDrawingCanvas(
  initWorkerModule: () => Promise<typeof import('worker-loader!*')>
): React.MutableRefObject<HTMLCanvasElement> {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sentCanvas, setSentCanvas] = useState(false)
  const { width, height } = useCanvasSize(canvasRef)

  // We first need to load and wrap the worker-wrapped drawing method.
  const proxy = useMemo(async () => {
    const Worker = (await initWorkerModule()).default
    return wrap<ExposedOffscreenDrawingMethod>(new Worker())
  }, [initWorkerModule])

  // Then we need to send the canvas to the worker thread.
  useEffect(() => {
    const sendCanvas = async () => {
      const offscreen = canvasRef.current.transferControlToOffscreen()
      await (await proxy).setCanvas(transfer(offscreen, [offscreen]))
      setSentCanvas(true)
    }
    sendCanvas()
  }, [proxy, sentCanvas])

  useEffect(() => {
    proxy.then((exposed) =>
      exposed.setProps({
        width,
        height,
        prefersReducedMotion: !window.matchMedia(
          '(prefers-reduced-motion: no-preferece)'
        ).matches
      })
    )
  }, [proxy, height, width])

  return canvasRef
}

class ExposedOffscreenDrawingMethod {
  draw: OffscreenDrawingMethod
  ctx: OffscreenCanvasRenderingContext2D
  props: DrawingMethodProps
  cleanup: (() => void) | void

  constructor(draw: OffscreenDrawingMethod) {
    this.draw = draw
    this.ctx = null
    this.props = {
      width: 300,
      height: 150,
      prefersReducedMotion: true
    }
  }

  private cleanupIfNeeded() {
    if (this.cleanup) this.cleanup()
  }

  private startDrawing() {
    if (!this.ctx) return
    this.cleanup = this.draw(this.ctx, this.props)
  }

  setCanvas(canvas: OffscreenCanvas) {
    this.cleanupIfNeeded()

    this.ctx = canvas.getContext('2d')

    this.startDrawing()
  }

  setProps(props: Partial<DrawingMethodProps>) {
    if (this.cleanup) this.cleanup()

    this.props = {
      ...this.props, // keep our original props
      ...props // but overwrite any chaned props
    }

    this.startDrawing()
  }
}

/**
 * Wraps a drawing method, so that it can be initialised with an offscreen
 * canvas and called with a 2d drawing context.
 *
 * @param draw The offscreen drawing method
 */
export function exposeOffscreenDrawingMethod(
  draw: OffscreenDrawingMethod
): void {
  expose(new ExposedOffscreenDrawingMethod(draw))
}
