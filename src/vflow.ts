import { EventEmitter } from './event'
import { DoubleLinked } from './linked'

const toInt = (x: any) => {
  return parseInt(x.toString())
}

/**
 * 这样写好在后期知道是什么东西
 */
enum NodeConst {
  node = 'node',
  inputs = 'inputs',
  outputs = 'outputs',
  content = 'content',
  input = 'input',
  output = 'output',

  /**
   * 当本节点作为输出时的连接的svg对象的css名称
   */
  ToutConnectCssName = 'out-node',
  TinConnectCssName = 'in-node',
  ToutCss = 'out-',
  TinCss = 'in-',
  inputCssname = 'input_point',
  outputCssname = 'output_point',

  /**
   * path 的cssname
   */
  pathCssName = 'path',

  /**
   * svg 的cssname
   */
  connectionCssName = 'connection',

  /**
   * 临时连接
   */
  tmpConnection = 'tmpConnection'
}

interface IPostion {
  x: number
  y: number
}

/**
 * 添加节点时的选项
 * @param id 添加节点的ID，如果设置则当前Flow的全局id以此为自增
 * @param postion 设置节点的起始位置
 * @param HTML 节点的内容
 * @param outputsID 输出连接到何处
 * @param inputsID 被那些节点连接
 * @param data T
 */
export interface NodeOptions<T> {
  id?: number
  postion?: IPostion
  HTML?: string | Element
  typo?: string
  data: T
}

interface ToNode {
  nodeID: number
  outputID: number
  inputID: number
}

interface INodeEvent {
  outPutAdd: number
  outPutDelete: number
  inPutAdd: number
  inPutDelete: number
  delete: number
  connectTo: { outID: number; toNode: Node<any>; inID: number }
  deleteConnect: { outID: number; toNode: Node<any>; inID: number }
  contentSet: string | Element
  postionChange: IPostion
}
export interface Node<T> extends EventEmitter {
  emit<K extends keyof INodeEvent>(event: K, data: INodeEvent[K]): boolean
  on<K extends keyof INodeEvent>(type: K, listener: (this: VFlow<T>, ev: INodeEvent[K]) => any): this
}

export class Node<T> extends EventEmitter {
  private parentNode: HTMLElement
  private element: HTMLElement
  private inputEle: HTMLElement
  private outputEle: HTMLElement
  private contentEle: HTMLDivElement
  private inputCount: number = 0
  private outputCount: number = 0
  readonly ID: number

  public outputIDs: number[] = []
  public inputIDs: number[] = []
  public toNodes: ToNode[] = []
  public inNodes: ToNode[] = []
  public postion?: IPostion
  public data: T

  /**
   * 临时的svg对象，在鼠标拖动过程中绘制
   */
  public tmepSVG: SVGPathElement | null = null
  public tempOutID: number | null = null
  public zoom: number
  public contentHTML?: string
  public regTypo?: string

  constructor(parentNode: HTMLElement, options: NodeOptions<T>, zoom: number) {
    super()
    this.parentNode = parentNode
    this.ID = options.id!
    this.zoom = zoom
    const element = document.createElement('div')
    element.setAttribute('id', `${NodeConst.node}-${options.id!}`)
    element.classList.add(NodeConst.node)

    const inputs = document.createElement('div')
    inputs.setAttribute('class', NodeConst.inputs)

    const output = document.createElement('div')
    output.setAttribute('class', NodeConst.outputs)

    const content = document.createElement('div')
    content.setAttribute('class', NodeConst.content)

    element.appendChild(content)
    element.appendChild(inputs)
    element.appendChild(output)

    this.data = options.data
    this.inputEle = inputs
    this.element = element
    this.outputEle = output
    this.contentEle = content
    this.regTypo = options.typo
    this.parentNode.appendChild(element)
    this.setContent(options.HTML!)
    options.postion ? this.setPostion(options.postion) : ''
  }
  // 添加一个输出节点
  addOutPut(id?: number) {
    this.outputCount = id === undefined ? this.outputCount + 1 : id
    const outPutEle = document.createElement('div')
    outPutEle.setAttribute('class', NodeConst.outputCssname)
    outPutEle.classList.add(`${NodeConst.output}-${this.outputCount}`)
    this.outputEle.appendChild(outPutEle)
    this.outputIDs.push(this.outputCount)
    this.emit('outPutAdd', this.outputCount)
  }

