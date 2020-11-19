const VNode = require("./VNode")

/**
 * 响应式MVVM对象
 */
class Reactive {
	constructor() {
		this.$el = null;
		this.$vnode = null;
		this._vnode = null;
		this.$data = null;
		this.$methods = null;
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
		if(typeof this.$beforeMount == 'function'){
			this.$beforeMount.call(this)
		}
		//获取挂载元素
		let el = document.querySelector(selector)
		if (!el) {
			el = document.body;
		}
		//创建虚拟dom并渲染真实数据
		this.$vnode = this._updateVnodes(this._createVNode(el))
		this._vnode = this.$vnode.fullClone()
		this._vnode = this._updateVnodes(this._vnode)
		//虚拟dom的el插入页面
		el.parentNode.insertBefore(this._vnode.el,el)
		//移除原来的
		el.parentNode.removeChild(el)
		//更新$el
		this.$el = this._vnode.el;
		if(typeof this.$mounted == 'function'){
			this.$mounted.call(this)
		}
		return this;
	}
	
	/**
	 * 监听到数据更新对dom操作
	 */
	_compare(){
		//更新$vnode
		this.$vnode = this._updateVnodes(this.$vnode)
		//如果$vnode和_vnode不一样进行处理
		if(!this.$vnode.equal(this._vnode)){
			this._vnode = this.$vnode.fullClone()
			this._vnode = this._updateVnodes(this._vnode)
			this.$el.parentNode.insertBefore(this._vnode.el,this.$el)
			this.$el.parentNode.removeChild(this.$el)
			this.$el = this._vnode.el;
		}else {
			//比较子孙节点
			this._compareChildren(this._vnode,this.$vnode)
		}
	}
	
	/**
	 * 比对同一级子元素vnode
	 * @param {Object} oldVnode
	 * @param {Object} vnode
	 */
	_compareChildren(oldVnode,vnode){
		for(var i = 0;i<oldVnode.children.length;i++){
			for(var j = 0;j<vnode.children.length;j++){
				var oVn = oldVnode.children[i]//当前旧节点
				var nVn = vnode.children[j];//当前节点
				if(!nVn.equal(oVn) && nVn.id === oVn.id){
					let el =  nVn.el.cloneNode(true)
					oldVnode.el.insertBefore(el,oVn.el)
					oVn.el.remove()
					oVn.el = el
				}else {
					this._compareChildren(oVn,nVn)
				}
			}
		}
	}
	
	/**
	 * 更新指定虚拟dom树及其子元素
	 * @param {Object} vnode
	 */
	_updateVnodes(vnode){
		//根据虚拟dom递归创建真实节点以及其子节点（更新虚拟dom的el）
		vnode.createElement(this)
		//将虚拟dom的el填充到父元素的el中
		let f = (item)=>{
			item.children.forEach(child=>{
				if(child.attrs['lk:if']){
					let needCreate = child.compileAttrs['lk:if'];
					if(needCreate){
						item.el.appendChild(child.el)
					}else {
						child.el.remove()
					}
				}else {
					item.el.appendChild(child.el)
				}
				if(child.attrs['lk:else']){
					var brotherVnode = child.getIfVnode()
					if(brotherVnode){
						let brotherNeedCreate = brotherVnode.compileAttrs['lk:if'];
						if(brotherNeedCreate){
							child.el.remove()
						}else {
							item.el.appendChild(child.el)
						}
					}else {
						throw new Error('lk:else must be combined with lk:if')
					}
				}
				f(child)
			})
		}
		f(vnode)
		return vnode
	}

