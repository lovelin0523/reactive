const VNode = require('./VNode.js')

/**
 * 响应式MVVM对象
 */
class Reactive {
	constructor() {
		this.$el = null;
		this.$vnode = null;
		this._vnode = null;
		this.$watch = null;
		this.$beforeMount = null;
		this.$mounted = null;
		this.$beforeCreate = null;
		this.$created = null;
		this.$updated = null;
		this.$beforeUpdate = null;
	}

	/**
	 * 实例方法：挂载到指定节点
	 * @param {Object} selector
	 */
	mount(selector) {
		if (typeof this.$beforeMount == 'function') {
			this.$beforeMount.call(this)
		}
		//获取挂载元素
		let el = document.querySelector(selector)
		if (!el) {
			throw new Error(
				'The argument to the mount method must be dom selectors and the DOM that is pointed to cannot be empty')
		}
		//创建虚拟节点
		this.$vnode = this._createVNode(el)
		this._vnode = this._createVNode(el)
		//创建真实dom
		this._updateVnodes(this.$vnode)
		this._updateVnodes(this._vnode)
		el.parentNode.insertBefore(this._vnode.el, el);
		el.remove();
		if (typeof this.$mounted == 'function') {
			this.$mounted.call(this)
		}
		return this;
	}

	/**
	 * 比对新旧节点数据
	 */
	_compare() {
		if (!this.$vnode.isSame(this._vnode)) {
			let el = this._vnode.el;
			this._updateVnodes(this._vnode);
			el.parentNode.insertBefore(this._vnode.el, el)
			el.remove()
			this.$el = this._vnode.el;
		} else {
			this._compareChildren(this.$vnode, this._vnode)
		}
	}

	/**
	 * 比对子孙节点新旧数据
	 */
	_compareChildren(vnode, oldVnode) {
		let length = oldVnode.children.length;
		var length2 = vnode.children.length;
		for (var i = 0; i < length; i++) {
			for (var j = 0; j < length2; j++) {
				var oVn = oldVnode.children[i] //当前旧节点
				var nVn = vnode.children[j]; //当前节点
				if (!nVn.isSame(oVn) && nVn.id === oVn.id) {
					if (oVn.attrs['lk:if']) {
						if (oVn.data['$attrs']['lk:if']) { //旧节点原先已渲染
							if (nVn.attrs['lk:if']) { //新结点
								if (!nVn.data['$attrs']['lk:if']) { //新结点未渲染
									let el = oVn.parent.el;
									this._updateVnodes(oVn.parent);
									el.parentNode.insertBefore(oVn.parent.el, el)
									el.remove()
									return;
								}
							}
						} else { //旧节点原先未渲染
							if (nVn.attrs['lk:if']) { //新结点
								if (nVn.data['$attrs']['lk:if']) { //新结点已渲染
									let el = oVn.parent.el;
									this._updateVnodes(oVn.parent);
									el.parentNode.insertBefore(oVn.parent.el, el)
									el.remove()
									return;
								}
							}
						}
					}
					var forNode = oVn.getForLoopVnode()
					if(forNode){
						let item = forNode.attrs['lk:for-item'] || 'item'
						let index = forNode.attrs['lk:for-index'] || 'index'
						//数据长度大于当前数据的序列，说明该虚拟dom应当被渲染
						if(forNode.data['lk:for'].length > forNode.data[index]){
							let el = forNode.parent.el;
							this._updateVnodes(forNode.parent)
							el.parentNode.insertBefore(forNode.parent.el,el)
							el.remove()
						}else {
							let el = forNode.el;
							this._updateVnodes(forNode.parent)
							el.remove()
						}
						return;
					}
					let el = oVn.el;
					this._updateVnodes(oVn)
					el.parentNode.insertBefore(oVn.el, el)
					el.remove()
				} else {
					this._compareChildren(nVn, oVn)
				}
			}
		}
	}

