const max_name_len = 50;
const max_value_len = 200000;

export const default_input =
    `/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * This program is free to use & distribute (no copyright)           *
 * It is also perfectly valid Rust code.                             *
 * It's currently used as a placeholder for my programming language  *
 * which is still under development (unusable to any extent).        *
 * Repo for this web app: https://github.com/dquat/corul-web-app     *
 * Repo for language: https://github.com/dquat/Corul                 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

// Here's a sample Rust program, for you to edit while you're here
// or if you're the enthusiastic kind, waiting for me to finish my language.
fn main() {
\tprintln!("Starting program...");
\tconst x = 10;
\t// always runs
\tif x == 10 {
\t\tprintln!("x is ten.");
\t\tlet y = x - 10; // y is 0 because x is 10
\t\tprintln!("y is zero!");
\t}
}\n
`;

export function locate_cursor_pos(root, index) {
    // borrowed from SO answer: https://stackoverflow.com/a/38479462
    const NODE_TYPE  = NodeFilter.SHOW_TEXT,
          treeWalker =
              document.createTreeWalker(root, NODE_TYPE, (elem) => {
                  let l = (elem.textContent ?? elem.innerText).length;
                  if (index > l) {
                      index -= l;
                      return NodeFilter.FILTER_REJECT;
                  }
                  return NodeFilter.FILTER_ACCEPT;
              });

    let c = treeWalker.nextNode();

    // debugging, probably not required, but here just in case
    if (!c) console.log("caret node is null!");

    return {
        node     : c ? c : root,
        position : index
    };
}

export async function load(id) {
    if (!id)
        throw null;

    let res = null;
    try {
        res = await fetch("/api/get", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id })
        });
    } catch (e) {
        console.log("Error encountered while pinging server to get item from DB: ", e);
    }
    if (res?.status === 400)
        throw "The given id to load is not of valid format!";
    if (res?.status === 404)
        throw "The URL could not be loaded, please check your URL or connection and try again.";

    const json = await res?.json();

    if (json?.status === 'error') {
        console.log(`Encountered error when trying to get ID ${id}:`, json?.error);
        throw "Check your connection and try again.";
    }

    if (json?.value)
        return json.value;
    else
        // should ideally never reach here
        throw "A server error occurred! Please try again later.";
}

export async function add(value, name) {
    if (!value)
        throw "Expected the editor to contain code, but it is empty! Please add code to store.";

    let res = null;
    try {
        res = await fetch("/api/add", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, text: value })
        });
    } catch (e) {
        console.log("Error encountered while pinging server to add an entry to the DB: ", e);
    }

    if (res?.status === 400)
        if (!value?.trim())
            throw "Expected the editor to contain code, but it is empty! Please add code to store.";
        else if (value?.trim()?.length > max_value_len)
            throw "The code must be at most than 200,000 characters long! Please shorten the code.";
        else if (name?.trim()?.length > max_name_len)
            throw "The name must be at most 50 characters long, the name specified is longer than that!";
        else
            throw "Unknown error!";

    const json = await res?.json();

    if (json?.status === 'error') {
        console.log("Failed to add to DB with error:", res?.error);
        throw "Please try again later, or check your connection.";
    }

    if (json?.value)
        return { ...json.value, match: json?.match };
    else
        // should ideally never reach here
        throw "A server error occurred! Please try again later.";
}

export class Msg {

    static Exists = 'exists';

    constructor(
        root,
        base_class,
        message_class,
        time_class,
    ) {
        this._root = root || document.documentElement;
        this._base_cls = base_class || 'msg';
        this._msg_cls = message_class || 'message';
        this._time_cls = time_class || 'time-stamp';
        this._hour24 = false;
        this.reset();
    }

    reset() {
        this._duration = 5000;
        this._type = null;
        this._id = null;
    }

    set_date_fmt(hour_24_format) {
        this._hour24 = hour_24_format;
    }

    set_type(type) {
        this._type = type;
    }

    set_dur(duration) {
        this._duration = duration;
    }

    set_id(id) {
        this._id = id;
    }

    _gen_ts() {
        const date    = new Date(),
              hrs     = date.getHours(),
              mins    = date.getMinutes(),
              secs    = date.getSeconds(),
              am_pm   = hrs >= 12 ? ' PM' : ' AM',
              hrs_fmt = `${this._hour24 ? hrs : (hrs > 12 ? hrs - 12 : hrs)}`;
        return `${ hrs_fmt }:${ mins }:${ secs }${ this._hour24 ? '' : am_pm }`
    }

    spawn(value = "Unknown message", bfr_rm = async () => true) {
        const id_ref = "id-";

        if (this._id && document.querySelector("#" + id_ref + this._id))
            return Msg.Exists;

        const base = document.createElement("div"),
              text_span = document.createElement("span");

        text_span.append(value);
        base.append(text_span);
        text_span.classList.add(this._msg_cls);
        base     .classList.add(this._base_cls);

        if (this._type)
            base.classList.add(this._type);

        if (this._id)
            base.id = id_ref + this._id;

        if (this._time_cls) {
            const time_stamp = document.createElement("span");
            time_stamp.textContent = this._gen_ts();
            time_stamp.classList.add(this._time_cls);
            base.append(time_stamp);
        }

        this._root.append(base);

        const outer = this;
        base.addEventListener('click', async _ => {
            let remove = true;
            if (bfr_rm) {
                remove = await bfr_rm() ?? true;
            }
            if (remove) {
                base.remove();
                outer.reset();
            }
        });

        if (this._duration)
            setTimeout(() => {
                base.remove();
                outer.reset();
            }, this._duration);
    }
}