  /**
   * 同 addInPut 方法
   * @param id outID
   */
  deleteOutPut(id: number) {
    const eleC = this.parentNode.getElementsByClassName(`${NodeConst.output}-${id}`)
    Array.from(eleC).forEach((ele) => {
      ele.remove()
    })
    for (let i = 0; i < this.toNodes.length; i++) {
      const _tempInfo = this.toNodes[i]
      if (_tempInfo.outputID === id) {
        this.toNodes.splice(i, 1)
      }
    }
    this.emit('outPutDelete', id)
  }

  /**
   * 添加一个输入节点，如果传入id为空，则自增一个，一般情况下，只有在导入数据的过程中才需要指定
   * @param id 节点的id
   */
  addInPut(id?: number) {
    this.inputCount = id === undefined ? this.inputCount + 1 : id
    const inPutEle = document.createElement('div')
    inPutEle.setAttribute('class', NodeConst.inputCssname)
    inPutEle.classList.add(`${NodeConst.input}-${this.inputCount}`)
    this.inputEle.appendChild(inPutEle)
    this.inputIDs.push(this.inputCount)
    this.emit('inPutAdd', this.inputCount)
  }

  /**
   * 获取输出点的相对与画布的位置
   * @param id 点的id
   */
  getOutputPostion(id: number) {
    const domRect = this.getOutputEle(id).getBoundingClientRect()
    const canvasDomRect = this.parentNode.getBoundingClientRect()
    const c = {
      x: toInt(domRect.x + domRect.width / 2 - canvasDomRect.x) / this.zoom,
      y: toInt(domRect.y + domRect.height / 2 - canvasDomRect.y) / this.zoom
    } as IPostion
    return c
  }

  /**
   * 同getOutputPostion
   */
  getInputPostion(id: number) {
    const domRect = this.getInputEle(id).getBoundingClientRect()
    const canvasDomRect = this.parentNode.getBoundingClientRect()
    return {
      x: toInt(domRect.x + domRect.width / 2 - canvasDomRect.x) / this.zoom,
      y: toInt(domRect.y + domRect.height / 2 - canvasDomRect.y) / this.zoom
    } as IPostion
  }
  private getInputEle(id: number) {
    return this.element.getElementsByClassName(`${NodeConst.input}-${id}`)[0] as HTMLElement
  }
  private getOutputEle(id: number) {
    return this.element.getElementsByClassName(`${NodeConst.output}-${id}`)[0] as HTMLElement
  }

  /**
   * 删除本节点
   */
  delete() {
    this.element.remove()
    this.deleteNodeConnection()
    this.emit('delete', this.ID)
  }

  /**
   *删除所有和本节点相关的连接
   * @param id 目标node的id
   */
  private deleteNodeConnection() {
    const outConnections = this.parentNode.getElementsByClassName(this.getOutConnectionCssName())
    // for of 不能用于HTMLCollectionOf的遍历
    // https://stackoverflow.com/questions/22754315/for-loop-for-htmlcollection-elements
    Array.from(outConnections).forEach((ele) => ele.remove())
    const inConnections = this.parentNode.getElementsByClassName(this.getInConnectionCssName())
    Array.from(inConnections).forEach((ele) => ele.remove())
  }
  getOutConnectionCssName() {
    return `${NodeConst.ToutConnectCssName}-${this.ID}`
  }
  getInConnectionCssName() {
    return `${NodeConst.TinConnectCssName}-${this.ID}`
  }
  setInConnectNode(inNode: ToNode) {
    this.inNodes.push(inNode)
  }

