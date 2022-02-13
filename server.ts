import { Application, Router } from "https://deno.land/x/oak/mod.ts";
const app = new Application();

app.addEventListener("listen", ({ hostname, port, secure }) => {
   console.log(
       `listening on ${
           secure ? 'https://' : 'http://'
       }${
           hostname ?? 'localhost'
       }:${port}`
   );
});

app.use(async (ctx, next) => {
    try {
        await ctx.send({
            root: `${Deno.cwd()}/public`,
            index: 'index.html'
        });
    } catch {
        await next();
    }
});

app.use(async ctx => {
    ctx.response.body = "404!";
});
// const router =
//     new Router()
//         .get("/", ctx => {
//             // do something
//         });
// app.use(router.routes());
// app.use(router.allowedMethods());

await app.listen({ port: 8000 });
