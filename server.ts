// oak server
import { Application, Router, RouterContext, Context } from "https://deno.land/x/oak/mod.ts";
// firebase database
// import * as fb from './fb-db.js';

const prod = !!Deno.env.get("PROD");
const db_url =
    prod ?
        'https://corul-playground-db-production.up.railway.app' :
        'http://localhost:8080';
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
        this.ml = max_len;
    }

    add(el: { value: string | null, id: string | null }) {
        if (this.arr.length >= this.ml)
            this.arr.shift();
        this.arr.push(el);
    }

    get_value(value: string) {
        for (const e of this.arr) {
            if (e.value == value)
                return e.id;
        }
        return null;
    }

    get_id(id: string) {
        for (const e of this.arr) {
            if (e.id == id)
                return e.value;
        }
        return null;
    }
}

const prb = new PRB(100);
const max_title_len = 50;
const max_value_len = 200000;
const router =
    new Router()
        .get('/play', playground)
        .get('/playground', playground)
        .post('/api/add', async (ctx) => {
            const body = await ctx.request.body();
            const val = await body.value;
            if (val.text && val.name !== null) {
                let value = val.text.trim();
                let message = '';
                if (value.length > max_value_len) {
                    value = value.substring(0, max_value_len);
                    message += 'value-overflow';
                }
                let name = val.name.trim();
                if (name.length > max_title_len) {
                    name = name.substring(0, max_title_len);
                    message += 'title-overflow';
                }
                if (message === '') {
                    try {
                        const ftc = await fetch(`${db_url}/add/sb`, {
                            method: 'POST',
                            headers: { 'Content-Type':'application/json' },
                            body: JSON.stringify({ name, value })
                        });
                        const data = await ftc.json();
                        ctx.response.body = { status: 200, data: data.data.id, message: null };
                    } catch (e) {
                        console.log("Failed to add to DB: ", e);
                        ctx.response.body = { status: 500, data: null, message: null };
                    }
                    return;
                }
                ctx.response.body = { status: 409, data: null, message };
                return;
            }
            ctx.response.body = { status: 500, data: null, message: null };
        })
        .post('/api/get', async (ctx) => {
            const body = await ctx.request.body();
            const val = await body.value;
            const id = val.id;
            if (id) {
                try {
                    const ftc = await fetch(`${db_url}/get/sb`, {
                        method: 'POST',
                        headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ id })
                    });
                    const data = await ftc.json();
                    if (data.status !== 'ok')
                        ctx.response.body = { status: 404, data: data.error };
                    else
                        ctx.response.body = { status: 200, data: data.data };
                    return;
                } catch (e) {
                    console.log("Failed to get from DB: ", e);
                }
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