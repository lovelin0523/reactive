/**
 * 虚拟dom对象
 */
class VNode {
	constructor(id, tag, el, children, text, data, parent, nodeType, attrs) {
		this.id = id; //节点唯一键
		this.tag = tag; //标签类型，DIV，SPAN，INPUT，#text
		this.el = el; //对应的真实节点
		this.children = children; //当前节点下的子节点
		this.text = text; //当前虚拟节点的文本
		this.data = data; //reactive关联的数据
		this.parent = parent; //父级节点
		this.nodeType = nodeType; //节点类型
		this.attrs = attrs; //存放属性对象数组
		this.$reg = /\{\{(.*?)\}\}/g; //匹配规则
		this.compileAttrs = [];//编译转换后的属性对应值
	}

	/**
	 * 标签类型为文本节点和注释节点时获取内容
	 * @param {Object} el
	 */
	static getNodeText(el) {
		if (el.nodeType === 3 || el.nodeType == 8) {
			return el.nodeValue;
		} else {
			return '';
		}
	}

	/**
	 * 用于_vnode与$vnode比较或者其子孙元素比较，判断某id的虚拟节点是否发生了变化
	 * @param {Object} vnode
	 */
	equal(vnode) {
		if(!(vnode instanceof VNode)){
			return false
		}
		if (this.tag !== vnode.tag) {
			return false
		}
		if (this.text !== vnode.text) {
			return false
		}
		if (this.attrs.length !== vnode.attrs.length) {
			return false;
		}
		if(this.compileAttrs.length !== vnode.compileAttrs.length){
			return false;
		}
		if (this.nodeType !== vnode.nodeType) {
			return false;
		}
		let oldAttrs = Object.keys(vnode.attrs)
		for (var i = 0; i < oldAttrs.length; i++) {
			if (vnode.attrs[oldAttrs[i]] !== this.attrs[oldAttrs[i]]) {
				return false
			}
		}
		let newAttrs = Object.keys(this.attrs)
		for (var i = 0; i < newAttrs.length; i++) {
			if (this.attrs[newAttrs[i]] !== vnode.attrs[newAttrs[i]]) {
				return false
			}
		}
		let oldData = Object.keys(vnode.data)
		for (var i = 0; i < oldData.length; i++) {
			if (vnode.data[oldData[i]] !== this.data[oldData[i]]) {
				return false
			}
		}
		let newData = Object.keys(this.data)
		for (var i = 0; i < newData.length; i++) {
			if (this.data[newData[i]] !== vnode.data[newData[i]]) {
				return false
			}
		}
		
		if (this.children.length !== vnode.children.length) {
			return false;
		}
		
		let oldCompileAttrs = Object.keys(vnode.compileAttrs)
		for (var i = 0; i < oldCompileAttrs.length; i++) {
			if (vnode.compileAttrs[oldCompileAttrs[i]] !== this.compileAttrs[oldCompileAttrs[i]]) {
				return false
			}
		}
		let newCompileAttrs = Object.keys(this.compileAttrs)
		for (var i = 0; i < newCompileAttrs.length; i++) {
			if (this.compileAttrs[newCompileAttrs[i]] !== vnode.compileAttrs[newCompileAttrs[i]]) {
				return false
			}
		}
		
		return true
	}

