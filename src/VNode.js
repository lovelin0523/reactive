/**
 * 虚拟dom对象
 */
class VNode {
	constructor(id, tag, attrs, data, text, children, parent, isText, isComment) {
		//唯一键
		this.id = id;
		//标签元素 基本标签 #text #comment
		this.tag = tag;
		//原始的属性-属性值对象
		this.attrs = attrs;
		//关联的响应式数据对象，其内的$attrs属性表示attrs经过渲染后的真实属性-属性值对象
		this.data = data;
		//当前虚拟节点的文本
		this.text = text;
		//当前节点下的子节点数组
		this.children = children;
		//父级节点
		this.parent = parent;
		//是否为文本节点
		this.isText = isText;
		//是否为注释节点
		this.isComment = isComment;
		//存储的节点
		this.el = null;
		//复制的节点对象id
		this.copyId = undefined;
	}

	/**
	 * 判断当前节点与旧节点相比是否有变化
	 * @param {Object} vnode
	 */
	isSame(vnode) {
		if (this.tag !== vnode.tag) {
			return false
		}
		if (this.text !== vnode.text) {
			return false
		}
		if (this.isText !== vnode.isText) {
			return false
		}
		if (this.isComment !== vnode.isComment) {
			return false
		}
		if (!VNode.isEqual(this.attrs, vnode.attrs)) {
			return false;
		}
		if (!VNode.isEqual(this.data, vnode.data)) {
			return false;
		}
		if(this.children.length !== vnode.children.length){
			return false;
		}
		return true
	}

	/**
	 * 根据vnode创建真实节点
	 * @param {Object} reactive
	 */
	createElement(reactive) {
		let ele = null
		//文本节点
		if (this.isText) {
			var text = ''
			//先获取含有lk:for的节点
			var forNode = this.getForLoopVnode()
			if (forNode) {
				VNode.$reg.lastIndex = 0
				if (VNode.$reg.test(this.text)) {
					text = this.render(this.text, forNode.data, undefined, reactive)
				} else {
					text = this.text
				}
			} else {
				text = this.render(this.text, reactive)
			}
			ele = document.createTextNode(text)
		} else if (this.isComment) { //注释
			ele = document.createComment(this.text)
		} else { //元素
			ele = document.createElement(this.tag)
			var attrs = Object.keys(this.attrs)
			for (var i = 0; i < attrs.length; i++) {
				var attr = attrs[i]
				var attrValue = this.attrs[attr];
				//表示特殊指令
				if (attr.startsWith('lk:')) {
					var name = attr.substr(3);
					if (name === 'for') { //for循环
						var forNode = this.getForLoopVnode();
						if(forNode){
							this.render(attrValue,forNode.data,attr,reactive)
						}else {
							this.render(attrValue,reactive,attr)
						}
						//已经执行过for循环了
						if(this.data['$:lk:for-complete']){
							let list = this.data['$attrs'][attr];
							let listKeys = Object.keys(list)
							var length = this.parent.data['lk:for-length']
							//添加数据
							if(listKeys.length != length){
								this.compileForVnodes(reactive)
							}else if(listKeys.length == length){//修改数据
								let item = this.attrs['lk:for-item'] || 'item'
								let index = this.attrs['lk:for-index'] || 'index'
								var value = list[listKeys[this.data[index]]];
								this.data[item] = value;
							}
						}else {//第一次执行for循环
							VNode.$reg.lastIndex = 0;
							if (VNode.$reg.test(attrValue)) {
								//记录
								this.data['$:lk:for-complete'] = true;
								this.compileForVnodes(reactive);
							}
						}
					} else if (name == 'if') { //if语句
						var forNode = this.getForLoopVnode()
						if(forNode){
							this.render(attrValue, forNode.data, attr,reactive)
						}else {
							this.render(attrValue,reactive,attr)
						}
					} else if (name == 'else') { //else语句
						this.attrs[attr] = true;
					} else if (name == 'show'){ //show语句
						var forNode = this.getForLoopVnode()
						if(forNode){
							this.render(attrValue, forNode.data, attr,reactive)
						}else {
							this.render(attrValue,reactive,attr)
						}
						var isShow = this.data['$attrs'][attr];
						if(!isShow){
							ele.style.display = 'none'
						}
					}
				} else if (attr.startsWith('@')) { //事件
					var paramArray = []
					VNode.$reg.lastIndex = 0;
					if(VNode.$reg.test(attrValue)){
						var realValue = RegExp.$1;
						VNode.$methodReg.lastIndex = 0;
						if(VNode.$methodReg.test(realValue)){
							this.render('{{'+RegExp.$1+'}}',reactive,attr)
							var startIndex = realValue.lastIndexOf('(');
							var endIndex = realValue.lastIndexOf(')');
							var paramsStr = realValue.substring(startIndex+1,endIndex);
							paramArray = paramsStr.split(',');
						}else {
							this.render(attrValue,reactive,attr)
						}
					}else {
						throw new Error('events should use {{}} to wrap methods in methods')
					}
					var forNode = this.getForLoopVnode()
					paramArray.forEach((param,index)=>{
						if(param == '$event'){
							this.data['$attrs'][attr+'.params['+index+']'] = '$event'
						}else if(forNode){
							this.render('{{'+param+'}}',forNode.data,attr+'.params['+index+']',reactive);
						}else {
							this.render('{{'+param+'}}',reactive,attr+'.params['+index+']')
						}
					})
					var eventName = attr.substr(1)
					ele.addEventListener(eventName, e => {
						//方法含有括号
						var f = this.data['$attrs'][attr];
						if(typeof f != 'function'){
							throw Error(`The event corresponding to ${attr} is not defined in methods`)
						}
						var params = []
						Object.keys(this.data['$attrs']).forEach(item=>{
							if(item.startsWith(attr+'.params')){
								var value = this.data['$attrs'][item]
								if(value == '$event'){
									params.push(e)
								}else {
									params.push(value)
								}
							}
						})
						if(params.length == 0){
							params.push(e)
						}
						f.apply(reactive,params)
					})
				} else {
					var text = ''
					//先获取含有lk:for的节点
					var forNode = this.getForLoopVnode()
					if (forNode) {
						VNode.$reg.lastIndex = 0
						if (VNode.$reg.test(attrValue)) {
							text = this.render(attrValue, forNode.data, attr, reactive)
						} else {
							text = attrValue
						}
					} else {
						text = this.render(attrValue, reactive, attr)
					}
					var realValue = this.data['$attrs'] ? this.data['$attrs'][attr] : text;
					if (typeof realValue == 'boolean') {
						if (realValue) {
							ele.setAttribute(attr, attr)
						} else {
							ele.removeAttribute(attr)
						}
					} else {
						ele.setAttribute(attr, text)
					}
				}
			}
		}
		this.children.forEach(child => {
			child.createElement(reactive)
		})
		this.el = ele;
	}
	
