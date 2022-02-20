// oak server
import { Application, Router, RouterContext, Context } from "https://deno.land/x/oak/mod.ts";
import * as fb from './fb-db.js';

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
        .get('/playground', playground)
        .post('/api/add', async (ctx) => {
            const body = await ctx.request.body();
            const val = await body.value;
            if (val?.text) {
                try {
                    let id = await fb.add({ value: val.text });
                    ctx.response.body = { status: 200, data: id };
                } catch (e) {
                    console.log(e);
                    ctx.response.body = { status: 500 };
                    return;
                }
            } else {
                ctx.response.body = { status: 500 };
                return;
            }
        })
        .post('/api/get', async (ctx) => {
            const body = await ctx.request.body();
            const val = await body.value;
            const id = val.id;
            if (id) {
                const data = await fb.get(id);
                if (data.error)
                    ctx.response.body = { status: 404, data: data.error.toString() };
                else
                    ctx.response.body = { status: 200, data: data };
                return;
            }
            ctx.response.body = { status: 500, data: null };
        });

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