const app = Reactive.createApp({
	data: {
		show: false,
		number: 10,
		version: '1.0',
		name: 'reactive.js',
		item: 'a',
		author: {
			name: '凌凯',
			age: 25,
			gender: '男',
			graduateSchool: '安徽师范大学',
			major: '软件工程'
		},
		countries: ['中国', '美国', '英国', '法国', '德国', '俄国', '澳大利亚', '日本', '意大利']
	},
	template() {
		return `
			<div id="app">
				<div>
					<span style="margin:0 10px;" lk:for="{{this.countries}}" @click="{{this.change($event,this.item,this.index)}}">{{this.item}}</span>
				</div>
				<div style="margin: 10px 0;">
					<span style="margin:0 10px;" lk:for="{{this.countries}}" lk:for-index="i" lk:for-item="el">{{this.el}}{{this.i}}</span>
				</div>
				<div style="margin: 10px 0;">
					<span style="margin:0 10px;" lk:for="{{this.author}}" lk:for-item="el">{{this.el}}</span>
				</div>
				<div id="el" lk:if="{{this.show}}">我在安徽</div>
				<div lk:else>我在上海</div>
				<div style="margin-bottom: 40px;">
					<button type="button" @click="{{this.update}}">if/else控制</button>
				</div>
				<div lk:show="{{this.number % 2 == 0}}">元素显示与隐藏</div>
				<div><button type="button" @click="{{this.update2}}">show控制</button></div>
			</div>
		`
	},
	mounted() {
		console.log('Reactive实例渲染后')
	},
	methods: {
		change(event, item, index) {
			console.log(event)
			alert(item + '||' + index)
		},
		update() {
			if (this.show) {
				this.show = false;
			} else {
				this.show = true;
			}
			this.$forceUpdate();
		},
		update2() {
			this.number++;
			this.$forceUpdate();
		}
	},
	beforeCreate() {
		console.log('Reactive实例创建之前')
	},
	created() {
		console.log('Reactive实例创建之后')
	},
	beforeUpdate() {
		console.log('Reactive实例更新之前')
	},
	updated() {
		console.log('Reactive实例更新后')
	},
	beforeMount() {
		console.log('Reactive实例渲染前')
	}
}).mount('#app')