  /**
   * 链接本节点到另一节点
   * @param outID 本节点的输出id
   * @param inNode 被输入的节点
   * @param inID 被输入的节点的输入id
   */
  connectToNode(outID: number, inNode: Node<T>, inID: number) {
    const info = {
      outputID: outID,
      inputID: inID,
      nodeID: inNode.ID
    }
    // TODO 写个deepequal函数
    for (const _info of this.toNodes) {
      if (_info.outputID === info.outputID && _info.nodeID === info.nodeID && _info.inputID === info.inputID) return
    }
    if (this.toNodes.includes(info)) return
    const { connection, path } = this.creatConnectionAndPath()
    connection.setAttribute('class', this.getOutConnectCssName(outID, inNode, inID))
    path.setAttributeNS(null, 'd', this.getOutConnectPath(outID, inNode, inID))
    this.toNodes.push(info)
    inNode.setInConnectNode({
      nodeID: this.ID,
      outputID: outID,
      inputID: inID
    })
    this.emit('connectTo', {
      outID: outID,
      toNode: inNode,
      inID: inID
    })
  }

  deleteConnectionToNode(outID: number, inNode: Node<T>, inID: number) {
    const cssName = this.getOutConnectCssName(outID, inNode, inID)
    this.parentNode.getElementsByClassName(cssName)[0].remove()
    for (let i = 0; i < this.toNodes.length; i++) {
      const _tempInfo = this.toNodes[i]
      if (_tempInfo.outputID === outID && _tempInfo.nodeID === inNode.ID && _tempInfo.outputID === outID) {
        this.toNodes.splice(i, 1)
      }
    }
    for (let i = 0; i < inNode.inNodes.length; i++) {
      const _tempInfo = inNode.inNodes[i]
      if (_tempInfo.outputID === outID && _tempInfo.nodeID === this.ID && _tempInfo.outputID === outID) {
        inNode.inNodes.splice(i, 1)
      }
    }
    this.emit('deleteConnect', {
      outID: outID,
      toNode: inNode,
      inID: inID
    })
  }

  private creatConnectionAndPath() {
    const connection = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttributeNS(null, 'd', '')
    path.setAttribute('class', NodeConst.pathCssName)
    connection.appendChild(path)
    this.parentNode.appendChild(connection)
    return { connection, path }
  }

  getCommonOutConnectCss() {
    return `${NodeConst.connectionCssName} ${this.getOutConnectionCssName()}`
  }

  getOutConnectCssName(outID: number, inNode: Node<T>, inID: number) {
    return `${this.getCommonOutConnectCss()} ${inNode.getInConnectionCssName()} ${NodeConst.TinCss}${inID} ${
      NodeConst.ToutCss
    }${outID}`
  }

  getInConnectCssName(inID: number, outNode: Node<T>, outID: number) {
    return `${NodeConst.connectionCssName} ${outNode.getOutConnectionCssName()} ${this.getInConnectionCssName()} ${
      NodeConst.TinCss
    }${inID} ${NodeConst.ToutCss}${outID}`
  }

  getOutConnectPath(outID: number, inNode: Node<T>, inID: number) {
    const outPostion = this.getOutputPostion(outID)
    const inPostion = inNode.getInputPostion(inID)
    return this.getPath(inPostion, outPostion)
  }

  getInConnectPath(inID: number, outNode: Node<T>, outID: number) {
    const outPostion = outNode.getOutputPostion(outID)
    const inPostion = this.getInputPostion(inID)
    return this.getPath(inPostion, outPostion)
  }

  updateOutConnect(outID: number, inNode: Node<T>, inID: number) {
    const connectEle = this.parentNode.getElementsByClassName(
      this.getOutConnectCssName(outID, inNode, inID)
    )[0] as HTMLElement
    const path = connectEle.children[0]
    path.setAttributeNS(null, 'd', this.getOutConnectPath(outID, inNode, inID))
  }

