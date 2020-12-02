const app = Reactive.createApp({
	data:{
		show:false,
		number:10,
		version:'1.0',
		name:'reactive.js',
		item:'a',
		author:{
			name:'凌凯',
			age:25,
			gender:'男',
			graduateSchool:'安徽师范大学',
			major:'软件工程'
		},
		countries:['中国','美国','英国','法国','德国','俄国','澳大利亚','日本','意大利']
	},
	template(){
		const number = this.number + 1;
		return `
			<div>
				${number} {{this.author}}
			</div>
		`
	},
	mounted(){
		//this.book = '三国演义'
	},
	methods:{
		change(event,item,index){
			console.log(event)
			alert(item+'||'+index)
		},
		update(){
			if(this.show){
				this.show = false;
			}else {
				this.show = true;
			}
			this.$forceUpdate();
		},
		update2(){
			this.number++;
			this.$forceUpdate();
		}
	}
}).mount('#app')

