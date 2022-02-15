// last 2 are depreciated, but if e is null, they can be used instead
const get_e = e => e || window.event || event;

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
        params = {
            caret_class    : 'caret',
            line_class     : 'code-line',
            blink_interval : 500,
            blink_class    : 'caret-blink',
        }
    ) {
        this.el = el;
        this.caret = document.createElement('div');
        if (params.caret_class)
            this.caret.classList.add(params.caret_class);
        this.line_class  = '.' + (params.line_class || 'code-line');
        this.blink_class = params.blink_class || 'caret-blink';
        this.lines = [];
        this.blinker = null;
        this.blink_interval = params.blink_interval ?? 500;
    }

    blink() {
        this.blinker = setInterval(() => {

            this.caret.classList.toggle(this.blink_class);
        }, this.blink_interval);
    }

    det_closest_ln(_e) {
        const e = get_e(_e);
        const cy = e.clientY || e.pageY || e.screenY;
        let closest = e.target.closest(this.line_class);
        if (!closest)
            for (const ln of this.lines) {
                const top = ln.offsetTop;
                if (cy >= top) {
                    closest = ln;
                    break;
                }
            }
        if (!closest)
            if (cy < this.lines[this.lines.length - 1]?.offsetTop)
                closest = this.lines[this.lines.length - 1];
            else
                closest = this.lines[0];
        if (closest) {
            const [ top, left ] = [ closest.offsetTop, closest.offsetLeft ];
            this.caret.style.top  = `${top }px`;
            this.caret.style.left = `${left}px`;
        }
    }

    update_line_height() {
        let line_height =
            window.getComputedStyle(this.el)
                .getPropertyValue('line-height');
        this.el.style.setProperty('--caret-height', `${parseFloat(line_height) * 0.9}px`);
    }

    run() {
        this.el.append(this.caret);
        this.lines.push(...this.el.querySelectorAll(this.line_class));
        this.lines = this.lines.reverse();
        this.update_line_height();
        this.blink();
        document.addEventListener('mousedown', this.det_closest_ln.bind(this));
    }
}

const code = document.querySelector('.editor');
const text_ed = new TextEditor(code);
text_ed.run();