  updateInConnect(inID: number, outNode: Node<T>, outID: number) {
    const connectEle = this.parentNode.getElementsByClassName(
      this.getInConnectCssName(inID, outNode, outID)
    )[0] as HTMLElement
    const path = connectEle.children[0]
    path.setAttributeNS(null, 'd', this.getInConnectPath(inID, outNode, outID))
  }

  getPath(inPostion: IPostion, outPostion: IPostion) {
    // 这个是 控制点的倍率，以中心点区分，上下各拖动整体的多少
    const RATE = 0.7
    const CPointX1 = outPostion.x + Math.abs(inPostion.x - outPostion.x) * RATE
    const CPointX2 = inPostion.x - Math.abs(inPostion.x - outPostion.x) * RATE

    return `M ${outPostion.x} ${outPostion.y} C ${toInt(CPointX1)} ${toInt(outPostion.y)} ${toInt(CPointX2)} ${toInt(
      inPostion.y
    )} ${inPostion.x} ${inPostion.y}`
  }

  setContent(html: string | Element) {
    if (typeof html === 'string') {
      this.contentEle.innerHTML = html
      this.contentHTML = html
    } else {
      this.contentEle.appendChild(html)
    }
    this.emit('contentSet', html)
  }

  /**
   * 设置node的位置
   * @param pos
   */
  setPostion(pos: IPostion) {
    this.element.style.left = `${pos.x}px`
    this.element.style.top = `${pos.y}px`
    this.postion = pos
    this.emit('postionChange', pos)
  }

  getNodePostion(): IPostion {
    const domRect = this.element.getBoundingClientRect()
    return { x: toInt(domRect.x), y: toInt(domRect.y) }
  }

  /**
   * 绘制临时path
   * @param postion
   */
  drawTempConnect(postion: IPostion, outID: number) {
    if (this.tmepSVG === null) {
      const { connection, path } = this.creatConnectionAndPath()
      connection.setAttribute('class', this.getCommonOutConnectCss())
      this.tmepSVG = path
    }
    const outPostion = this.getOutputPostion(outID)
    this.tmepSVG.setAttributeNS(null, 'd', this.getPath(postion, outPostion))
    this.tempOutID = outID
  }

  clearTempConnection() {
    this.tmepSVG?.parentElement?.remove()
    this.tmepSVG = null
    this.tempOutID = null
  }
}

/**
 * <div id="vlfow">
        <div class="inputs">
          <div class="input-1"></div>
        </div>
        <div class='content'></div>
        <div class="outputs">
          <div class="output-1"></div>
        </div>
    </div>
    <div id='node-2'>
        <div class="inputs"></div>
        <div class='content'></div>
        <div class="outputs"></div>
    </div>
    ...
    从节点1的输出点2连接到节点2的输入点3
    <svg class="out-node-1 in-node-2 out-2 in-3" c>
      <path></path>
    </svg>
    ...
</div>
 */

enum FlowConst {
  containerCss = 'vflow-container',
  CssCanvas = 'flow-canvas',
  SelectedFlag = 'selected'
}

interface FlowEvent<T> {
  nodeAdd: Node<T>
  nodeDelete: Node<T>
  nodeConnect: {
    outNode: Node<T>
    inNode: Node<T>
    outID: number
    inID: number
  }
}
interface RegistNode {
  html: any
  props?: any
  options?: any
}

interface ExportNodeData<T> extends NodeOptions<T> {
  toNode: ToNode[]
  inNode: ToNode[]
  inPut: number[]
  outPut: number[]
}

export interface VFlow<T> {
  on<K extends keyof FlowEvent<T>>(type: K, listener: (this: VFlow<T>, ev: FlowEvent<T>[K]) => any): this
  // 开发时好用，自动提示
  emit<K extends keyof FlowEvent<T>>(type: K, ev: FlowEvent<T>[K]): boolean
}

