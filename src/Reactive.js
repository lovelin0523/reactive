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
	}

	/**
	 * 实例方法：挂载到指定节点
	 * @param {Object} selector
	 */
	mount(selector) {
		//获取挂载元素
		let el = document.querySelector(selector)
		if (!el) {
			el = document.body;
		}
		this.$el = el;
		//创建虚拟dom
		this.$vnode = this._createVNode(el)
		this._vnode = this._createVNode(el)
		this._patch(null,this.$vnode)
		return this;
	}
	
	/**
	 * 根据虚拟dom生成dom元素挂载到页面
	 */
	_patch(oldVnode,vnode){
		if(oldVnode){
			if(vnode){
				//更新vnode，进一步处理
				this._patchVnode(oldVnode,vnode)
			}else{
				//删除dom
				oldVnode.el.remove()
			}
		}else {
			if(vnode){
				//第一次渲染
				this._createElm(vnode)
			}
		}
	}
	
	/**
	 * 比对新旧vnode进行dom更新
	 * @param {Object} oldVnode
	 * @param {Object} vnode
	 */
	_patchVnode(oldVnode,vnode){
		this._updateDoms(vnode,this)
		if(!VNode._equal(oldVnode,vnode) && oldVnode.id === vnode.id){
			if(vnode.parent){
				oldVnode.parent.el.insertBefore(vnode.el,oldVnode.el)
				oldVnode.parent.el.removeChild(oldVnode.el)
				oldVnode.el = vnode.el
			}else {//是根节点
				this.$el.parentNode.insertBefore(vnode.el,this.$el)
				//移除原来的
				this.$el.parentNode.removeChild(this.$el)
				//更新$el
				this.$el = vnode.el;
			}
		}else {
			for(var i = 0;i<oldVnode.children.length;i++){
				for(var j = 0;j<vnode.children.length;j++){
					var oVn = oldVnode.children[i]
					var vn = vnode.children[j]
					if(!VNode._equal(vn,oVn) && vn.id === oVn.id){
						console.log('进入')
						oVn.parent.el.insertBefore(vn.el,oVn.el)
						oVn.parent.el.removeChild(oVn.el)
						oVn.el = vn.el
					}
				}
			}
		}
	}
	
	/**
	 * 根据虚拟dom动态创建真实dom节点
	 */
	_createElm(vnode){
		this._updateDoms(vnode,this)
		//如果不是根节点
		if(vnode.parent){
			vnode.parent.el.appendChild(vnode.el)
		}else {//是根节点
			this._updateDoms(this._vnode)
			//虚拟dom的el插入页面
			this.$el.parentNode.insertBefore(vnode.el,this.$el)
			//移除原来的
			this.$el.parentNode.removeChild(this.$el)
			//更新$el
			this.$el = vnode.el;
		}
	}
	
	/**
	 * 更新指定虚拟dom树及其子元素的el
	 */
	_updateDoms(vnode){
		//根据虚拟dom递归创建真实节点以及其子节点（更新虚拟dom的el）
		VNode._createElement(vnode,this)
		//将虚拟dom的el填充到父元素的el中
		let f = (item)=>{
			item.children.forEach(child=>{
				item.el.appendChild(child.el)
				f(child)
			})
		}
		f(vnode)
	}

	/**
	 * 创建虚拟dom
	 * @param {Object} $el
	 * @param {Object} index
	 * @param {Object} parent
	 */
	_createVNode($el,index, parent) {
		let children = [];
		let text = VNode._getNodeText($el)
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
	 * 创建一个Reactive的Proxy对象
	 * @param {Object} options
	 */
	static createApp(options) {
		//初始化创建一个实例
		let instance = new Reactive()
		//校验参数
		let opt = Reactive._validator(options)
		//配置watch监听参数
		instance.$watch = opt.watch;
		//配置methods方法参数
		instance.$methods = opt.methods;
		//配置data数据参数
		instance.$data = opt.data;
		//将data直接挂载在实例上
		Object.keys(instance.$data).forEach(key => {
			instance[key] = opt.data[key]
		})
		//将methods直接挂载在实例上
		Object.keys(instance.$methods).forEach(key => {
			instance[key] = opt.methods[key]
		})
		//进行proxy代理
		instance = Reactive._proxy(instance)
		//返回实例
		return instance
	}

	/**
	 * 获取不需要监听的属性数组
	 */
	static _getUnObserveProperties() {
		return ['$el', '$watch', '$methods', 'mount', '$vnode','_vnode']
	}

	/**
	 * 检验options参数
	 * @param {Object} options
	 */
	static _validator(options) {
		let opt = {
			data: {},
			watch: {},
			methods: {}
		}
		if (typeof options == 'object' && options) {

			if (typeof options.data == 'object' && options.data) {
				opt.data = options.data;
			}

			if (typeof options.watch == 'object' && options.watch) {
				opt.watch = options.watch;
			}

			if (typeof options.methods == 'object' && options.methods) {
				opt.methods = options.methods;
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
					Reflect.set(target, key, value);
					//dom变更
					instance._patch(instance._vnode,instance.$vnode)
					//watch回调
					var keys = Reactive._parseWatchKey(watchKey);
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
