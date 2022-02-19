// About innerHTML, I know it's bad and all, and I *will remove* it later on, when I implement
// an actual colorizing function. For now, deal with it. Or, don't visit this website :)

const _is_chrome = !!window.chrome; // currently unused...
const editor = document.querySelector('.editor');
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