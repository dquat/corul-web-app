// oak server
import {Application, Context, Router, RouterContext, Status} from "https://deno.land/x/oak@v9.0.1/mod.ts";
import * as sb from "./databases/sb-db.js";
import * as fb from "./databases/fb-db.js";

// await fb.add(null, 'wxyz');
// await sb.add(null, 'abc');

const status = {
    ok    : 'ok',
    error : 'error'
};

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

app.use(async (ctx: Context, next) => {
    try {
        await ctx.send({
            root: `${ Deno.cwd() }/matriad-wasm/pkg`,
            index: 'matriad_wasm.js'
        });
    } catch {
        await next();
    }
});

const playground = async (ctx: RouterContext) => {
    const playground = await Deno.readFile("./routes/playground.html");
    ctx.response.status = 200;
    ctx.response.headers =
        new Headers({
            'Content-Type': 'text/html'
        });
    ctx.response.body = new TextDecoder('utf-8').decode(playground);
};

const max_title_len = 50;
const max_value_len = 200000;
const router =
    new Router()
        .get('/themes/:name', async ctx => {
            try {
                ctx.response.status = 200;
                ctx.response.headers =
                    new Headers({
                        'Content-Type': 'application/json'
                    });
                const text = await Deno.readFile(`./themes/${ctx.params.name}`);
                ctx.response.body =
                    new TextDecoder('utf-8')
                        .decode(text);
            } catch {
                ctx.response.status = 404;
            }
        })
        .get('/play', playground)
        .get('/playground', playground)
        .post('/api/add/:type', async (ctx: RouterContext) => {
            const type  = ctx.params.type,
                  body  = await ctx.request.body(),
                  value = await body.value,
                  text  = value?.text?.trim(),
                  name  = value?.name?.trim();

            if (!text || text?.length > max_value_len || name?.length > max_title_len) {
                ctx.response.status = Status.BadRequest;
                ctx.response.body = { status: status.error, data: null, error: null }
                return;
            }
            const add = await (type === 'fb' ? fb.add(name, text) : sb.add(name, text));
            ctx.response.status = Status.OK;
            ctx.response.body = add;
        })
        .post('/api/get/:type', async ctx => {
            const type  = ctx.params.type,
                  body  = await ctx.request.body(),
                  value = await body.value;
            if (!value.id) {
                ctx.response.status = Status.BadRequest;
                ctx.response.body = { status: status.error, data: null, error: null }
                return;
            }
            const get = await (type === 'fb' ? fb.get_id(value.id) : sb.get_id(value.id));
            if (get?.error?.code === "22P02" /* uuid syntax invalid */ )
                ctx.response.status = Status.BadRequest;
            else if (get.status === status.error)
                ctx.response.status = Status.NotFound;
            else
                ctx.response.status = Status.OK;
            ctx.response.body = get;
        });

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx: Context) => {
    const not_found = await Deno.readFile("./routes/404.html");
    ctx.response.headers =
        new Headers({
            'Content-Type': 'text/html'
        });
    ctx.response.body = new TextDecoder('utf-8').decode(not_found);
});

await app.listen({ port: 8000 });