	/**
	 * 根据vnode创建真实节点
	 * @param {Object} reactive reactive实例
	 */
	createElement(reactive) {
		let ele = null
		//文本节点
		if (this.nodeType === 3) {
			var text = ''
			var forNode = this.getForLoopVnode()
			if (forNode) {
				this.$reg.lastIndex = 0
				if (this.$reg.test(this.text)) {
					var item = forNode.attrs['lk:for-item'] || 'item'
					var index = forNode.attrs['lk:for-index'] || 'index'
					this.$reg.lastIndex = 0
					text = this.text.replace(this.$reg, (match, key) => {
						let keys = key.split('.')
						if (keys[0] == item) {
							return this.toString(this.parseKey(forNode.data,key))
						} else if (keys[0] == index) {
							return this.toString(forNode.data[index])
						} else {
							return this.render(match, reactive)
						}
					})
				} else {
					text = this.render(this.text, reactive)
				}
			} else {
				text = this.render(this.text, reactive)
			}
			ele = document.createTextNode(text)
		} else if(this.nodeType === 1){ //元素节点
			ele = document.createElement(this.tag)
			var attrs = Object.keys(this.attrs)
			for (var i = 0; i < attrs.length; i++) {
				var attr = attrs[i]
				var orgAttrValue = this.attrs[attr];
				//表示特殊指令
				if (attr.startsWith('lk:')) {
					var name = attr.substr(3);
					if (name === 'for') { //for循环
						if (orgAttrValue !== 'lk:for') {
							this.render(orgAttrValue, reactive,attr)
							let list = this.compileAttrs[attr]
							let listKeys = Object.keys(list)
							let item = this.attrs['lk:for-item'] || 'item'
							let index = this.attrs['lk:for-index'] || 'index'
							this.attrs['lk:for'] = 'lk:for'
							this.data[item] = list[listKeys[0]]
							this.data[index] = 0
							this.compileAttrs['lk:for-item'] = list[listKeys[0]]
							this.compileAttrs['lk:for-index'] = 0
							var arr = Object.keys(list)
							for (var j = arr.length - 1; j > 0; j--) {
								var data = {}
								data[item] = list[listKeys[j]]
								data[index] = j
								var copyInstance = this.clone(j, this.parent, data)
								copyInstance.compileAttrs['lk:for-item'] = list[listKeys[j]]
								copyInstance.compileAttrs['lk:for-index'] = j
								this.insertAfter(copyInstance)
							}
							this.parent.createElement(reactive)
						}
					}else if(name == 'if'){//if语句
						this.render(orgAttrValue,reactive,attr)
					}else if(name == 'else'){
						this.attrs[attr] = true;
					}
				} else if (attr.startsWith('@')) { //事件
					var attrValue = this.render(orgAttrValue, reactive)
					var eventName = attr.substr(1)
					ele.addEventListener(eventName, e => {
						//方法含有括号
						var params = []
						attrValue = attrValue.replace(/\((.*?)\)/g,(match,key)=>{
							if(key){
								var keys = key.split(',')
								keys.forEach((item,index)=>{
									if(item == '$event'){
										params.push(e)
									}else {
										var forNode = this.getForLoopVnode()
										var data = undefined
										if(forNode){
											data = this.parseKey(forNode.data,item) || this.parseKey(reactive,item)
										}else {
											data = this.parseKey(reactive,item)
										}
										params.push(data)
									}
								})
							}else{
								params.push(e)
							}
							return ''
						})
						let f = reactive[attrValue];
						if(f){
							f.apply(reactive, params)
							//解决事件中无法监听数据bug
							reactive._compare()
						}else {
							throw Error(`The "${attrValue}" method is not defined in methods`)
						}
					})
				}else {
					var text = ''
					var forNode = this.getForLoopVnode()
					if (forNode) {
						this.$reg.lastIndex = 0
						if (this.$reg.test(orgAttrValue)) {
							var item = forNode.attrs['lk:for-item'] || 'item'
							var index = forNode.attrs['lk:for-index'] || 'index'
							this.$reg.lastIndex = 0
							text = orgAttrValue.replace(this.$reg, (match, key) => {
								let keys = key.split('.')
								if (keys[0] == item) {
									this.compileAttrs[attr,this.parseKey(forNode.data,key)]
									return this.toString(this.parseKey(forNode.data,key))
								} else if (keys[0] == index) {
									this.compileAttrs[forNode.data[index]]
									return this.toString(forNode.data[index])
								} else {
									return this.render(match, reactive,attr)
								}
							})
						} else {
							text = this.render(orgAttrValue, reactive,attr)
						}
					} else {
						text = this.render(orgAttrValue, reactive,attr)
					}
					//非字符串形式的属性值
					let cAttrValue = this.compileAttrs[attr]
					if(typeof cAttrValue == 'boolean'){
						if(cAttrValue){
							ele.setAttribute(attr,attr)
						}else {
							ele.removeAttribute(attr)
						}
					}else {
						ele.setAttribute(attr, text)
					}
				}
			}
		}else if(this.nodeType === 8){//注释节点
			ele = document.createComment(this.text)
		}
		this.el = ele;
		this.children.forEach(child => {
			child.createElement(reactive)
		})
	}

