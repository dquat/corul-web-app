import { Application, Router, RouterContext, Context } from "https://deno.land/x/oak/mod.ts";
const app = new Application();

app.addEventListener("listen", ({ hostname , port, secure }) => {
   console.log(
       `listening on ${
           secure ? 'https://' : 'http://'
       }${
           hostname ?? 'localhost'
       }:${port}`
   );
});

app.use(async (ctx: Context, next) => {
    try {
        await ctx.send({
            root: `${Deno.cwd()}/public`,
            index: 'index.html'
        });
    } catch {
        await next();
    }
});

const playground = async (ctx: RouterContext) => {
    const playground = await Deno.readFile("./playground-ce.html");
    ctx.response.headers =
        new Headers({
            'Content-Type': 'text/html'
        });
    ctx.response.body = new TextDecoder('utf-8').decode(playground);
};

const router =
    new Router()
        .get('/play', playground)
        .get('/playground', playground);

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx: Context) => {
    const not_found = await Deno.readFile("./404.html");
    ctx.response.headers =
        new Headers({
            'Content-Type': 'text/html'
        });
    ctx.response.body = new TextDecoder('utf-8').decode(not_found);
});

await app.listen({ port: 8000 });