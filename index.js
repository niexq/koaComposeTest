
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
  // ctx.request; // 这是 koa Request
  // ctx.response; // 这是 koa Response
  
  console.log('准备响应');
  ctx.body = 'Hello World';
  console.log('已响应');
});

console.error('koa2 server start: '.blue, 'http://localhost:3001'.green);

app.listen(3001);




