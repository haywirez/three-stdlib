import { Camera, EventDispatcher, Intersection, Matrix4, Object3D, Plane, Raycaster, Vector2, Vector3 } from 'three'

class DragControls extends EventDispatcher {
  public enabled = true
  public transformGroup = false

  private _objects: Object3D[]
  private _camera: Camera
  private _domElement: HTMLElement

  private _plane = new Plane()
  private _raycaster = new Raycaster()

  private _mouse = new Vector2()
  private _offset = new Vector3()
  private _intersection = new Vector3()
  private _worldPosition = new Vector3()
  private _inverseMatrix = new Matrix4()
  private _intersections: Intersection[] = []
  private _selected: Object3D | null = null
  private _hovered: Object3D | null = null

  constructor(_objects: Object3D[], _camera: Camera, _domElement: HTMLElement) {
    super()

    this._objects = _objects
    this._camera = _camera
    this._domElement = _domElement

    this.activate()
  }

  public activate = (): void => {
    this._domElement.addEventListener('pointermove', this.onPointerMove)
    this._domElement.addEventListener('pointerdown', this.onPointerDown)
    this._domElement.addEventListener('pointerup', this.onPointerCancel)
    this._domElement.addEventListener('pointerleave', this.onPointerCancel)
    this._domElement.addEventListener('touchmove', this.onTouchMove)
    this._domElement.addEventListener('touchstart', this.onTouchStart)
    this._domElement.addEventListener('touchend', this.onTouchEnd)
  }

  public deactivate = (): void => {
    this._domElement.removeEventListener('pointermove', this.onPointerMove)
    this._domElement.removeEventListener('pointerdown', this.onPointerDown)
    this._domElement.removeEventListener('pointerup', this.onPointerCancel)
    this._domElement.removeEventListener('pointerleave', this.onPointerCancel)
    this._domElement.removeEventListener('touchmove', this.onTouchMove)
    this._domElement.removeEventListener('touchstart', this.onTouchStart)
    this._domElement.removeEventListener('touchend', this.onTouchEnd)

    this._domElement.style.cursor = ''
  }

  // TODO: confirm if this can be removed?
  public dispose = (): void => this.deactivate()

  public getObjects = (): Object3D[] => this._objects

  private onMouseMove = (event: MouseEvent): void => {
    const rect = this._domElement.getBoundingClientRect()

    this._mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this._mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this._raycaster.setFromCamera(this._mouse, this._camera)

    if (this._selected && this.enabled) {
      if (this._raycaster.ray.intersectPlane(this._plane, this._intersection)) {
        this._selected.position.copy(this._intersection.sub(this._offset).applyMatrix4(this._inverseMatrix))
      }

      this.dispatchEvent({ type: 'drag', object: this._selected })

      return
    }

    this._intersections.length = 0

    this._raycaster.setFromCamera(this._mouse, this._camera)
    this._raycaster.intersectObjects(this._objects, true, this._intersections)

    if (this._intersections.length > 0) {
      const object = this._intersections[0].object

      this._plane.setFromNormalAndCoplanarPoint(
        this._camera.getWorldDirection(this._plane.normal),
        this._worldPosition.setFromMatrixPosition(object.matrixWorld),
      )

      if (this._hovered !== object) {
        this.dispatchEvent({ type: 'hoveron', object })

        this._domElement.style.cursor = 'pointer'
        this._hovered = object
      }
    } else {
      if (this._hovered !== null) {
        this.dispatchEvent({ type: 'hoveroff', object: this._hovered })

        this._domElement.style.cursor = 'auto'
        this._hovered = null
      }
    }
  }