	/**
	 * 渲染for循环vnode
	 * @param {Object} reactive
	 */
	compileForVnodes(reactive){
		var children = []
		this.parent.children.forEach(child=>{
			if(!child.copyId || child.copyId != this.id){
				children.push(child)
			}
		})
		this.parent.children = children;
		let list = this.data['$attrs']['lk:for']
		let listKeys = Object.keys(list)
		this.parent.data['lk:for-length'] = listKeys.length;
		if(listKeys.length > 0){
			let item = this.attrs['lk:for-item'] || 'item'
			let index = this.attrs['lk:for-index'] || 'index'
			this.data[item] = list[listKeys[0]]
			this.data[index] = 0
			for (var j = listKeys.length - 1; j > 0; j--) {
				var copyInstance = this.clone(j, this.parent)
				copyInstance.data[item] = list[listKeys[j]]
				copyInstance.data[index] = j
				this.insertAfter(copyInstance)
			}
			this.parent.createElement(reactive)
		}else {
			var index = -1;
			var length = this.parent.children.length;
			for(var i = 0;i<length;i++){
				if(this.parent.children[i].id == this.id){
					index = i;
					break;
				}
			}
			this.parent.children.splice(index,1)
		}
	}
	
	/**
	 * 完全克隆
	 * 不包括元素el
	 */
	fullClone(parent){
		let id = this.id;
		let tag = this.tag;
		let attrs = Object.assign({}, this.attrs);
		let data = Object.assign({}, this.data)
		let text = this.text;
		let isText = this.isText;
		let isComment = this.isComment;
		let copyId = this.copyId;
		let children = [];
		var vnode = new VNode(id, tag, attrs, data, text, children, parent, isText, isComment)
		this.children.forEach(child=>{
			var childVnode = child.fullClone(vnode);
			vnode.children.push(childVnode)
		})
		return vnode;
	}
	
	
	/**
	 * 获取当前虚拟dom复制出来的最后一个节点
	 */
	getLastForVnode(){
		var vnode = null;
		this.parent.children.forEach(child=>{
			if(child.copyId && child.copyId == this.id){
				vnode = child
			}
		})
		return vnode
	}

	/**
	 * 将指定虚拟dom插入当前虚拟dom后
	 * @param {Object} vnode
	 */
	insertAfter(vnode) {
		let index = this.getSequenceInParent()
		if (index > -1) {
			this.parent.children.splice(index + 1, 0, vnode)
			return true
		} else {
			return false
		}
	}

