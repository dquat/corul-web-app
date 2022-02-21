// About innerHTML, I know it's bad and all, and I *will remove* it later on, when I implement
// an actual colorizing function. For now, deal with it. Or, don't visit this website :)

const _is_chrome       = !!window.chrome; // currently unused...
const editor           = document.querySelector('.editor');
const notify_container = document.querySelector('.notification-holder');
const save_btn         = document.querySelector('.save');
const run_btn          = document.querySelector('.run');
const highlights =
    document.querySelectorAll('.highlight');

function locate_cursor_pos(root, index) {
    // borrowed from SO answer: https://stackoverflow.com/a/38479462
    const NODE_TYPE = NodeFilter.SHOW_TEXT;
    const treeWalker =
        document.createTreeWalker(root, NODE_TYPE, (elem) => {
            if (index > elem.textContent.length) {
                index -= elem.textContent.length;
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        });
    const c = treeWalker.nextNode();
    return {
        node: c ? c : root,
        position: index
    };
}

const notify = (
    value = "Unknown notification",
    id = 0,
    duration = 5000,
    type = null,
    before_remove = async _ => {},
) => {
    if ((id && !document.querySelector("#id-" + id)) || !id) {
        let el = document.createElement("div");
        let ts = document.createElement("div");
        let s =  document.createElement('span');
        s.classList.add("message");
        s.append(value);
        const date = new Date();
        const apm = date.getHours() > 12 ? "PM" : "AM";
        ts.classList.add("time-stamp");
        ts.textContent = `${
            date.getHours() > 12 ? date.getHours() - 12 : date.getHours()
        }:${date.getMinutes()}:${date.getSeconds()} ${apm}`;
        el.classList.add("notification");
        if (type)
            el.classList.add(type);
        el.append(s);
        if (id)
            el.id = "id-" + id;
        el.append(ts);
        notify_container.append(el);
        el.addEventListener('click', async e => {
            if (before_remove)
                await before_remove(e);
            el.remove();
        });
        if (duration)
            setTimeout(() => el.remove(), duration);
    }
}

const get = async (id) => {
    let res = await fetch("/api/get", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id })
    });
    return await res.json();
}

const colorize = input => {
    return input
        // '<' -> &lt; '>' -> &gt;
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // strings
        .replace(/"([^"]*)"?/gs, (s) => `<span class='string'>${s}</span>`)
        // numbers
        .replace(/\d+/g, (s) => `<span class='number'>${s}</span>`)
        // multiline-comments
        .replace(/\/\*(.*?)\*\//gs, (s) => `<span class='comment'>${s}</span>`)
        // single line comments
        .replace(/\/\/(.*)\n?/g, (s) => `<span class='comment'>${s}</span>`)
        // some, not all special characters
        .replace(/([\^\-|%!+(){}\[\].,?~]|&lt;|&gt;)/g, (s) => `<span class='special'>${s}</span>`)
        // some keywords
        .replace(/(fn|let|const|return|if|else|true|false|for|while|loop)/g,
            (s) => `<span class='keyword'>${s}</span>`);
}

for (const highlighter of highlights)
    highlighter.innerHTML = colorize(highlighter.textContent);

const params = new URLSearchParams(window.location.search);
const query = params.get("q");
if (query) {
    let prev = editor.textContent;
    editor.textContent = "Loading...";
    const failed = () => {
        notify(
            "Failed to load code snippet! Tip: check your network, and link.",
            null,
            5000,
            'n-err'
        );
        editor.textContent = prev;
        editor.innerHTML = colorize(editor.textContent);
    };
    get(query)
        .then(v => {
            if (v.data !== null) {
                editor.textContent = v.data.value;
                editor.innerHTML = colorize(editor.textContent);
            } else
                failed();
        })
        .catch(e => {
            console.log(e);
            failed();
        });
} else
    editor.innerHTML = colorize(editor.textContent);

const input = _ => {
    const sel = window.getSelection();
    const rng = sel.getRangeAt(0);
    const clone = rng.cloneRange();
    clone.setStart(editor, 0);
    const len = clone.toString().length;
    let tc = editor.textContent;
    // test highlighting, a simple, regex based one, not the real one tho
    editor.innerHTML =
        colorize(editor.textContent)
        // fixes bug in chromium (wants 2 '\n's at the end of input for 1 '\n')
        // and maybe firefox bug too?...
        + (tc.slice(-1) !== '\n' ? '\n' : '');

    let range = document.createRange();
    range.setStart(editor, 0);
    let {node, position} = locate_cursor_pos(editor, len);
    range.setStart(node, position);
    range.setEnd(node, position);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
}

editor.addEventListener("input", input);

editor.addEventListener('keydown', e => {
    if (e.key === "Tab" || (e.keyCode || e.which) === 9) {
        e.preventDefault();
        const sel = window.getSelection();
        const rng = sel.getRangeAt(0);
        const s = document.createElement('span');
        s.appendChild(document.createTextNode('\t'));
        rng.deleteContents();
        rng.insertNode(s);
        rng.collapse(false);
    }

    // modified from SO answer: https://stackoverflow.com/a/20398132
    if (e.key === "Enter" || (e.keyCode || e.which) === 13) {
        e.preventDefault();
        const sel = window.getSelection();
        const rng = sel.getRangeAt(0);
        const df = document.createDocumentFragment();
        df.appendChild(document.createTextNode('\n'));
        rng.deleteContents();
        rng.insertNode(df);
        rng.collapse(false);
        input(e); // cursor sometimes bounces when event is not triggered here
    }
});

save_btn.addEventListener('click', async _ => {
    let res = await fetch("/api/add", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: editor.textContent, name: "" })
    });
    const doc = await res.json();
    const id = doc.data;
    if (!doc.error) {
        let link = `${window.location.pathname}?q=${id}`;
        let abs_link = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ":" + window.location.port : ""}` + link;
        notify(
            `The link for this snippet is: ${abs_link}. Click to copy`,
            null,
            null,
            'n-info',
            async _ => {
                try {
                    await navigator.clipboard.writeText(
                        abs_link
                    );
                    notify(
                        'Success! Copied link to clipboard.',
                        null,
                        5000,
                        'n-success'
                    );
                    return true;
                } catch (e) {
                    return false;
                }
            }
        );
        window.history.replaceState(null, null, link);
    }
});

run_btn.addEventListener('click', _ => {
   notify(
       'Running the code does not do anything currently, since the language is not in a ready state.',
       'run-code',
       5000,
       'n-info'
   );
});