  private onMouseDown = (event: MouseEvent): void => {
    event.preventDefault()

    this._intersections.length = 0

    this._raycaster.setFromCamera(this._mouse, this._camera)
    this._raycaster.intersectObjects(this._objects, true, this._intersections)

    if (this._intersections.length > 0) {
      this._selected = this.transformGroup === true ? this._objects[0] : this._intersections[0].object

      if (this._raycaster.ray.intersectPlane(this._plane, this._intersection) && this._selected.parent) {
        this._inverseMatrix.copy(this._selected.parent.matrixWorld).invert()
        this._offset.copy(this._intersection).sub(this._worldPosition.setFromMatrixPosition(this._selected.matrixWorld))
      }

      this._domElement.style.cursor = 'move'

      this.dispatchEvent({ type: 'dragstart', object: this._selected })
    }
  }

  private onMouseCancel = (event: MouseEvent): void => {
    event.preventDefault()

    if (this._selected) {
      this.dispatchEvent({ type: 'dragend', object: this._selected })

      this._selected = null
    }

    this._domElement.style.cursor = this._hovered ? 'pointer' : 'auto'
  }

  private onPointerMove = (event: PointerEvent): void => {
    event.preventDefault()

    switch (event.pointerType) {
      case 'mouse':
      case 'pen':
        this.onMouseMove(event)
        break

      // TODO touch
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    event.preventDefault()

    switch (event.pointerType) {
      case 'mouse':
      case 'pen':
        this.onMouseDown(event)
        break

      // TODO touch
    }
  }

  private onPointerCancel = (event: PointerEvent): void => {
    event.preventDefault()

    switch (event.pointerType) {
      case 'mouse':
      case 'pen':
        this.onMouseCancel(event)
        break

      // TODO touch
    }
  }

  private onTouchMove = (event: TouchEvent): void => {
    event.preventDefault()
    const newEvent = event.changedTouches[0]

    const rect = this._domElement.getBoundingClientRect()

    this._mouse.x = ((newEvent.clientX - rect.left) / rect.width) * 2 - 1
    this._mouse.y = -((newEvent.clientY - rect.top) / rect.height) * 2 + 1

    this._raycaster.setFromCamera(this._mouse, this._camera)

    if (this._selected && this.enabled) {
      if (this._raycaster.ray.intersectPlane(this._plane, this._intersection)) {
        this._selected.position.copy(this._intersection.sub(this._offset).applyMatrix4(this._inverseMatrix))
      }

      this.dispatchEvent({ type: 'drag', object: this._selected })

      return
    }
  }

  private onTouchStart = (event: TouchEvent): void => {
    event.preventDefault()
    const newEvent = event.changedTouches[0]

    const rect = this._domElement.getBoundingClientRect()

    this._mouse.x = ((newEvent.clientX - rect.left) / rect.width) * 2 - 1
    this._mouse.y = -((newEvent.clientY - rect.top) / rect.height) * 2 + 1

    this._intersections.length = 0

    this._raycaster.setFromCamera(this._mouse, this._camera)
    this._raycaster.intersectObjects(this._objects, true, this._intersections)

    if (this._intersections.length > 0) {
      this._selected = this.transformGroup === true ? this._objects[0] : this._intersections[0].object

      this._plane.setFromNormalAndCoplanarPoint(
        this._camera.getWorldDirection(this._plane.normal),
        this._worldPosition.setFromMatrixPosition(this._selected.matrixWorld),
      )

      if (this._raycaster.ray.intersectPlane(this._plane, this._intersection) && this._selected.parent) {
        this._inverseMatrix.copy(this._selected.parent.matrixWorld).invert()
        this._offset.copy(this._intersection).sub(this._worldPosition.setFromMatrixPosition(this._selected.matrixWorld))
      }

      this._domElement.style.cursor = 'move'

      this.dispatchEvent({ type: 'dragstart', object: this._selected })
    }
  }

  private onTouchEnd = (event: TouchEvent): void => {
    event.preventDefault()

    if (this._selected) {
      this.dispatchEvent({ type: 'dragend', object: this._selected })

      this._selected = null
    }

    this._domElement.style.cursor = 'auto'
  }
}

export { DragControls }
