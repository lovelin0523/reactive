const app = Reactive.createApp({
	data:{
		show:true,
		number:10,
		version:'1.0',
		name:'reactive.js',
		className:'bg-success',
		author:{
			name:'凌凯',
			age:25,
			gender:'男',
			graduateSchool:'安徽师范大学',
			major:'软件工程'
		},
		countries:['中国','美国','英国','法国','德国','俄国','澳大利亚','日本','意大利']
	},
	mounted(){
		
	},
	methods:{
		change(e){
			this.author.name = '缪海龙'
		}
	}
}).mount('#app')