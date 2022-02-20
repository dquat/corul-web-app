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

// previous request bodies
class PRB {
    arr = Array<{ value: string | null, id: string | null }>();
    ml  = 30;
    constructor(max_len: number = 30) {
        this.arr = [];
        this.ml = 30;
    }

    add(el: { value: string | null, id: string | null }) {
        if (this.arr.length >= this.ml)
            this.arr.shift();
        this.arr.push(el);
    }

    get_value(value: string) {
        for (const e of this.arr) {
            if (e.value == value) {
                return e.id;
            }
        }
        return null;
    }

    get_id(id: string) {
        for (const e of this.arr) {
            if (e.id == id) {
                return e.value;
            }
        }
        return null;
    }
}

const prb = new PRB(100);

const router =
    new Router()
        .get('/play', playground)
        .get('/playground', playground)
        .post('/api/add', async (ctx) => {
            const body = await ctx.request.body();
            const val = await body.value;
            if (val?.text) {
                let value = val.text.trim();
                try {
                    let prev_id = prb.get_value(val.text);
                    if (prev_id)
                        ctx.response.body = { status: 200, data: prev_id };
                    else {
                        let id = await fb.add({ value, title: "" });
                        prb.add({ value, id });
                        ctx.response.body = { status: 200, data: id };
                    }
                } catch (e) {
                    console.log(e);
                    ctx.response.body = { status: 500 };
                }
                return;
            }
            ctx.response.body = { status: 500 };
        })
        .post('/api/get', async (ctx) => {
            const body = await ctx.request.body();
            const val = await body.value;
            const id = val.id;
            if (id) {
                let prev_val = prb.get_id(id);
                if (prev_val) {
                    ctx.response.body = { status: 200, data: { data: prev_val } };
                    return;
                }
                const data = await fb.get(id);
                if (data.error)
                    ctx.response.body = { status: 404, data: data.error.toString() };
                else {
                    prb.add({ value: data.data, id: data.id });
                    ctx.response.body = {status: 200, data};
                }
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