class DoubleLinkedListNode<T> {
  public data: T
  public preNode: DoubleLinkedListNode<T> | null = null
  public nextNode: DoubleLinkedListNode<T> | null = null
  private parentLinkedChain: DoubleLinked<T>
  constructor(
    value: T,
    parentLinkedChain: DoubleLinked<T>,
    preNode: DoubleLinkedListNode<T> | null = null,
    nextNode: DoubleLinkedListNode<T> | null = null
  ) {
    this.data = value
    this.nextNode = nextNode
    this.preNode = preNode
    this.parentLinkedChain = parentLinkedChain
  }
  delete() {
    this.parentLinkedChain.deleteNode(this)
  }
}

export class DoubleLinked<T> {
  public firstNode: DoubleLinkedListNode<T> | null = null
  public lastNode: DoubleLinkedListNode<T> | null = null
  public size: number = 0
  constructor() {}

  /**
   * 从顶部塞入数据
   * @param value 数据
   */
  push(value: T) {
    const node = new DoubleLinkedListNode(value, this)
    // 当没有元素的时候，最前和最后的元素都是一个，但是该节点无前无后节点
    if (this.size === 0) {
      this.firstNode = node
      this.lastNode = node
    }
    //当只有一个元素时
    else if (this.size === 1) {
      this.firstNode!.preNode = node
      this.lastNode = this.firstNode
      this.firstNode = node
    } else {
      this.firstNode!.preNode = node
      node.nextNode = this.firstNode
      this.firstNode = node
    }
    this.size += 1
  }

  /**
   * 从底部塞入数据
   * @param value 数据
   */
  append(value: T) {
    const node = new DoubleLinkedListNode(value, this)
    if (this.size === 0) {
      this.firstNode = node
      this.lastNode = node
    } else if (this.size === 1) {
      this.firstNode!.nextNode = node
      node.preNode = this.firstNode
      this.lastNode = node
    } else {
      this.lastNode!.nextNode = node
      node.preNode = this.lastNode
      this.lastNode = node
    }
    this.size += 1
    return node
  }

  /**
   * 从顶部弹出元素
   */
  pop() {
    let data
    if (this.size === 0) return null
    if (this.size === 1) {
      data = this.firstNode!.data
      this.firstNode = null
      this.lastNode = null
    } else {
      data = this.firstNode!.data
      this.firstNode = this.firstNode!.nextNode
      this.firstNode!.preNode = null
    }
    this.size -= 1
    return data
  }

  /**
   * 获取顶部节点
   */
  getFirstNode() {
    return this.firstNode
  }

  /**
   * 获取最后的一个节点
   */
  getLastNode() {
    return this.lastNode
  }

  forEach(callback: (value: T) => void) {
    let node = this.firstNode
    while (node) {
      callback(node.data)
      node = node.nextNode
    }
  }

  /**
   * 删除节点
   * @param node 要删除的节点
   */
  deleteNode(node: DoubleLinkedListNode<T>) {
    if (node.nextNode) node.nextNode.preNode = node.preNode
    if (node.preNode) node.preNode.nextNode = node.nextNode
  }

  /**
   * 从一个点截断这个链表
   * @param node 从截断开始的节点
   */
  cutOffFromNode(node: DoubleLinkedListNode<T>) {
    node.nextNode = null
    this.lastNode = node
  }
}
