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
const X: usize = 10;
fn main() {
\tprintln!("Starting program...");
\t// always runs
\tif X == 10 {
\t\tprintln!("x is ten.");
\t\tlet y: usize = X - 10; // y is 0 because x is 10
\t\tprintln!("y is zero!");
\t} else { // well, this can't ever happen!
\t\tmain();
\t}
}`;

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

export async function load(id, type) {
    if (!id)
        throw null;

    let res = null;
    try {
        res = await fetch(`/api/get/${ type ?? 'sb' }`, {
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
        console.log(`Encountered error when trying to get ID ${ id }:`, json?.error);
        throw "Check your connection and try again.";
    }

    if (json?.value)
        return json.value;
    else
        // should ideally never reach here
        throw "A server error occurred! Please try again later.";
}

export async function add(value, name, type) {
    if (!value)
        throw "Expected the editor to contain code, but it is empty! Please add code to store.";
    let res = null;
    try {
        res = await fetch(`/api/add/${ type ?? 'sb' }`, {
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

// this is borrowed from: https://stackoverflow.com/a/30106551
export function encode_unicode(str) {
    return window.btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}
// so is this
export function decode_unicode(str) {
    return decodeURIComponent(atob(str).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// a simple JSON stringifier, that formats JSON files. Some things won't be formatted correctly since they've not been
// implemented as they are outside scope of this project
export function formatted_stringify_JSON(json, depth = 1) {
    let accumulated = '';
    const dps = '    '.repeat(depth);
    accumulated += (depth <= 1 ? '    '.repeat(depth - 1) : '') + '{\n';
    for (const [key, value] of Object.entries(json)) {
        if (value instanceof Array) {
            let value_string = value
                .map(v => `"${v}", `)
                .join('')
                .slice(0, -2);
            accumulated += dps + `"${key}": [ ${value_string} ],\n`;
        } else if (value instanceof Object) {
            accumulated += dps + `"${key}": ` +
                formatted_stringify_JSON(value, depth + 1) + ',\n';
        } else {
            accumulated += dps + `"${key}": "${value}",\n`;
        }
    }
    accumulated = accumulated.slice(0, -2) + '\n';
    accumulated += '    '.repeat(depth - 1) + '}';
    return accumulated;
}