export class VFlow<T> extends EventEmitter {
  private inHistory = false
  private zoom: number = 1
  public zoomMax = 1.6
  public zoomMin = 0.4
  private container: HTMLElement
  private canvasContainer: HTMLElement
  private nodeID: number = 0
  private nodes: Map<number, Node<T>> = new Map()
  private history: DoubleLinked<ExportNodeData<T>[]> = new DoubleLinked()

  /**
   * 当点击时，被选中的对象
   */
  private selectedEle?: HTMLElement
  private selectedType?:
    | FlowConst.CssCanvas
    | FlowConst.SelectedFlag
    | NodeConst.node
    | NodeConst.inputCssname
    | NodeConst.outputCssname
    | NodeConst.connectionCssName

  /**
   * 当鼠标点击的时候，的位置，这个位置记录是为了在拖拽的
   * 时候不让被拖拽的ele的(0,0)位置瞬移到鼠标上
   */
  private clickPostion?: IPostion

  /**
   * 当移动画板时，记录鼠标点击时的初始位置，计算移动多少
   */
  private canvasMoveStartPostion?: IPostion
  private canvasNowTranslate: IPostion = { x: 0, y: 0 }
  private drawConnectionNodeID?: number
  private render?: any
  private rNode: Map<string, RegistNode> = new Map()
  constructor(container: HTMLElement, render?: any) {
    super()
    this.render = render
    this.container = container
    this.container.tabIndex = 0
    container.classList.add(FlowConst.containerCss)
    const canvas = document.createElement('div')
    canvas.classList.add(FlowConst.CssCanvas)
    this.canvasContainer = canvas
    this.container.appendChild(canvas)

    this.container.addEventListener('mousedown', this.click.bind(this))
    this.container.addEventListener('mousemove', this.mouseMove.bind(this))
    this.container.addEventListener('mouseup', this.mouseUP.bind(this))

    this.container.addEventListener('wheel', this.zoomEnter.bind(this))

    this.container.addEventListener('keyup', this.keyEventHandle.bind(this))
    this.container.addEventListener('keydown', () => {
      this.inHistory = true
    })
    this.container.addEventListener('keyup', () => {
      this.inHistory = false
    })
  }

  registNode(typo: string, node: RegistNode) {
    this.rNode.set(typo, node)
    return typo
  }

  private getRegistEle(typo: string) {
    const nodeTypo = this.rNode.get(typo)!
    const wrapper = new this.render({
      render: (h: Function) => h(nodeTypo.html, { props: nodeTypo.props }),
      ...nodeTypo.options
    }).$mount()
    return wrapper.$el as Element
  }

  addNode(options: NodeOptions<T>) {
    console.log(options)
    this.nodeID = options.id ? options.id : this.nodeID
    options.id = this.nodeID
    options.HTML = options.typo ? this.getRegistEle(options.typo) : options.HTML
    const node = new Node<T>(this.canvasContainer, options, this.zoom)
    this.nodes.set(this.nodeID, node)
    this.nodeID += 1
    this.emit('nodeAdd', node)
    node.addEventListenr(() => {
      this.logHistory()
    })
    return node
  }

  /**
   * 截获节点事件，添加
   */
  private logHistory() {
    this.history.append(this.export())
  }

  deleteNode(id: number) {
    const node = this.nodes.get(id)
    node?.delete()
    if (node) this.emit('nodeDelete', node)
    this.nodes.delete(id)
  }

  connectNodes(outNode: Node<T>, outID: number, inNode: Node<T>, inID: number) {
    const svgNodeClass = this.getConnectNodeCss(outNode, inNode)
    const eleC = this.canvasContainer.getElementsByClassName(svgNodeClass)
    // 如果已经连接了，就不让在连接
    if (eleC.length === 1) return
    this.emit('nodeConnect', {
      outNode,
      inNode,
      outID,
      inID
    })
    outNode.connectToNode(outID, inNode, inID)
  }

