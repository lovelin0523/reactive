const app = Reactive.createApp({
	data:{
		num:0,
		show:false,
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
		countries:['中国','美国','英国','法国','德国','俄国','澳大利亚','日本','意大利'],
		components:[1,2,3]
	},
	mounted(){
		
	},
	methods:{
		change(){
			this.number++;
			//this.show = true;
		}
	}
}).mount('#app')