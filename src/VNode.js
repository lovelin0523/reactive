/**
 * 虚拟dom对象
 */
class VNode {
	constructor(id, tag, el, children, text, data, parent,root, nodeType, attrs) {
		this.id = id; //节点唯一键
		this.tag = tag; //标签类型，DIV，SPAN，INPUT，#text
		this.el = el; //对应的真实节点
		this.children = children; //当前节点下的子节点
		this.text = text; //当前虚拟节点的文本
		this.data = data; //reactive关联的数据
		this.parent = parent; //父级节点
		this.root = root;//祖先根节点
		this.nodeType = nodeType; //节点类型
		this.attrs = attrs; //存放属性对象数组
		this.$reg = /\{\{(.*?)\}\}/g; //匹配规则
	}

	/**
	 * 标签类型为#TEXT时获取文本内容
	 * @param {Object} el
	 */
	static _getNodeText(el) {
		if (el.nodeType === 3) { // 标签类型为#TEXT时
			return el.nodeValue;
		} else {
			return '';
		}
	}

	/**
	 * 同id虚拟节点比较是否相等
	 * @param {Object} newVNode
	 * @param {Object} oldVNode
	 */
	static _equal(newVNode, oldVNode) {
		if (newVNode.tag !== oldVNode.tag) {
			return false
		}
		if (newVNode.text !== oldVNode.text) {
			return false
		}
		if (newVNode.children.length !== oldVNode.children.length) {
			return false;
		}
		if (newVNode.attrs.length !== oldVNode.attrs.length) {
			return false;
		}
		if (newVNode.nodeType !== oldVNode.nodeType) {
			return false;
		}
		if ((newVNode.parent && oldVNode.parent) && !VNode._equal(newVNode.parent, oldVNode.parent)) {
			return false
		}

		let oldAttrs = Object.keys(oldVNode.attrs)
		for (var i = 0; i < oldAttrs.length; i++) {
			if (oldVNode.attrs[oldAttrs[i]] !== newVNode.attrs[oldAttrs[i]]) {
				return false
			}
		}

		let newAttrs = Object.keys(newVNode.attrs)
		for (var i = 0; i < newAttrs.length; i++) {
			if (newVNode.attrs[newAttrs[i]] !== oldVNode.attrs[newAttrs[i]]) {
				return false
			}
		}

		let oldData = Object.keys(oldVNode.data)
		for (var i = 0; i < oldData.length; i++) {
			if (oldVNode.data[oldData[i]] !== newVNode.data[oldData[i]]) {
				return false
			}
		}

		let newData = Object.keys(newVNode.data)
		for (var i = 0; i < newData.length; i++) {
			if (newVNode.data[newData[i]] !== oldVNode.data[newData[i]]) {
				return false
			}
		}
		return true
	}

	/**
	 * 根据vnode创建真实节点
	 * @param {Object} instance
	 * @param {Object} reactive
	 */
	static _createElement(instance, reactive) {
		let ele = null
		var text = ''
		//文本节点
		if (instance.nodeType === 3) {
			var forNode = instance.getLoopVnode()
			if(forNode){
				instance.$reg.lastIndex = 0
				if(instance.$reg.test(instance.text)){
					var item = forNode.attrs['for-item'] || 'item'
					var index = forNode.attrs['for-index'] || 'index'
					instance.$reg.lastIndex = 0
					text = instance.text.replace(instance.$reg,(match,key)=>{
						if(key == item){
							return forNode.data[item]
						}else if(key == index){
							return forNode.data[index]
						}else {
							return instance._render(instance.text, reactive)
						}
					})
				}else {
					text = instance._render(instance.text, reactive)
				}
			} else {
				text = instance._render(instance.text, reactive)
			}
			ele = document.createTextNode(text)
		} else {//元素节点
			ele = document.createElement(instance.tag)
			var attrs = Object.keys(instance.attrs)
			for (var i = 0; i < attrs.length; i++) {
				var attr = attrs[i]
				var attrValue = instance._render(instance.attrs[attr], reactive)
				//表示特殊指令
				if (attr.startsWith('lk:')) {
					var name = attr.substr(3);
					if (name === 'for') { //for循环
						if(attrValue !== 'lk:for'){
							let list = reactive[attrValue]
							let item = instance.attrs['for-item'] || 'item'
							let index = instance.attrs['for-index'] || 'index'
							instance.attrs['lk:for'] = 'lk:for'
							instance.data[item] = list[0]
							instance.data[index] = 0
							var arr = Object.keys(list)
							for (var j = arr.length-1; j > 0; j--) {
								var data = {}
								data[item] = list[j]
								data[index] = j
								var copyInstance = instance._clone(j,instance.parent,data)
								copyInstance._insertAfter(instance)
							}
							VNode._createElement(instance.parent,reactive)
						}
					}
				} else if (attr.startsWith('@')) { //事件
					var eventName = attr.substr(1)
					ele.addEventListener(eventName, e => {
						let f = reactive[attrValue];
						f.call(reactive, e)
					})
				} else if (attr == 'for-item' || attr == 'for-index') {
					
				} else {
					ele.setAttribute(attr, attrValue)
				}
			}
		}
		instance.el = ele;
		instance.children.forEach(child => {
			this._createElement(child, reactive)
		})
	}
	
	/**
	 * 获取for循环根元素
	 */
	getLoopVnode(){
		if(!this.parent){
			return
		}
		if(this.parent.attrs['lk:for']){
			return this.parent
		}
		return this.parent.getLoopVnode()
	}

	/**
	 * 复制vnode
	 * @param {Object} index
	 */
	_clone(index,parent,data) {
		var newData = Object.assign({},this.data)
		if(data){
			newData = Object.assign(newData,data)
		}
		var vnode = new VNode(this.id + '_copy_' + index, this.tag, this.el.cloneNode(true),[], this.text, newData, parent,this.root, this.nodeType,this.attrs);
		this.children.forEach((child,index)=>{
			var childNode = child._clone(index,vnode)
			vnode.children.push(childNode)
		})
		return vnode
	}
	
	/**
	 * 将节点插入指定节点后
	 * @param {Object} vnode
	 */
	_insertAfter(vnode){
		var index = vnode._getIndex()
		vnode.parent.children.splice(index+1,0,this)
	}
	
	/**
	 * 获取vnode在parent中的序列位置
	 */
	_getIndex(){
		var length = this.parent.children.length;
		var index = -1;
		for(var i = 0;i<length;i++){
			if(this.parent.children[i].id == this.id){
				index = i;
				break;
			}
		}
		return index
	}

	/**
	 * 解析{{}}内容，进行html字符串渲染
	 */
	_render(template, reactive) {
		this.$reg.lastIndex = 0;
		if (!this.$reg.test(template)) {
			return template;
		}
		this.$reg.lastIndex = 0;
		const result = template.replace(this.$reg, (matched, key) => {
			let data = this._parseKey(reactive, key)
			this.data[key] = data;
			return data;
		})
		return result;
	}

	/**
	 * 解析key
	 */
	_parseKey(reactive, key) {
		let keys = key.split('.')
		let result = ''
		let temp = reactive
		keys.forEach(item => {
			temp = temp[item]
			result = temp
		})
		return result
	}
}

module.exports = VNode