  private getConnectNodeCss(outNode: Node<T>, inNode: Node<T>) {
    return `${NodeConst.connectionCssName} ${outNode.getOutConnectionCssName()} ${inNode.getInConnectionCssName()}`
  }

  /**
   * 当点击画板时，标记选定的对象和状态
   * @param event 鼠标事件
   */
  private click(event: MouseEvent) {
    this.clickPostion = {
      x: event.x,
      y: event.y
    }
    let ele = event.target as HTMLElement
    const contentSelector = '.' + NodeConst.content
    if (ele.closest(contentSelector) !== null) {
      ele = ele.closest(contentSelector)! as HTMLElement
    }
    const cssName = ele.classList ? ele.classList[0] : ''
    console.info('dlog-vflow:157', cssName)
    this.removeSelectFlag()
    switch (cssName) {
      case FlowConst.CssCanvas:
        this.selectedType = FlowConst.CssCanvas
        this.canvasMoveStartPostion = {
          x: event.x,
          y: event.y
        }
        this.container.classList.add(FlowConst.SelectedFlag)
        break
      case FlowConst.containerCss:
        this.selectedType = FlowConst.CssCanvas
        this.canvasMoveStartPostion = {
          x: event.x,
          y: event.y
        }
        this.container.classList.add(FlowConst.SelectedFlag)
        break
      case NodeConst.node:
        this.selectedEle = ele
        this.selectedType = NodeConst.node
        this.calcBL(event)
        break
      case NodeConst.content:
        this.selectedType = NodeConst.node
        this.selectedEle = ele.parentElement!
        this.calcBL(event)
        break
      case NodeConst.inputCssname:
        this.selectedEle = ele
        this.selectedType = NodeConst.inputCssname
        break
      case NodeConst.outputCssname:
        this.selectedType = NodeConst.outputCssname
        this.selectedEle = event.target as HTMLElement
        break
      // case NodeConst.inputs || NodeConst.outputs:
      //   this.selectedEle = ele.parentElement
      //   this.selectedType = NodeConst.node
      //   break
      case NodeConst.pathCssName:
        this.selectedType = NodeConst.connectionCssName
        this.selectedEle = ele.parentElement!
        break
      default:
        break
    }
    if (this.selectedEle !== undefined) {
      this.selectedEle.classList.add(FlowConst.SelectedFlag)
    }
  }

  private mouseMove(event: MouseEvent) {
    if (!this.selectedType) return
    event.preventDefault()
    switch (this.selectedType) {
      case NodeConst.node:
        this.nodeMove(event)
        break
      case FlowConst.CssCanvas:
        this.canvasMove(event)
        break
      case NodeConst.outputCssname:
        this.drawConnect(event)
        break
    }
  }

  private nodeMove(event: MouseEvent) {
    const nodeID = parseInt(this.selectedEle?.id.split('-')[1]!)
    const node = this.nodes.get(nodeID)!
    const postion = this.getRelativePostionInNode(event)
    node.setPostion(postion)

    const inNodes = node.inNodes
    for (const connectInfo of inNodes) {
      const _inNode = this.nodes.get(connectInfo.nodeID)
      if (_inNode) {
        node.updateInConnect(connectInfo.inputID, _inNode, connectInfo.outputID)
      }
    }

    const outNodes = node.toNodes
    for (const connectInfo of outNodes) {
      const _outNode = this.nodes.get(connectInfo.nodeID)
      if (_outNode) {
        node.updateOutConnect(connectInfo.outputID, _outNode, connectInfo.inputID)
      }
    }
  }

