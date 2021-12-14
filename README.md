# koaComposeTest
浅记[koa](https://github.com/koajs)的洋葱模型实现

#### 1.简介
Koa 是一个新的 web 框架，由 Express 幕后的原班人马打造， 致力于成为 web 应用和 API 开发领域中的一个更小、更富有表现力、更健壮的基石。 通过利用 async 函数，Koa 帮你丢弃回调函数，并有力地增强错误处理。 Koa 并没有捆绑任何中间件， 而是提供了一套优雅的方法，帮助您快速而愉快地编写服务端应用程序。

#### 2.安装
Koa 依赖 node v7.6.0 或 ES2015及更高版本和 async 方法支持.

你可以使用自己喜欢的版本管理器快速安装支持的 node 版本：

~~~
nvm install 7
npm i koa
node my-koa-app.js
~~~

#### 3.中间件执行的洋葱模型
![](https://raw.githubusercontent.com/niexq/picbed/main/picgo/ycmx.png)

#### 4.中间件级联
Koa 中间件以更传统的方式级联。对比 Connect 的实现，通过一系列功能直接传递控制，直到一个返回，Koa 调用“下游”，然后控制流回“上游”。

#### 5.疑问点：
- 中间件如何加载
- 中间件执行顺序
- next是啥
- context如何传递

#### 6.koa中间件执行代码
下面以 “Hello World” 的响应作为示例，当请求开始时首先请求流通过四个中间件，然后继续移交控制给 response 中间件。当一个中间件调用 next() 则该函数暂停并将控制传递给定义的下一个中间件。当在下游没有更多的中间件执行后，堆栈将展开并且每个中间件恢复执行其上游行为。

启动服务器代码index.js
~~~

require('colors');
const Koa = require('koa2');
const app = new Koa();

const firstMiddleware = async (ctx, next) => {
  console.error('第一个中间件执行开始')
  await next();
  console.error('第一个中间件执行结束')
};

const secondMiddleware = async (ctx, next) => {
  console.error('第二个中间件执行开始')
  await next();
  console.error('第二个中间件执行结束')
};

const thirdMiddleware = async (ctx, next) => {
  console.error('第三个中间件执行开始')
  await next();
  console.error('第三个中间件执行结束')
};

const fourthMiddleware = async (ctx, next) => {
  console.error('第四个中间件执行开始')
  await next();
  console.error('第四个中间件执行结束')
};

app.use(firstMiddleware)

app.use(secondMiddleware)

app.use(thirdMiddleware)

app.use(fourthMiddleware)

// response
app.use(async (ctx, next) => {
  console.log('准备响应');
  ctx.body = 'Hello World';
  console.log('已响应');
});

console.error('koa2 server start: '.blue, 'http://localhost:3001'.green);

app.listen(3000);
~~~

启动服务node index.js，浏览器中访问http://localhost:3001/
访问后，在启动的服务命令窗口输出的结果：

~~~
第一个中间件执行开始

第二个中间件执行开始

第三个中间件执行开始

第四个中间件执行开始

准备响应

已响应

第四个中间件执行结束

第三个中间件执行结束

第二个中间件执行结束

第一个中间件执行结束
~~~

#### 7.源码分析

> app.listen 创建node的[http](https://nodejs.org/api/http.html)服务

**重点关注this.callback()，this.callback()生成node的http服务请求回调函数**
~~~
listen(...args) {
  debug('listen');
  const server = http.createServer(this.callback());
  return server.listen(...args);
}
~~~

> callback 返回node的http服务请求回调函数

~~~
callback() {
  const fn = compose(this.middleware);       // 重点关注此行代码

  if (!this.listenerCount('error')) this.on('error', this.onerror);

  const handleRequest = (req, res) => {
    const ctx = this.createContext(req, res);  // 此处创建context
    return this.handleRequest(ctx, fn);
  };

  return handleRequest;
}
~~~

> handleRequest 真正的请求回调函数

~~~
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror);
    return fnMiddleware(ctx).then(handleResponse).catch(onerror); // 此行代码也很关键
  }
~~~

compose(this.middleware)，此行代码处理中间件，继续跟踪app.use方法



> app.use(function) 将给定的中间件方法添加到此应用程序

[use方法源码](https://github.com/koajs/koa/blob/master/lib/application.js)

~~~
  use(fn) {
    ...
    this.middleware.push(fn);
    return this;
  }
~~~

app.use只负责将给定的中间件方法存入this.middleware数组中。

> compose 中间件合成

[koa-compose源码](https://github.com/koajs/compose/blob/master/index.js)

~~~
function compose (middleware) {
  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)

    // 关键函数dispatch
    function dispatch (i) {
      // 验证给定的中间件方法中，不能多次next()
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next;
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
~~~

compose方法中，递归调用dispatch函数，它将遍历整个middleware，然后将context和dispatch(i + 1)传给middleware中的方法, 这里的dispatch(i + 1)就是中间件方法的第二个入参next，通过next巧妙的把下一个中间件fn作为next的返回值。

#### 8.疑问解答
至此就以上4点疑问就都可以解释了：
- 中间件如何加载（通过app.use方法存入this.middleware数组中，然后通过compose方法串联）
- 中间件执行顺序（dispatch(0)，存在this.middleware数组里的中间件方法先进先执行，next()执行后转交下一中间件）
- next是啥（next是一个以下一个中间件为返回值的方法）
- context如何传递（context就在Promise.resolve(fn(context, dispatch.bind(null, i + 1)))一直传递）

#### 9.结合洋葱模型，koa中间件执行效果
![](https://raw.githubusercontent.com/niexq/picbed/main/picgo/koauseus.png)