	/**
	 * 根据该虚拟节点获取for循环根元素
	 */
	getForLoopVnode() {
		if(this.attrs['lk:for']){
			return this
		}
		if (!this.parent) {
			return null
		}
		if (this.parent.attrs['lk:for']) {
			return this.parent
		}
		return this.parent.getForLoopVnode()
	}

	/**
	 * 同级复制vnode，id会变
	 * @param {Object} index 序列值
	 * @param {Object} parent 父元素
	 * @param {Object} data 数据
	 */
	clone(index, parent, data) {
		var newData = Object.assign({}, this.data)
		if (data) {
			newData = Object.assign(newData, data)
		}
		let id = this.id + '_copy_' + index;
		let tag = this.tag;
		let el = this.el.cloneNode(true);
		let children = [];
		let text = this.text;
		let nodeType = this.nodeType;
		let attrs = Object.assign({},this.attrs);
		var vnode = new VNode(id, tag, el, children, text, newData, parent, nodeType, attrs);
		vnode.compileAttrs = Object.assign({},this.compileAttrs)
		this.children.forEach((child, index) => {
			var childNode = child.clone(index, vnode)
			vnode.children.push(childNode)
		})
		return vnode
	}

	/**
	 * 完全复制
	 */
	fullClone(parent) {
		let id = this.id;
		let tag = this.tag;
		let el = this.el.cloneNode();
		let children = [];
		let text = this.text;
		let data = Object.assign({},this.data);
		let nodeType = this.nodeType;
		let attrs = Object.assign({},this.attrs);
		var vnode = new VNode(id, tag, el, children, text, data, parent, nodeType, attrs);
		vnode.compileAttrs = Object.assign({},this.compileAttrs)
		this.children.forEach((child, index) => {
			var childNode = child.fullClone(vnode)
			vnode.children.push(childNode)
		})
		return vnode
	}

	/**
	 * 将指定节点插入当前节点后
	 * @param {Object} vnode
	 */
	insertAfter(vnode) {
		var index = this.getIndex()
		this.parent.children.splice(index + 1, 0,vnode)
	}

	/**
	 * 获取vnode在parent中的序列位置
	 */
	getIndex() {
		var length = this.parent.children.length;
		var index = -1;
		for (var i = 0; i < length; i++) {
			if (this.parent.children[i].id == this.id) {
				index = i;
				break;
			}
		}
		return index
	}

	/**
	 * 解析{{}}内容，进行html字符串渲染
	 * @param {Object} template
	 * @param {Object} reactive
	 * @param {Object} attr 是否是为属性值解析，此值为属性
	 */
	render(template, reactive,attr) {
		this.$reg.lastIndex = 0;
		if (!this.$reg.test(template)) {
			return template;
		}
		this.$reg.lastIndex = 0;
		const result = template.replace(this.$reg, (matched, key) => {
			let data = this.parseKey(reactive, key)
			this.data[key] = data;
			if(attr){
				this.compileAttrs[attr] = data;
			}
			return this.toString(data);
		})
		return result;
	}

	/**
	 * 解析key
	 */
	parseKey(obj, key) {
		let keys = key.split('.')
		let result = ''
		let temp = obj
		keys.forEach(item => {
			temp = temp[item]
			result = temp
		})
		return result
	}
	
	/**
	 * 转字符串
	 * @param {Object} data
	 */
	toString(data) {
		let dataStr = ''
		if(typeof data == 'object'){
			dataStr = JSON.stringify(data)
		}else {
			dataStr = data.toString()
		}
		return dataStr
	}
	
	/**
	 * 含有lk:else的元素获取lk:if的元素
	 */
	getIfVnode(){
		var index = this.getIndex()
		if(index == 0){
			return null
		}
		index = index - 1;
		var vnode = this.parent.children[index]
		if(vnode.attrs['lk:if']){
			return vnode
		}
		return vnode.getIfVnode()
	}
}

module.exports = VNode