	/**
	 * 更新虚拟节点数据
	 */
	_updateVnodes(vnode) {
		//根据虚拟dom递归创建真实节点以及其子节点（更新虚拟dom的el）
		vnode.createElement(this)
		//将虚拟dom的el填充到父元素的el中
		let f = (item) => {
			item.children.forEach(child => {
				if (child.attrs['lk:if']) {
					let needCreate = child.data['$attrs']['lk:if'];
					if (needCreate) {
						item.el.appendChild(child.el)
					} else {
						child.el.remove()
					}
				} else {
					item.el.appendChild(child.el)
				}
				if (child.attrs['lk:else']) {
					var brotherVnode = child.getIfVnode()
					if (brotherVnode) {
						let brotherNeedCreate = brotherVnode.data['$attrs']['lk:if'];
						if (brotherNeedCreate) {
							child.el.remove()
						} else {
							item.el.appendChild(child.el)
						}
					} else {
						throw new Error('lk:else must be combined with lk:if')
					}
				}
				if(child.attrs['lk:for']){
					var attrValue = child.attrs['lk:for'];
					VNode.$reg.lastIndex = 0;
					if(VNode.$reg.test(attrValue)){
						let list = VNode.parseExpression.call(this, RegExp.$1)
						let listKeys = Object.keys(list)
						if(listKeys.length == 0){
							child.el.remove();
						}
					}
				}
				f(child)
			})
		}
		f(vnode)
	}

	/**
	 * 创建虚拟dom
	 */
	_createVNode(el, index, parent) {
		index = index ? `${index}` : 0
		let id = parent ? 'vn_' + (parent.id.substring(3)) + '_' + index : 'vn_' + index;
		let tag = el.nodeName;
		let attrs = {};
		let data = {};
		let text = VNode.getNodeText(el)
		let children = [];
		let isText = (el.nodeType == 3);
		let isComment = (el.nodeType == 8);
		if (el.attributes) {
			let length = el.attributes.length;
			for (var i = 0; i < length; i++) {
				let it = el.attributes[i];
				//属性名
				let localName = it.localName;
				//属性值
				let value = it.value;
				attrs[localName] = value;
			}
		}

		let vnode = new VNode(id, tag, attrs, data, text, children, parent, isText, isComment);
		//获取子节点
		let childs = el.childNodes;
		let childLength = childs.length;
		// 深度优先算法
		for (let i = 0; i < childLength; i++) {
			let childNode = this._createVNode(childs[i], i, vnode);
			vnode.children.push(childNode);
		}
		return vnode;
	}

	/**
	 * 监听数据变更进行处理
	 * @param {Object} keys
	 * @param {Object} key
	 * @param {Object} value
	 */
	_observer(keys, key, value) {
		if (this.$vnode) {
			this._updateVnodes(this.$vnode)
			this._compare();
		}
	}

	/**
	 * 创建一个Reactive的Proxy对象
	 * @param {Object} options
	 */
	static createApp(options) {
		//初始化创建一个实例
		let instance = new Reactive()
		//校验参数
		let opt = Reactive._validator(options)
		//配置钩子函数
		instance.$beforeCreate = opt.beforeCreate;
		instance.$created = opt.created;
		instance.$beforeUpdate = opt.beforeUpdate;
		instance.$updated = opt.updated;
		instance.$beforeMount = opt.beforeMount
		instance.$mounted = opt.mounted;
		//执行钩子函数beforeCreate
		instance.$beforeCreate.call(instance)
		//配置watch监听参数
		instance.$watch = opt.watch;
		//将data直接挂载在实例上
		Object.keys(opt.data).forEach(key => {
			if (instance[key]) {
				throw new Error(`${key} is already defined in the instance`)
			}
			instance[key] = opt.data[key]
		})
		//将methods直接挂载在实例上
		Object.keys(opt.methods).forEach(key => {
			if (instance[key]) {
				throw new Error(`${key} is already defined in the instance`)
			}
			instance[key] = opt.methods[key]
		})
		//进行proxy代理
		instance = Reactive._proxy(instance)
		//执行钩子函数created
		instance.$created.call(instance)
		//返回实例
		return instance
	}

	/**
	 * 判断reactive中的指定属性是否不需要监听
	 * @param {Object} prop
	 * 不需要监听返回true，需要监听返回false
	 */
	static _UnObserverProperties(prop) {
		return ['$el', '$vnode', '_vnode', '$watch', 'mount', '_observer', '$beforeCreate', '$created', '$beforeMount',
			'$mounted',
			'$beforeUpdate', '$updated'
		].includes(prop)
	}