  /**
   * 移动画板
   * @param event
   */
  private canvasMove(event: MouseEvent) {
    const x = this.canvasNowTranslate.x + event.x - this.canvasMoveStartPostion?.x!
    const y = this.canvasNowTranslate.y + event.y - this.canvasMoveStartPostion?.y!
    this.canvasMoveStartPostion = { x: event.x, y: event.y }
    this.canvasNowTranslate = { x, y }
    this.canvasContainer.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + this.zoom + ')'
  }

  /**
   * 计算点击时，鼠标在被选择的ele内部的相对位置
   */
  private calcBL(event: MouseEvent) {
    const canvasDomRect = this.canvasContainer.getBoundingClientRect()
    const elePosX = this.selectedEle!.offsetLeft
    const elePosY = this.selectedEle!.offsetTop
    const blX = (event.x - canvasDomRect.x) / this.zoom - elePosX
    const blY = (event.y - canvasDomRect.y) / this.zoom - elePosY
    this.clickPostion = { x: blX, y: blY }
  }

  /**
   * 鼠标在Node内的相对位置
   * @param event 鼠标事件
   */
  private getRelativePostionInNode(event: MouseEvent): IPostion {
    const canvasDomRect = this.canvasContainer.getBoundingClientRect()
    return {
      x: toInt((event.x - canvasDomRect.x) / this.zoom - this.clickPostion?.x!),
      y: toInt((event.y - canvasDomRect.y) / this.zoom - this.clickPostion?.y!)
    }
  }

  /**
   * 获取鼠标在canvas中的相对位置
   * @param event
   */
  private getRelativePostionInCanvas(event: MouseEvent): IPostion {
    const canvasDomRect = this.canvasContainer.getBoundingClientRect()
    return { x: toInt((event.x - canvasDomRect.x) / this.zoom), y: toInt((event.y - canvasDomRect.y) / this.zoom) }
  }

  private mouseUP(event: MouseEvent) {
    if (this.drawConnectionNodeID !== undefined) {
      this.overDrawConnect(event)
    }
    this.selectedEle = undefined
    this.selectedType = undefined
    this.clickPostion = undefined
    this.canvasMoveStartPostion = undefined
    this.drawConnectionNodeID = undefined
    this.container.classList.remove(FlowConst.SelectedFlag)
  }

  /**
   * 动态的画连接线
   * @param event
   */
  private drawConnect(event: MouseEvent) {
    const outID = toInt(this.selectedEle!.classList[1].split('-')[1])
    const nodeEle = this.selectedEle!.closest('.' + NodeConst.node)
    if (!nodeEle) return
    const nodeID = toInt(nodeEle.id.split('-')[1])
    this.drawConnectionNodeID = nodeID
    const node = this.nodes.get(nodeID)!
    node.drawTempConnect(this.getRelativePostionInCanvas(event), outID)
  }

  /**
   * 结束drawConnect
   * @param event
   */
  private overDrawConnect(event: MouseEvent) {
    const ele = event.target as HTMLElement
    const outNode = this.nodes.get(this.drawConnectionNodeID!)!
    if (NodeConst.inputCssname !== ele.classList[0]) {
      outNode.clearTempConnection()
      return
    }
    const inNode = this.nodes.get(toInt(ele.closest('.' + NodeConst.node)?.id.split('-')[1]))!
    const inID = toInt(ele.classList[1].split('-')[1])
    outNode.connectToNode(outNode.tempOutID!, inNode, inID)
    outNode.clearTempConnection()
  }

  /**
   * 删除selected这个css标志，而不是删除selected的ele对象
   */
  private removeSelectFlag() {
    const selectedEleC = this.canvasContainer.querySelectorAll('.' + FlowConst.SelectedFlag)
    for (const ele of selectedEleC) {
      ele.classList.remove(FlowConst.SelectedFlag)
    }
  }

  private zoomRefresh() {
    this.canvasContainer.style.transform =
      'translate(' + this.canvasNowTranslate.x + 'px, ' + this.canvasNowTranslate.y + 'px) scale(' + this.zoom + ')'
    this.nodes.forEach((node) => {
      node.zoom = this.zoom
    })
  }

