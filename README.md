# Vflow 
一个简单的可拖拽的流程框图，参考https://github.com/jerosoler/Drawflow 写的ts的版本,功能上基本一致,很多代码甚至是直接抄过来的，由于原作者不打算写ts版本的，于是就写了这个版本作为学习，初学前端和ts，请勿用于生产环境

```vue
<template>
  <div class="home">
    <div id="tt"></div>
  </div>
</template>

<script>
import Vue from 'vue'
import { VFlow } from '../../lib/vflow/vflow'
import styleDrawflow from '../../lib/vflow/vflow.css'
import startNode from '../components/flowNode/startNode.vue'

export default {
  name: 'Home',
  mounted() {
    const container = document.getElementById('tt')
    const vflow = new VFlow(container, Vue)
    const card = vflow.registNode('card', { html: startNode })
    const node1 = vflow.addNode({ typo: 'card', postion: { x: 0, y: 0 }, data: {} })
    const node2 = vflow.addNode({
      typo: 'card',
      postion: { x: 600, y: 250 },
      data: {}
    })
    const node3 = vflow.addNode({ typo: 'card', postion: { x: 300, y: 650 }, data: {} })
    const node4 = vflow.addNode({ typo: 'card', postion: { x: 300, y: 0 }, data: {} })
    // debugger
    node1.addOutPut()
    node1.addOutPut()
    node2.addInPut()
    node2.addInPut()
    node2.addOutPut()
    node3.addInPut()
    node4.addOutPut()
    // node1.connectToNode(2, node2, 1)
    node1.connectToNode(1, node2, 2)
    node2.connectToNode(1, node3, 1)
    node4.connectToNode(1, node3, 1)
  }
}
</script>
```