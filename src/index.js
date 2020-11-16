'use strict'

/**
 * 响应式MVVM对象
 */
class Reactive {
	constructor() {}
	
	/**
	 * 实例方法：挂载到指定节点
	 * @param {Object} selector
	 */
	mount(selector){
		let el = document.querySelector(selector)
		if(!el){
			el = document.body;
		}
		this.$el = el;
		this._compile()
		return this;
	}

	/**
	 * 编译
	 */
	_compile(){
		//匹配{{}}的正则
		let reg = /\{\{(.*)\}\}/g
		
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
	static _getUnObserveProperties(){
		return ['$el','$watch','$methods','mount'] 
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
						if(Reactive._getUnObserveProperties().includes(key)){
							return Reflect.get(target, key)
						}
						return new Proxy(target[key], watcher(watchKey))
					} catch (e) {
						return Reflect.get(target, key)
					}
				},
				set: (target, key, value) => {
					if(Reactive._getUnObserveProperties().includes(key)){
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
					instance._compile()
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

//module.exports = Reactive
export default Reactive
