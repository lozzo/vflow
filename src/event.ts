export class EventEmitter {
  private listenersMap: Map<string | symbol, Array<Function>> = new Map()
  public eventListenr: Array<Function> = new Array()
  private MaxListeners = 100
  constructor(MaxListeners: number = 100) {
    this.MaxListeners = MaxListeners
  }
  on(event: string | symbol, listenr: (...args: any[]) => void) {
    if (this.listenersMap.size > this.MaxListeners) {
      console.warn('超出限制最大的listener')
    }
    const eventListensList = this.listenersMap.get(event) || []
    if (eventListensList.indexOf(listenr) === -1) {
      eventListensList.push(listenr)
      this.listenersMap.set(event, eventListensList)
    }
    return this
  }

  /**
   * 添加只要是事件就触发的回调
   * @param listenr 回调函数
   */
  addEventListenr(listenr: (...args: any[]) => void) {
    this.eventListenr.push(listenr)
  }

  emit(event: string | symbol, ...args: any[]) {
    this.eventListenr.forEach((f) => {
      f.apply(null, args)
    })
    const funcList = this.listenersMap.get(event) || []
    if (!funcList) return false
    funcList.forEach((f) => {
      f.apply(null, args)
    })
    return true
  }
  removeListener(event: string | symbol, listener: Function) {
    const funcList = this.listenersMap.get(event) || []
    const i = funcList.indexOf(listener)
    if (i >= 0) {
      funcList.splice(i, 1)
      this.listenersMap.set(event, funcList)
    }
  }
  once(event: string | symbol, listener: Function) {
    if (this.listenersMap.size > this.MaxListeners) {
      console.warn('超出限制最大的listener')
    }
    const fn = (...args: any[]) => {
      listener.apply(null, args)
      this.removeListener(event, fn)
    }
    return this.on(event, fn)
  }

  removeAllListener(event: string | symbol) {
    this.listenersMap.delete(event)
  }
  setMaxListeners(num: number) {
    this.MaxListeners = num
  }

  listeners(event: string | symbol) {
    return this.listenersMap.get(event)
  }
}

export interface EventEmitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this
  emit(event: string | symbol, ...args: any[]): boolean
  once(event: string | symbol, listener: (...args: any[]) => void): this
}
