// simple class for dealing with undefined values in JSON, by throwing an error
class JsonStyle {
    constructor(json, de) {
        this.json = json;
        this.de   = de;
        if (!this.json.type)
            throw { error: 'no-type' }
        if (!this.json.name)
            throw { error: 'no-name' }
        if (!this.json.author)
            throw { error: 'no-author' }
    }
    _get(prop) {
        const p = this.json["theme"][prop]
        if (p) return p;
        else throw { error: 'undefined-value', value: prop }
    }
    set(JSON_prop_name, CSS_prop_name) {
        const get = this._get(JSON_prop_name);
        this
            .de
            .style
            .setProperty(`--thm-${ CSS_prop_name ?? JSON_prop_name }`, get);
    }
}


export function apply_theme(json) {
    const style = new JsonStyle(json, document.documentElement);
    style.set("main-color");
    style.set("code-color");
    style.set("caret-color");
    style.set("shadow-color");
    style.set("border-color");

    style.set("button-color"         , "btn-color");
    style.set("button-hover-color"   , "btn-hvr-color");
    style.set("button-press-color"   , "btn-clk-color");
    style.set("button-disabled-color", "btn-dis-color");

    style.set("editor-and-terminal-background", "ed-term-bg");
    style.set("default-font-color"            , "fnt-color");
    style.set("selection-background-color"    , "sel-bg-color");

    style.set("settings-cog-button-color" , "setting-color");
    style.set("run-button-color"          , "run-color");
    style.set("save-button-color"         , "save-color");
    style.set("theme-button-color"        , "theme-color");
    style.set("layout-button-color"       , "layout-color");
    style.set("input-focused-border-color", "inp-fcs-border");

    style.set("radio-outline-color", "rdo-out-color");
    style.set("radio-selected-color", "rdo-sel-color");

    style.set("alert-button-color"      , "alert-btn-clr");
    style.set("alert-button-hover-color", "alert-btn-hvr-clr");
    style.set("alert-button-press-color", "alert-btn-clk-clr");

    style.set("notification-color"               , "notif-clr");
    style.set("notification-highlight-color"     , "notif-hlt-clr");
    style.set("notification-timestamp-color"     , "notif-tms");
    style.set("notification-timestamp-text-color", "notif-tms-tc");
    style.set("notification-type-info-color"     , "notif-info");
    style.set("notification-type-success-color"  , "notif-success");
    style.set("notification-type-warn-color"     , "notif-warn");
    style.set("notification-type-error-color"    , "notif-error");

    style.set("modal-color");
    style.set("modal-tag-color");
    style.set("modal-text-color"               , "modal-txt-color");
    style.set("modal-filter"                   , "modal-bd-filter");
    style.set("modal-selected-color"           , "modal-sltd-color");
    style.set("modal-ok-button-color"          , "modal-ok-btn-color");
    style.set("modal-ok-button-hover-color"    , "modal-ok-btn-hvr-color");
    style.set("modal-ok-button-press-color"    , "modal-ok-btn-clk-color");
    style.set("modal-cancel-button-color"      , "modal-cancel-btn-color");
    style.set("modal-cancel-button-hover-color", "modal-cancel-btn-hvr-color");
    style.set("modal-cancel-button-press-color", "modal-cancel-btn-clk-color");

    style.set("keywords-style"      , "kwds-style");
    style.set("keywords-font-weight", "kwds-weight");
    style.set("keywords-color"      , "kwds-color");
    style.set("keywords-decoration" , "kwds-dec");

    style.set("built-in-types-style"      , "blt-in-style");
    style.set("built-in-types-font-weight", "blt-in-weight");
    style.set("built-in-types-color"      , "blt-in-color");
    style.set("built-in-types-decoration" , "blt-in-dec");

    style.set("string-style"      , "str-style");
    style.set("string-font-weight", "str-weight");
    style.set("string-color"      , "str-color");
    style.set("string-decoration" , "str-dec");

    style.set("character-style"      , "chr-style");
    style.set("character-font-weight", "chr-weight");
    style.set("character-color"      , "chr-color");
    style.set("character-decoration" , "chr-dec");

    style.set("number-style"      , "num-style");
    style.set("number-font-weight", "num-weight");
    style.set("number-color"      , "num-color");
    style.set("number-decoration" , "num-dec");

    style.set("operator-style"      , "oper-style");
    style.set("operator-font-weight", "oper-weight");
    style.set("operator-color"      , "oper-color");
    style.set("operator-decoration" , "oper-dec");

    style.set("function-style"      , "fn-style");
    style.set("function-font-weight", "fn-weight");
    style.set("function-color"      , "fn-color");
    style.set("function-decoration" , "fn-dec");

    style.set("variable-style"      , "var-style");
    style.set("variable-font-weight", "var-weight");
    style.set("variable-color"      , "var-color");
    style.set("variable-decoration" , "var-dec");

    style.set("constant-style"      , "const-style");
    style.set("constant-font-weight", "const-weight");
    style.set("constant-color"      , "const-color");
    style.set("constant-decoration" , "const-dec");

    style.set("identifier-style"      , "ident-style");
    style.set("identifier-font-weight", "ident-weight");
    style.set("identifier-color"      , "ident-color");
    style.set("identifier-decoration" , "ident-dec");

    style.set("comment-style"      , "com-style");
    style.set("comment-font-weight", "com-weight");
    style.set("comment-color"      , "com-color");
    style.set("comment-decoration" , "com-dec");

    if (json.type === 'light') {
        document.documentElement.style.colorScheme = 'light';
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
    else {
        document.documentElement.style.colorScheme = 'dark';
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    }

    console.log(`Theme '${ json.name }' loaded!`);
}

export let current_theme  = null;
export let thm_load_err   = null;

export function set_curr_theme(json, url) {
    current_theme = { name: json.name, author: json.author, type: json.type, url, value: json };
}

export async function load_theme(url) {
    if (url instanceof Object)
        try {
            apply_theme(url);
            set_curr_theme(url, null);
            thm_load_err = null;
        } catch (e) {
            thm_load_err = e;
            console.error("Error occurred while loading custom theme:", e);
        }
    else
        try {
            const res = await fetch(`/themes/${url}`);
            const json = await res.json();
            apply_theme(json);
            set_curr_theme(json, url);
            thm_load_err = null;
        } catch (e) {
            thm_load_err = e;
            console.error("Error occurred while fetching theme:", e);
        }
}

export async function load_default_theme() {
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (scheme.matches)
        await load_theme('gruvbox-dark.json');
    else
        await load_theme('gruvbox-light.json');
    return `gruvbox-${scheme.matches ? 'dark' : 'light'}.json`;
}