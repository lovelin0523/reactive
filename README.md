#### 模仿Vue写的一个简化版+基础版的MVVM库

这两天闲着无聊，工作之余，以自己的理解，写了一个仿Vue的MVVM库。当然，我没看过vue的源码，也没有看过其他任何MVVM框架的源码。仅仅是凭着我使用vue这么久以来对它的理解来写这套库。

我给它取了个很适合的名字，叫Reactive，reactive就是响应式的意思。

reactive中使用了proxy代理，来达到对数据进行监听的效果，这里我也是摒弃了Vue2使用的Object.defineProperty方法，毕竟proxy更为强大，可以对对象和数组进行深度监听。

> reactive中，主要对象其实就两个，一个Reactive对象，一个VNode对象。VNode对象表示虚拟dom，Reactive中挂载数据、方法，通过数据更新来驱动VNode更新节点。


```
//创建Reative对象
const app = Reactive.createApp({
    data: {//数据
        areas: ['北美洲', '大洋洲', '南美洲', '欧洲', '亚洲', '非洲', '南极洲'],
        value:'Reactive',
        show: true,
        areas2: ['North America', 'Oceania', 'South America', 'European', 'Asia', 'Africa', 'Antarctica']
    },
    watch: {//监听
        show(newValue, oldValue) {
            console.log(newValue, oldValue)
	},
    },
    methods: {//方法
        change(e) {
            this.show = !this.show
        },
        change2() {
            this.areas.length = this.areas.length - 1
            console.log(this.$vnode)
        }
    },
    beforeCreate(){
        //钩子函数：实例创建前
        //Reactive实例刚刚创建，data、虚拟dom、methods、watch等尚未建立和赋值，代理仍未执行
    }
    created(){
        //钩子函数：实例创建后
        //Reactive实例创建完成，data、methods、watch已经建立和赋值，代理已经执行，虚拟dom尚未赋值，dom视图尚未渲染
    },
    beforeMount(){
        //钩子函数：实例渲染dom之前
        //Reactive完成创建后，mount方法刚刚开始执行，此时无法获取新的虚拟dom，视图未渲染
    }
    mounted(){
        //钩子函数：实例渲染dom之后
        //Reactive视图层初次渲染完毕，此时虚拟dom树已创建
    }
    beforeUpdate(key,oldValue,newValue,target){
        //钩子函数：实例数据更新之前
        //Reactive数据更新之前触发，此时数据即将更新但未更新，视图层还未变化
        //key：即将变化的字段
        //oldValue：旧值
        //newValue：新值
        //target：key所在数据对象，如果是直接挂载在data下的数据，而不是对象数据，则无
    }
    updated(key,oldValue,newValue,target){
        //钩子函数：实例数据更新之后，此时更新导致的dom变化也完成了
        //Reactive数据更新完成，视图层已经变化并且重新渲染完毕
        //key：变化的字段
        //oldValue：旧值
        //newValue：新值
        //target：key所在数据对象，如果是直接挂载在data下的数据，而不是对象数据，则无
    }
}).mount('#app')//通过mount方法挂载到指定元素下
```



```
//html中：

//通过{{}}在html上进行标记，reactive会进行渲染，{{}}内的数据可以是挂载的数据变量，也可以是基本的表达式，如果是挂载的数据变量则需要通过this来指向
<p>{{this.value}}</p>
<input type="{{this.value}}" />

//if-else语句
<p lk:if="{{this.show}}">{{this.areas}}</p>
<p lk:else>{{this.areas2}}</p>

//show控制隐藏
<p lk:show="{{false}}">隐藏元素</p>

//for循环：可以遍历对象和数组，默认选项和序列为item和index，可以通过lk:for-item、lk:for-index来修改。
//lk:for必须写在其他用到循环值的属性前面，如果item、index与data中数据冲突，以item、index数据优先
<ul>
    <li lk:for="{{this.areas}}" lk:for-index="i" lk:for-item="el">{{this.el}}</li>
</ul>

//事件，如果需要传值，则@click="{{this.change(this.value)}}"，如果需要传值且需要获取event，则@click="{{this.change($event,this.value)}}"，传多个值如@click="{{this.change($event,this.value1,this.value2)}}"
//参数如果不是$event则必须为data中的数据或者循环中的数据，暂不支持其他类型的数据
<button @click="{{this.change}}">显示与隐藏控制</button>
```


```
//实例之外调用实例的方法或者属性

//监听数据变化
app.$watch['user'] = function(newValue,oldValue){
    //this指向reactive实例
}
//定义钩子函数，beforeCreate和created只能在参数中设置，因为app存在表明已经创建完了
app.$beforeMount = function(key,oldValue,newValue,target){
    //this指向reactive实例
    //此方法写在app.mount前
}
app.$mounted = function(key,oldValue,newValue,target){
    //this指向reactive实例
    //此方法写在app.mount前
}
app.$beforeUpdate = function(key,oldValue,newValue,target){
    //this指向reactive实例
}
app.$updated = function(key,oldValue,newValue,target){
    //this指向reactive实例
}

//重新定义method的某个方法，方法变化会被监听到
app.getUserInfo = function(){
    //...
}

//更新data数据
app.user = 'jack'

//添加之前没有的数据
app.name = 'jack'
```


```
//api
app.$forceUpdate() //强制更新视图，当视图不响应数据的修改时使用
app.$mount(selector) //挂载reactive实例
```


```
//页面加载闪烁问题
[lk-cloak]{
    display:none
}

<div id="app" lk-cloak>
    //...
</div>
```


```
//模板渲染能力

//调用createApp时，在参数中添加template参数，该参数可以是字符串或者方法
//如果是字符串，则必须是表示一个dom的html字符串，如果是方法，则必须返回表示一个dom的html字符串
const app = Reactive.createApp({
    data:{
        number:10,
        author:'lovelin'
    },
    template(){
        const number = this.number + 1;
        return "<div>" + number + " {{this.author}}</div>"
    }
}).mount()//此时app实例的根元素即template渲染的元素，无需在mount中添加，template元素会添加到body中
```



---

# 具体的可以到我的博客网站查看相关信息[https://www.mvi-web.cn](https://www.mvi-web.cn)