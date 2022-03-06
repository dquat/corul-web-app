const tb          = document.querySelector('.tool-bar'),
      main        = document.querySelector('.main'),
      footer      = document.querySelector('.footer-bar'),
      opener      = document.querySelector('.opener'),
      resize_bar  = document.querySelector('.bar'),
      tabs        = opener ?.querySelectorAll('.tab'),
      tb_btns     = tb     ?.querySelectorAll('.btn'),
      layout      = tb     ?.querySelector('.layout');
const footer_children = [];
// generate relevant tab buttons and append them to the footer / sidebar
if (tabs && tabs.length > 0) {
    let open = false;
    for (const [idx, tab] of tabs.entries()) {
        const visible  = tab.getAttribute('visible'),
              tab_name = tab.getAttribute('tab-name'),
              btn      = document.createElement('div');

        btn.id = tab.classList[0];
        btn.classList.add('btn');

        if (visible && !open) {
            btn.classList.add('selected');
            open = true; // don't hide all tabs, cuz there's one that's open!
        } else
            tab.classList.add('hide');

        if (tab_name)
            btn.textContent = tab_name;
        else
            btn.textContent = `Tab ${idx}`;

        footer_children.push(btn);
    }
    if (!open) // hide all tabs if none are open
        main.classList.add('hide');
    footer.append(...footer_children);
}


class UI {

    static MIN_WIDTH  = 400;
    static MIN_HEIGHT = 400;

    constructor() {}

    reset_tab(/* off = true */) {
        const [w, h] = [
            opener.style.width,
            opener.style.height,
        ];
        // if (off) {
            main.classList.remove('auto-tab');
            // if (w) this.prev_width  = parseFloat(w);
            // if (h) this.prev_height = parseFloat(h);
            opener.style.width  = null;
            opener.style.height = null;
            // this part will be used later when we make resizing tabs more powerful
        // } else if (this.prev_width || this.prev_height) {
        //     main.classList.add('auto-tab');
        //     if (main.classList.contains('horizontal')) {
        //         opener.style.width = this.prev_width + 'px';
        //         opener.style.height = null;
        //     }
        //     if (main.classList.contains('vertical')) {
        //         opener.style.height = this.prev_height + 'px';
        //         opener.style.width = null;
        //     }
        // }
    }

    move_to_tab({ id, el }) {
        const sel_tab =
            el ? opener.querySelector('.' + el.id) : id ? opener.querySelector('.' + id) : null;
        if (sel_tab !== null) {
            main.classList.remove('hide');
            const tab = footer.querySelector('#' + sel_tab.classList[0]);
            for (const tab of tabs)
                if (tab !== sel_tab)
                    tab.classList.add('hide');
            for (const footer_btn of footer_children)
                if (footer_btn !== tab)
                    footer_btn.classList.remove('selected');
            sel_tab.classList.remove('hide');
            tab    .classList.add('selected');
            // this.reset_tab(false);
        } else {
            this.reset_tab();
            for (const footer_btn of footer_children)
                footer_btn.classList.remove('selected');
            main.classList.add('hide');
        }
    }

    footer_btn_click(el) {
        if (el.classList.contains('selected'))
            this.move_to_tab({ /* null, so hide all tabs */ });
        else
            this.move_to_tab({ el });
    }

    // I'm not using media queries only because, doing it in JS offers more flexibility.
    // To figure out weather a media query was triggered is not really that ideal...
    size_check() {
        const cl = this.mode ?? 'horizontal';
        const reset = (_this) => {
            _this.window_small = false;
            if (cl === 'horizontal') layout.classList.remove('flip');
            else layout.classList.add('flip');
            layout.classList.remove('disabled'); // disabled = false not working??
        }
        if (window.innerHeight <= UI.MIN_HEIGHT || window.innerWidth <= UI.MIN_WIDTH) {
            this.window_small = true;
            this.reset_tab();
            if (window.innerWidth <= UI.MIN_WIDTH) {
                main.classList.remove('horizontal');
                main.classList.add('vertical');
                layout.classList.add('flip');
            } else {
                main.classList.remove('vertical');
                main.classList.add('horizontal');
                layout.classList.remove('flip');
            }
            layout.classList.add('disabled'); // disabled = true not working??
        } else if (!main.classList.contains(cl)) {
            main.classList.remove('horizontal', 'vertical');
            main.classList.add(cl);
            reset(this);
        } else reset(this);
    }

    change_layout() {
        if (this.window_small) return;
        this.reset_tab();
        layout.classList.toggle('flip');
        if (layout.classList.contains('flip')) {
            this.mode = 'vertical';
            main.classList.remove('horizontal');
            main.classList.add(this.mode);
        } else {
            this.mode = 'horizontal';
            main.classList.remove('vertical');
            main.classList.add(this.mode);
        }
        localStorage.setItem('layout', this.mode);
    }