	/**
	 * 检验options参数
	 * @param {Object} options
	 */
	static _validator(options) {
		let opt = {
			data: {},
			watch: {},
			methods: {},
			beforeCreate: function() {},
			created: function() {},
			beforeMount: function() {},
			mounted: function() {},
			beforeUpdate: function() {},
			updated: function() {}
		}
		if (typeof options == 'object' && options) {
			if (typeof options.data == 'object' && options.data) {
				opt.data = options.data;
			}
			if (typeof options.watch == 'object' && options.watch) {
				Object.keys(options.watch).forEach(watchName => {
					if ((typeof options.watch[watchName] != 'function') || !options.watch[watchName]) {
						throw new Error(`The definition of "${watchName}" in watch should be a function`)
					}
				})
				opt.watch = options.watch;
			}
			if (typeof options.methods == 'object' && options.methods) {
				Object.keys(options.methods).forEach(methodName => {
					if ((typeof options.methods[methodName] != 'function') || !options.methods[methodName]) {
						throw new Error(`The definition of "${methodName}" in methods should be a function`)
					}
				})
				opt.methods = options.methods;
			}
			if (typeof options.beforeMount == 'function' && options.beforeMount) {
				opt.beforeMount = options.beforeMount;
			}
			if (typeof options.mounted == 'function' && options.mounted) {
				opt.mounted = options.mounted;
			}
			if (typeof options.beforeCreate == 'function' && options.beforeCreate) {
				opt.beforeCreate = options.beforeCreate;
			}
			if (typeof options.created == 'function' && options.created) {
				opt.created = options.created;
			}
			if (typeof options.beforeUpdate == 'function' && options.beforeUpdate) {
				opt.beforeUpdate = options.beforeUpdate;
			}
			if (typeof options.updated == 'function' && options.updated) {
				opt.updated = options.updated;
			}
		} else {
			throw new Error("The argument to the 'createApp' method must be an object")
		}
		return opt
	}

	/**
	 * proxy代理实例
	 * @param {Object} instance
	 */
	static _proxy(instance) {
		let watcher = (parentKey) => {
			return {
				get: (target, key) => {
					try {
						var watchKey = parentKey ? parentKey + '.' + key : key;
						if (Reactive._UnObserverProperties(key)) {
							return Reflect.get(target, key)
						}
						return new Proxy(target[key], watcher(watchKey))
					} catch (e) {
						return Reflect.get(target, key)
					}
				},
				set: (target, key, value) => {
					if (Reactive._UnObserverProperties(key)) {
						Reflect.set(target, key, value);
						return true;
					}
					var watchKey = parentKey ? parentKey + '.' + key : key;
					let oldValue = Reflect.get(target, key);
					let oldTarget = undefined;
					//当是数组或者对象变动时获取旧的对象或数组
					if (Array.isArray(target)) {
						oldTarget = [...target];
					} else if (typeof(target) == 'object' && target) {
						oldTarget = Object.assign({}, target);
					}
					if (oldValue === value) {
						return true;
					}
					//更新之前回调钩子函数
					if (typeof instance.$beforeUpdate == 'function') {
						instance.$beforeUpdate.call(instance, key, oldValue, value, (target instanceof Reactive) ? undefined : target)
					}
					//更新数据
					Reflect.set(target, key, value);
					//watch键名解析
					var keys = Reactive._parseWatchKey(watchKey);
					//监听
					instance._observer(keys, key, value)
					//回调
					keys.forEach((item, index) => {
						if (typeof(instance.$watch) == 'object' && instance.$watch[item] && typeof(instance.$watch[item]) ==
							'function') {
							if (index === keys.length - 1) { //对象属性监听
								instance.$watch[item].call(instance, value, oldValue);
							} else if (index === keys.length - 2) { //对象监听
								instance.$watch[item].call(instance, target, oldTarget);
							} else { //对象祖先父级监听
								instance.$watch[item].call(instance);
							}
						}
					})
					//更新完毕回调调用钩子函数
					if (typeof instance.$updated == 'function') {
						instance.$updated.call(instance, key, oldValue, value, (target instanceof Reactive) ? undefined : target)
					}
					return true;
				}
			}
		}

		return new Proxy(instance, watcher());
	}

	/**
	 * 解析$watch字段数据
	 * @param {Object} watchKey
	 */
	static _parseWatchKey(watchKey) {
		var arr = watchKey.split('.');
		var result = [];
		var keyFirst = '';
		for (var i = 0; i < arr.length; i++) {
			var key = '';
			if (keyFirst) {
				key = keyFirst + '.' + arr[i];
			} else {
				key = keyFirst + arr[i];
			}
			keyFirst = key;
			result.push(key);
		}
		return result;
	}
}

module.exports = Reactive