	/**
	 * 同级复制vnode，id会变
	 * @param {Object} index 序列值
	 * @param {Object} parent 父元素
	 * @param {Object} data 数据
	 */
	clone(index, parent, flag) {
		//id, tag, attrs, data, text, children, parent, isText, isComment
		let id = flag ? 'vn_' + (parent.id.substring(3)) + '_' + index : this.id + '_copy_' + index;
		let tag = this.tag;
		let attrs = Object.assign({}, this.attrs);
		let data = {}
		if(this.data['$attrs']){
			let attrs = Object.assign({},this.data['$attrs'])
			data = Object.assign({},this.data);
			data['$attrs'] = attrs;
		}else {
			data = Object.assign({},this.data);
		}
		let text = this.text;
		let isText = this.isText;
		let isComment = this.isComment;
		let children = [];
		var vnode = new VNode(id, tag, attrs, data, text, children, parent, isText, isComment);
		vnode.copyId = this.id;
		this.children.forEach((child, i) => {
			var childNode = child.clone(i, vnode, true)
			vnode.children.push(childNode)
		})
		return vnode
	}

	/**
	 * 根据该虚拟节点获取for循环根元素，即含有lk:for属性的虚拟节点
	 * 含有lk:for属性的节点为该节点或父节点或祖先节点
	 */
	getForLoopVnode() {
		if (this.attrs['lk:for']) {
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
	 * 获取当前虚拟节点在parent中的序列位置
	 */
	getSequenceInParent() {
		//如果父节点不存在，返回-1
		if (!this.parent) {
			return -1
		}
		let length = this.parent.children.length;
		let index = -1;
		for (let i = 0; i < length; i++) {
			if (this.parent.children[i].id == this.id) {
				index = i;
				break;
			}
		}
		return index
	}

	/**
	 * 解析{{}}格式的内容
	 * @param {Object} template 字符串，形如{{user.name}}等
	 * @param {Object} obj 属性所在对象
	 * @param {Object} attr 绑定到data[$attrs]的属性名称
	 * @param {Object} reactive
	 */
	render(template, obj, attr, reactive) {
		VNode.$reg.lastIndex = 0;
		if (!VNode.$reg.test(template)) {
			return template;
		}
		VNode.$reg.lastIndex = 0;
		const result = template.replace(VNode.$reg, (matched, key) => {
			let data = VNode.parseExpression.call(obj, key)
			if (data == undefined && reactive && !VNode.isEqual(reactive, obj)) {
				data = VNode.parseExpression.call(reactive, key)
			}
			this.data[key] = data;
			if (attr) {
				if (!this.data['$attrs']) {
					this.data['$attrs'] = {}
				}
				this.data['$attrs'][attr] = data;
			}
			return VNode.dataToString(data);
		})
		return result;
	}

	/**
	 * 根据含有lk:else属性的元素获取含有lk:if属性的元素
	 */
	getIfVnode() {
		var index = this.getSequenceInParent()
		if (index == 0) {
			return null
		}
		index = index - 1;
		var vnode = this.parent.children[index]
		if (vnode.attrs['lk:if']) {
			return vnode
		}
		return vnode.getIfVnode()
	}


	/**
	 * 解析表达式
	 * @param {Object} expression 表达式
	 */
	static parseExpression(expression) {
		return eval(expression)
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
	 * 判断两个值是否完全相等，可判断对象
	 * @param {Object} a
	 * @param {Object} b
	 */
	static isEqual(a, b) {
		if (!a || !b) {
			return false;
		}
		if (typeof(a) !== typeof(b)) {
			return false;
		}
		if (typeof a == 'object' && typeof b == 'object') {
			let aProps = Object.getOwnPropertyNames(a);
			let bProps = Object.getOwnPropertyNames(b);
			if (aProps.length != bProps.length) {
				return false;
			}
			let length = aProps.length;
			for (let i = 0; i < length; i++) {
				let propName = aProps[i];
				let propA = a[propName];
				let propB = b[propName];
				if (typeof propA == 'object') {
					if (this.isEqual(propA, propB)) {
						return true;
					} else {
						return false;
					}
				} else if (propA !== propB) {
					return false;
				}
			}
			return true;
		} else {
			return a === b;
		}
	}

	/**
	 * 实现任何值转字符串
	 * @param {Object} data
	 */
	static dataToString(data) {
		let dataStr = ''
		try {
			if (typeof data == 'object') {
				dataStr = JSON.stringify(data)
			} else {
				dataStr = data.toString()
			}
		} catch (e) {
			dataStr = data
		}
		return dataStr
	}
}

VNode.$reg = /\{\{(.*?)\}\}/g

VNode.$methodReg = /(.+)\(.*\)/g

module.exports = VNode