    resize_tab(e, type) {
        // when using touch, resizing is sometimes laggy... wierd bug
        const root = document.documentElement;
        const cursor_style =
            resize_bar.style.cursor ||
            window.getComputedStyle(resize_bar).cursor;
        // touch event stuff
        const orig_ev    = e.originalEvent ?? e,
              touches    = orig_ev?.touches || orig_ev?.changedTouches,
              touch      = touches ? touches[0] : null,
              [ cx, cy ] = [
                  touch?.clientX || e.clientX || e.pageX || e.screenX,
                  touch?.clientY || e.clientY || e.pageY || e.screenY,
              ];
        switch (type) {
            case 'down': {
                if(!e.type?.includes('touch')) e.preventDefault();
                root.style.cursor = cursor_style;
                this.resizing = true;
                this.coords = { cx, cy };
            }
            break;
            case 'move': {
                if (this.resizing && this.coords) {
                    if(!e.type?.includes('touch')) e.preventDefault();
                    const [ pcx, pcy ] = [ this.coords.cx, this.coords.cy ]
                    const [ ox, oy ] = [ pcx - cx, pcy - cy ];
                    const opener_cs = window.getComputedStyle(opener);
                    if (main.classList.contains('horizontal')) {
                        opener.style.width =
                            parseFloat(opener_cs.width) + ox + 'px';
                    } else if (main.classList.contains('vertical')) {
                        opener.style.height =
                            parseFloat(opener_cs.height) + oy + 'px';
                    }
                    main.classList.add('auto-tab');
                    this.coords = { cx, cy };
                }
            }
            break;
            case 'end': {
                this.resizing = false;
                root.style.cursor = 'auto';
            }
        }
    }

    start() {
        // First class must always be `horizontal` or `vertical` to work
        this.mode = localStorage.getItem('layout') ?? main.classList[0];
        for (const child of footer_children)
            child.addEventListener('click', this.footer_btn_click.bind(this, child));
        if (layout) // will always be true, for this website, but anyway...
            layout.addEventListener('click', this.change_layout.bind(this));
        this.size_check();
        window.addEventListener('resize', this.size_check.bind(this));
        const t = this;
        resize_bar.addEventListener('dragstart'  , e => e.preventDefault());

        resize_bar.addEventListener('mousedown'  , e => t.resize_tab.call(t, e, 'down'));
        resize_bar.addEventListener('touchstart' , e => t.resize_tab.call(t, e, 'down'),
            { passive: true }); // apparently passive improves performance? (lighthouse)
        // it does seem to remove that "laggy bug" that occurs when using touch to resize the tab

        window.addEventListener('mousemove'      , e => t.resize_tab.call(t, e, 'move'));
        window.addEventListener('touchmove'      , e => t.resize_tab.call(t, e, 'move'),
            { passive: true });

        window.addEventListener('mouseup'        , e => t.resize_tab.call(t, e, 'end'));
        window.addEventListener('touchend'       , e => t.resize_tab.call(t, e, 'end'),
            { passive: true });
        window.addEventListener('touchcancel'    , e => t.resize_tab.call(t, e, 'end'),
            { passive: true });
        window.addEventListener('mouseleave'     , e => t.resize_tab.call(t, e, 'end'));
        window.addEventListener('dragend'        , e => t.resize_tab.call(t, e, 'end'));

        const db  = document.querySelector('#db'),
              url = document.querySelector("#url");

        db.addEventListener('input', _ =>
            localStorage.setItem('db-mode', db.checked.toString())
        );
        url.addEventListener('input', _ =>
            localStorage.setItem('db-mode', (!url.checked).toString())
        );

        if (localStorage.getItem('db-mode') === 'false') {
            db.checked  = false;
            url.checked = true;
        }
    }
}
// this variable can be used in other scripts
const ui = new UI();
ui.start();

// replace characters in playground-name input area
const playground_name_input = document.querySelector('#playground-name');
playground_name_input.addEventListener('input', e => {
    playground_name_input.value =
        playground_name_input.value.replace(/[^\dA-Z\-_]/gi, '');
    playground_name_input.value =
        playground_name_input.value.substring(0, 50 /* Max name length */ );
});

class Notification {
    constructor(
        base_class   ,
        message_class,
        time_class   ,
    ) {
        this._root      =
            opener.querySelector('.notifications') || document.documentElement;
        this._base_cls  = base_class     || 'notification';
        this._msg_cls   = message_class  || 'message';
        this._time_cls  = time_class     || 'time-stamp';
        this._hour24    = false;
        this._type      = null;
        this._root
            .querySelector('.clear-all')
            .addEventListener('click', _ => {
            const children = this._root.querySelectorAll('.notification');
            for (const child of children) child.remove();
            if (!this._root.querySelector('.no-notif-plchldr')) {
                const p = document.createElement('p');
                p.classList.add('no-notif-plchldr');
                p.textContent = 'No new notifications!';
                this._root.append(p);
            }
        });
    }

    set_date_fmt(hour_24_format) {
        this._hour24 = hour_24_format;
    }

    set_type(type) {
        this._type = type;
    }

    _gen_ts() {
        const date    = new Date(),
              hrs     = date.getHours(),
              mins    = date.getMinutes(),
              secs    = date.getSeconds(),
              am_pm   = hrs >= 12 ? ' PM' : ' AM',
              hrs_fmt = `${this._hour24 ? hrs : (hrs > 12 ? hrs - 12 : hrs)}`;
        return `${ hrs_fmt }:${ mins }:${ secs }${ this._hour24 ? '' : am_pm }`;
    }

    send(value = "Unknown message") {

        const q = this._root.querySelector('.no-notif-plchldr');
        if (q) q.remove();

        ui.move_to_tab({ id: this._root.classList[0] });

        const base      = document.createElement("div"),
              text_span = document.createElement("span");

        text_span.append(value);
        base.append(text_span);
        text_span.classList.add(this._msg_cls);
        base     .classList.add(this._base_cls);
        if (this._type)
            base.classList.add(this._type);

        if (this._time_cls) {
            const time_stamp = document.createElement("span");
            time_stamp.textContent = this._gen_ts();
            time_stamp.classList.add(this._time_cls);
            base.append(time_stamp);
        }

        this._root.append(base);
        this._type = null;

        this._root.scrollTo(this._root.scrollLeft, this._root.scrollHeight)
        return base;
    }
}

const notifs = new Notification();