	/**
	 * 创建虚拟dom
	 * @param {Object} $el
	 * @param {Object} index
	 * @param {Object} parent
	 */
	_createVNode($el,index,parent) {
		let children = [];
		let text = VNode.getNodeText($el)
		let nodeType = $el.nodeType;
		let data = {};
		let tag = $el.nodeName;
		let attrs = {};
		if ($el.attributes) {
			let length = $el.attributes.length;
			for (var i = 0; i < length; i++) {
				let it = $el.attributes[i];
				//属性名
				let localName = it.localName;
				//属性值
				let value = it.value;
				attrs[localName] = value;
			}
		}
		index = index?`${index}`:'0'
		let id = parent?'vn_'+(parent.id.substring(3))+'_'+index:'vn_'+index;
		let vnode = new VNode(id,tag, $el, children, text, data, parent, nodeType, attrs);
		//获取子节点
		let childs = $el.childNodes;
		// 深度优先算法
		for (let i = 0; i < childs.length; i++) {
			let childNode = this._createVNode(childs[i],i,vnode);
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
	_observer(keys,key,value){
		//方法发生变化
		if(keys[0] == '$methods'){
			//更新挂载在实例下的方法
			Object.keys(this.$methods).forEach(key => {
				this[key] = this.$methods[key]
			})
		}
		//源数据发生变化
		if(keys[0] == '$data'){
			//更新挂载在实例下的数据
			Object.keys(this.$data).forEach(key => {
				this[key] = this.$data[key]
			})
		}
		//dom变更
		if(this.$vnode){
			//dom更新
			this._compare()
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
		//配置methods方法参数
		instance.$methods = opt.methods;
		//配置data数据参数
		instance.$data = opt.data;
		//将data直接挂载在实例上
		Object.keys(instance.$data).forEach(key => {
			instance[key] = instance.$data[key]
		})
		//将methods直接挂载在实例上
		Object.keys(instance.$methods).forEach(key => {
			instance[key] = instance.$methods[key]
		})
		//进行proxy代理
		instance = Reactive._proxy(instance)
		//执行钩子函数created
		instance.$created.call(instance)
		//返回实例
		return instance
	}

	/**
	 * 获取不需要监听的属性数组
	 */
	static _getUnObserveProperties() {
		return ['$el', '$vnode','_vnode', '$watch','mount','_compare','_compareChildren','_updateVnodes','_createVNode','_observer',
		'$beforeCreate','$created','$beforeMount','$mounted','$beforeUpdate','$updated']
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
			mounted:function(){},
			beforeCreate:function(){},
			created:function(){},
			beforeMount:function(){},
			mounted:function(){},
			beforeUpdate:function(){},
			updated:function(){}
		}
		if (typeof options == 'object' && options) {
			if (typeof options.data == 'object' && options.data) {
				opt.data = options.data;
			}
			if (typeof options.watch == 'object' && options.watch) {
				Object.keys(options.watch).forEach(watchName=>{
					if((typeof options.watch[watchName] != 'function') || !options.watch[watchName]){
						throw new Error(`The definition of "${watchName}" in watch should be a method`)
					}
				})
				opt.watch = options.watch;
			}
			if (typeof options.methods == 'object' && options.methods) {
				Object.keys(options.methods).forEach(methodName=>{
					if((typeof options.methods[methodName] != 'function') || !options.methods[methodName]){
						throw new Error(`The definition of "${methodName}" in methods should be a method`)
					}
				})
				opt.methods = options.methods;
			}
			if(typeof options.beforeMount == 'function' && options.beforeMount){
				opt.beforeMount = options.beforeMount;
			}
			if(typeof options.mounted == 'function' && options.mounted){
				opt.mounted = options.mounted;
			}
			if(typeof options.beforeCreate == 'function' && options.beforeCreate){
				opt.beforeCreate = options.beforeCreate;
			}
			if(typeof options.created == 'function' && options.created){
				opt.created = options.created;
			}
			if(typeof options.beforeUpdate == 'function' && options.beforeUpdate){
				opt.beforeUpdate = options.beforeUpdate;
			}
			if(typeof options.updated == 'function' && options.updated){
				opt.updated = options.updated;
			}
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
						if (Reactive._getUnObserveProperties().includes(key)) {
							return Reflect.get(target, key)
						}
						return new Proxy(target[key], watcher(watchKey))
					} catch (e) {
						return Reflect.get(target, key)
					}
				},
				set: (target, key, value) => {
					if (Reactive._getUnObserveProperties().includes(key)) {
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
					if(typeof instance.$beforeUpdate == 'function'){
						instance.$beforeUpdate.call(instance,key,oldValue,value,(target instanceof Reactive)?undefined:target)
					}
					//更新数据
					Reflect.set(target, key, value);
					//watch键名解析
					var keys = Reactive._parseWatchKey(watchKey);
					//监听
					instance._observer(keys,key,value)
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
					if(typeof instance.$updated == 'function'){
						instance.$updated.call(instance,key,oldValue,value,(target instanceof Reactive)?undefined:target)
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
