/**
 * 虚拟dom对象
 */
class VNode {
	constructor(id,tag, el, children, text, data, parent, nodeType, attrs) {
		this.id = id;//节点唯一键
		this.tag = tag; //标签类型，DIV，SPAN，INPUT，#text
		this.el = el; //对应的真实节点
		this.children = children; //当前节点下的子节点
		this.text = text; //当前虚拟节点的文本
		this.data = data;//reactive关联的数据
		this.parent = parent; //父级节点
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
	static _equal(newVNode,oldVNode){
		if(newVNode.tag !== oldVNode.tag){
			return false
		}
		if(oldVNode.text || newVNode.text){
			if(newVNode.text !== oldVNode.text){
				return false
			}
		}
		if(newVNode.children.length !== oldVNode.children.length){
			return false;
		}
		if(newVNode.attrs.length !== oldVNode.attrs.length){
			return false;
		}
		if(newVNode.nodeType !== oldVNode.nodeType){
			return false;
		}
		if((newVNode.parent && oldVNode.parent) && !VNode._equal(newVNode.parent,oldVNode.parent)){
			return false
		}
		
		let oldAttrs = Object.keys(oldVNode.attrs)
		for(var i = 0;i<oldAttrs.length;i++){
			if(oldVNode.attrs[oldAttrs[i]] !== newVNode.attrs[oldAttrs[i]]){
				return false
			}
		}
		
		let newAttrs = Object.keys(newVNode.attrs)
		for(var i = 0;i<newAttrs.length;i++){
			if(newVNode.attrs[newAttrs[i]] !== oldVNode.attrs[newAttrs[i]]){
				return false
			}
		}
		
		let oldData = Object.keys(oldVNode.data)
		for(var i = 0;i<oldData.length;i++){
			if(oldVNode.data[oldData[i]] !== newVNode.data[oldData[i]]){
				return false
			}
		}
		
		let newData = Object.keys(newVNode.data)
		for(var i = 0;i<newData.length;i++){
			if(newVNode.data[newData[i]] !== oldVNode.data[newData[i]]){
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
	static _createElement(instance,reactive) {
		let ele = null
		if (instance.nodeType === 3) {
			var text = instance._render(instance.text, reactive)
			ele = document.createTextNode(text)
		} else {
			ele = document.createElement(instance.tag)
			Object.keys(instance.attrs).forEach(attr => {
				var attrValue = instance._render(instance.attrs[attr],reactive)
				ele.setAttribute(attr,attrValue)
			})
		}
		instance.el = ele;
		instance.children.forEach(child => {
			this._createElement(child,reactive)
		})
	}

	/**
	 * 解析{{}}内容，进行html字符串渲染
	 */
	_render(template, reactive) {
		if (!this.$reg.test(template)) {
			return template;
		}
		const result = template.replace(this.$reg, (matched, key) => {
			let data = this._parseKey(reactive,key)
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
		keys.forEach(item=>{
			temp = temp[item]
			result = temp
		})
		return result
	}
}

module.exports = VNode