  private zoomIn() {
    if (this.zoom < this.zoomMax) {
      this.zoom += 0.01
      this.zoomRefresh()
    }
  }

  private zoomOut() {
    if (this.zoom > this.zoomMin) {
      this.zoom -= 0.01
      this.zoomRefresh()
    }
  }

  private zoomReset() {
    this.zoom = 1
    this.zoomRefresh()
  }

  private zoomEnter(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault()
      if (event.deltaY > 0) {
        this.zoomOut()
      } else {
        this.zoomIn()
      }
    }
  }

  private keyEventHandle(event: KeyboardEvent) {
    console.info('dlog-vflow:377', event)
    if (event.key === 'Delete' || (event.key === 'Backspace' && event.metaKey)) {
      this.keyDelete()
    }
    if (event.code === 'KeyZ' && event.metaKey && !event.shiftKey) {
      console.info('dlog-vflow:430', '撤销')
    }
    if (event.code === 'KeyZ' && event.metaKey && event.shiftKey) {
      console.info('dlog-vflow:430', 'redo')
    }
    if (event.key === '0' && event.metaKey) {
      this.zoomReset()
    }
  }

  /**
   * 删除事件
   */
  private keyDelete() {
    const selectedEle = this.container.querySelector('.' + FlowConst.SelectedFlag)
    if (selectedEle === null) return
    console.info('dlog-vflow:389', selectedEle)
    const classList = selectedEle.classList
    const cssName = classList[0]

    let nodeID
    let outID
    let outNode
    let inNode
    let inID

    // 当被选择的是节点的时候，则直接删除节点
    if (cssName === NodeConst.node) {
      nodeID = toInt(selectedEle.id.split('-')[1])
      this.deleteNode(nodeID)
    }

    // 当被选择的是输出/输入点时，如果该点没有连线，则删除点，如果有线则删除线
    if (cssName === NodeConst.outputCssname) {
      console.info('dlog-vflow:467', cssName)
      outID = toInt(classList[1].split('-')[1])
      nodeID = toInt(selectedEle.parentElement?.parentElement?.id.split('-')[1])
      console.info('dlog-vflow:470', outID, nodeID)
      const node = this.nodes.get(nodeID)!
      console.info('dlog-vflow:472', node)
    }

    // 当被选择的是
    if (cssName === NodeConst.connectionCssName) {
      outNode = this.nodes.get(toInt(classList[1].split(NodeConst.ToutConnectCssName + '-')[1]))
      inNode = this.nodes.get(toInt(classList[2].split(NodeConst.TinConnectCssName + '-')[1]))!
      inID = toInt(classList[3].split(NodeConst.TinCss)[1])
      outID = toInt(classList[4].split(NodeConst.ToutCss)[1])
      outNode?.deleteConnectionToNode(outID, inNode, inID)
    }
  }

  export() {
    const exportData: ExportNodeData<T>[] = []
    this.nodes.forEach((node) => {
      const data = {
        id: node.ID,
        postion: node.postion,
        HTML: node.contentHTML,
        typo: node.regTypo,
        data: node.data,
        toNode: node.toNodes,
        inNode: node.inNodes,
        inPut: node.inputIDs,
        outPut: node.outputIDs
      }
      exportData.push(data)
    })
    return exportData
  }

  import(nodeInfos: ExportNodeData<T>[]) {
    nodeInfos.forEach((info) => {
      const _node = this.addNode(info)
      info.inPut.forEach((id) => {
        _node.addInPut(id)
      })
      info.outPut.forEach((id) => {
        _node.addOutPut(id)
      })
    })
    nodeInfos.forEach((info) => {
      const outNode = this.nodes.get(info.id!)
      info.toNode.forEach((_info) => {
        const inNode = this.nodes.get(_info.nodeID)!
        outNode?.connectToNode(_info.outputID, inNode, _info.inputID)
      })
    })
  }
}
