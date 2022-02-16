// last 2 are depreciated, but if e is null, they can be used instead
const get_e = e => e || window.event || event;

const TEParams =  {
    caret_class    : 'caret',
    line_class     : 'code-line',
    blink_interval : 500,
    blink_class    : 'caret-blink',
    focused_class  : 'editor-focus',
    editor_class   : 'editor',
    line_focused   : 'line-focus',
}

// WYSIWYG
// the "hack" text editor, allows us to have full control making
// code highlighting
// line numbering
// current-line highlighting
// bold & italics
// much easier to use, if it were even possible with a text area / content editable elements
class TextEditor {
    constructor(
        el = document.body,
        params = TEParams
    ) {
        this.el = el;
        this.caret = document.createElement('div');
        if (params.caret_class)
            this.caret.classList.add(params.caret_class);
        this.line_class  = '.' + (params.line_class || TEParams.line_class);
        this.blink_class = params.blink_class || TEParams.blink_class;
        this.lines = [];
        this.blinker = null;
        this.blink_interval = params.blink_interval ?? TEParams.blink_interval;
        this.focus_class = params.focused_class || TEParams.focused_class;
        this.editor_class = '.' + (params.editor_class || TEParams.editor_class);
        this.line_focused = (params.line_focused || TEParams.line_focused);
        this.prev_focus_line = null;
    }

    blink() {
        this.blinker = setInterval(() => {
            this.caret.classList.toggle(this.blink_class);
        }, this.blink_interval);
    }

    get_closest_ln(e) {
        const cy = e.clientY || e.pageY || e.screenY;
        let closest = e.target.closest(this.line_class);
        if (!closest)
            for (const ln of this.lines) {
                const top = ln.getBoundingClientRect().top;
                if (cy >= top) {
                    closest = ln;
                    break;
                }
            }
        if (!closest)
            if (cy < this.lines[this.lines.length - 1]?.getBoundingClientRect().top)
                closest = this.lines[this.lines.length - 1];
            else
                closest = this.lines[0];
        return closest;
    }

    set_curr_line(line) {
        if (line && line !== this.prev_focus_line) {
            for (const ln of this.lines)
                ln.classList.remove(this.line_focused);
            line.classList.add(this.line_focused);
            this.prev_focus_line = line;
        } else if (!line)
            for (const ln of this.lines)
                ln.classList.remove(this.line_focused);
    }

    move_caret(_e) {
        const e       = get_e(_e),
              closest = this.get_closest_ln(e);
        if (closest) {
            const bc = closest.getBoundingClientRect();
            const [ top, left ] = [ bc.top, bc.left ];
            this.caret.style.top = `${top}px`;
            // use set timeout because selection api sucks and, selection does
            // not get registered directly during mousedown
            setTimeout(() => {
                const sel = window.getSelection();
                if (sel) {
                    const node   = sel.anchorNode,
                          offset = sel.anchorOffset;
                    if (node) {
                        let range = document.createRange();
                        range.setStart(node, offset);
                        range.setEnd  (node, offset);
                        this.set_curr_line(node.parentElement?.closest(this.line_class));
                        this.caret.style.left = range.getBoundingClientRect().left + "px";
                    }
                } else {
                    this.caret.style.left = `${left}px`;
                }
            }, 1);
        }
    }

    update_line_height() {
        let line_height =
            window.getComputedStyle(this.el)
                .getPropertyValue('line-height');
        this.caret.style.setProperty('--caret-height', `${parseFloat(line_height) * 0.92}px`);
    }

    focus_events(focused) {
        let display = 'block';
        if (!focused) {
            display = 'none';
            this.set_curr_line(null);
        }
        this.caret.style.display = display;
    }

    toggle_focus(_e) {
        const e = get_e(_e);
        if (e.target.closest(this.editor_class)) {
            this.el.classList.add(this.focus_class);
            this.focus_events(true);
        } else {
            this.el.classList.remove(this.focus_class);
            this.focus_events(false);
        }
    }

    run() {
        this.focus_events(false);
        document.body.append(this.caret);
        this.lines.push(...this.el.querySelectorAll(this.line_class));
        this.lines = this.lines.reverse();
        this.update_line_height();
        this.blink();
        this.el.addEventListener('mousedown', this.move_caret.bind(this));
        document.addEventListener('mousedown', this.toggle_focus.bind(this));
    }
}

const code = document.querySelector('.editor');
const text_ed = new TextEditor(code);
text_ed.run();