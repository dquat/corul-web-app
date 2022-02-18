const editor = document.querySelector('.editor');

function locate_cursor_pos(root, index) {
    // borrowed from SO answer: https://stackoverflow.com/a/38479462
    const NODE_TYPE = NodeFilter.SHOW_TEXT;
    const treeWalker =
        document.createTreeWalker(root, NODE_TYPE, (elem) => {
            if (index > elem.textContent.length) {
                index -= elem.textContent.length;
                return NodeFilter.FILTER_REJECT
            }
            return NodeFilter.FILTER_ACCEPT;
        });
    const c = treeWalker.nextNode();
    return {
        node: c ? c : root,
        position: index
    };
}
editor.addEventListener("input", e => {
    const sel = window.getSelection();
    const rng = sel.getRangeAt(0);
    const clone = rng.cloneRange();
    clone.setStart(editor, 0);
    const len = clone.toString().length;
    // test highlighting, a simple, regex based one, not the real one tho
    992
    editor.innerHTML =
        editor.innerText
            .replace(/\d+/g, (s) => `<span style='color: #d3869b;'>${s}</span>`)
            .replace(/(\/\*(.*)\*\/)|(\/\/(.*)\n)/g, (s) => `<span style='color: #928374;font-style: italic;'>${s}</span>`)
            .replace(/(fn|let|const|return|if|else|true|false)/g, (s) => `<span style='color: #fe8019;font-style: italic;'>${s}</span>`);

    let range = document.createRange();
    range.setStart(editor, 0);
    let { node, position } = locate_cursor_pos(editor, len);
    range.setStart(node, position);
    range.setEnd(node, position);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
});

editor.addEventListener('keydown', e => {
    if (e.key === "Tab" || (e.keyCode || e.which) === 9) {
        e.preventDefault();
        const sel = window.getSelection();
        const rng = sel.getRangeAt(0);
        const prev = rng.cloneRange();
        prev.setStart(editor, 0);
        const last = prev.toString().slice(-1);
        const df = document.createDocumentFragment();
        const el = document.createElement('span');
        let tc = '';
        if (last === '\n' && !!window.chrome) {
            if (sel.anchorOffset === 0 && sel.anchorNode.previousSibling) {
                let ps = sel.anchorNode.previousSibling;
                while (ps?.textContent.length === 0)
                    ps = ps?.previousSibling;
                rng.setStart(ps, ps.textContent.length - 1)
            } else
                rng.setStart(sel.anchorNode, sel.anchorOffset - 1);
            tc += '\n';
        }
        el.textContent = tc + '\t';
        df.appendChild(el);
        rng.deleteContents();
        rng.insertNode(df);
        rng.collapse(false);
    }

    // modified from SO answer: https://stackoverflow.com/a/20398132
    if (e.key === "Enter" || (e.keyCode || e.which) === 13) {
        e.preventDefault();
        const sel = window.getSelection();
        const rng = sel.getRangeAt(0);
        const prev = rng.cloneRange();
        prev.setStart(editor, 0);
        const last = prev.toString().slice(-1);
        const df = document.createDocumentFragment();
        const el = document.createElement('span');
        console.log(sel, sel.anchorNode === editor.lastChild, sel.anchorOffset >= editor.lastChild.textContent.length)
        el.textContent = '\n' +
            (
                // check to see if we're at the end of the input, and if the browser is chromium
                // if it is, we add another newline, cuz for some reason chrome seems to want 2
                // newline characters at the end of the input
                (sel.anchorNode === editor.lastChild || sel.anchorNode === editor) &&
                sel.anchorOffset >= sel.anchorNode.textContent.length && !!window.chrome
                    ? '\n' : ''
            );
        df.appendChild(el);
        rng.deleteContents();
        rng.insertNode(df);
        rng.setStartAfter(el);
        rng.collapse(false);
    }
})