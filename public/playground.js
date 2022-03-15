import init, { lex } from './corul_wasm.js';
import * as idb from './indexedDB.js';

import { Notification, UI } from './playground-ui.js';

import {
    current_theme,
    thm_load_err,
    load_default_theme,
    load_theme,
} from './load_theme.js';

import {
    default_input,
    formatted_stringify_JSON,
    locate_cursor_pos,
    decode_unicode,
    encode_unicode,
    load,
    add,
} from './playground-utils.js';

(async () => {

    await init(); // initialize wasm

    const _is_chrome       = !!window["chrome"], // currently unused...
          editor           = document.querySelector('.editor'),
          save_btn         = document.querySelector('.save'),
          run_btn          = document.querySelector('.run'),
          theme_btn        = document.querySelector('.theme'),
          settings_btn     = document.querySelector('.settings'),
          play_name        = document.querySelector('#playground-name'),
          themes           = document.querySelector('.themes'),
          theme_btns       = document.querySelector('.theme-selector .btns'),
          theme_modal      = document.querySelector('.theme-modal'),
          theme_search     = document.querySelector('.theme-selector .theme-search'),
          download_thm     = document.querySelector('.btns .btn.download'),
          upload_thm       = document.querySelector('.btns .btn.upload'),
          main             = document.querySelector('.main');

    let   theme_opts       = document.querySelectorAll('.themes .theme-opt');


    const max_recommended_encoded_len = 2000,
          thm_regex                   = /[\[\]()*!#$%^+={}|\\"'<>,/:;?@& ]/g;

    let waiting_for_link = false,
        custom_theme_key = null;

    const ui     = new UI(),
          notifs = new Notification(ui);

    await ui.start();

    let theme = await idb.getItem('theme');
    if (theme) {
        try {
            let is_custom = idb.toBool(await idb.getItem('custom-theme'));
            if (is_custom) {
                let contents = idb.toJSON(await idb.getItem(theme));
                await load_theme(contents);
            } else
                await load_theme(theme);
        } catch (e) {
            console.log('Failed to load custom theme! Error:', e);
            await load_default_theme();
        }
    }
    else
        await load_default_theme();
    let previous_theme = current_theme;

    // remove loader screen here, i.e. slide it up then remove it.
    const load_screen = document.querySelector('.load-screen');
    load_screen.classList.add('remove');

    // disgusting way to allow CSS animations to run, before removing element
    setTimeout(() => load_screen.remove(), 1000);

    // lex, and highlight, just a wrapper for the `lex` function from WASM
    const colorize = input => lex(input);

    // load contents of the editor
    const load_default = async () => {
        let text = await idb.getItem('editor-content');
        if (text)
            editor.innerHTML = colorize(text);
        else
            editor.innerHTML = colorize(default_input);
    }

    const params = new URLSearchParams(window.location.search);
    const id  = params.get('i'),
          b64 = params.get('b');

    if (b64) {
        try {
            const contents = decode_unicode(b64.replace(/ /g, '+'));
            editor.innerHTML = colorize(contents);
            notifs.set_type('n-success');
            notifs.send('Loaded contents in URL successfully!');
        } catch (e) {
            if (e) {
                console.error("Failed to convert URL to snippet:", e);
                notifs.set_type('n-err');
                notifs.send(`Failed to convert URL to snippet! The given URLs format is invalid!`);
            }
            await load_default();
        }
    } else if (id) {
        try {
            const type = params.get('t');
            if (!type) throw "Expected a database type in URL. Please ensure you entered the URL in correctly.";
            const then = Date.now();
            const res = await load(id, type);
            // should be true always if no errors occur during load, but still
            if (res?.value)
                editor.innerHTML = colorize(res.value);
            if (res?.name)
                play_name.value = res.name;
            notifs.set_type('n-success');
            notifs.send(`Loaded content successfully in ${ Date.now() - then }ms!`);
        } catch (e) {
            if (e) {
                notifs.set_type('n-err');
                notifs.send(`Failed to load content! ${ e }`);
            }
            await load_default();
        }
    } else await load_default();
    editor.contentEditable = true;

    // check for errors when loading of a theme occurred and notify the user about it
    const check_load_err = () => {
        if (thm_load_err) {
            notifs.set_type('n-err');
            switch (thm_load_err.error) {
                case 'no-name':
                    notifs.send('The theme that\'s currently selected has no name!');
                    break;
                case 'no-type':
                    notifs.send('The theme that\'s currently selected has no type [only light or dark accepted]!');
                    break;
                case 'no-author':
                    notifs.send('The theme that\'s currently selected has no author!');
                    break;
                default:
                    notifs.send(`The theme that\'s currently selected has no style for the property: '${thm_load_err.value}'!`);
                    break;
            }
        }
    }

    check_load_err();

    const input = _ => {
        const sel = window.getSelection();
        const rng = sel.getRangeAt(0);
        rng.setStart(editor, 0);
        // get the current position of the cursor (absolute to editor)
        const len = rng.toString().length
        let   tc  = editor.textContent ?? editor.innerText;
        editor.innerHTML =
            colorize(tc)
            // fixes bug in chromium (wants 2 '\n's at the end of input for 1 '\n')
            // and maybe firefox has the same issue too?...
            + (tc.slice(-1) !== '\n' ? '\n' : '');
        // restore the cursor's position, i.e. find which element and where the cursor must be put
        let { node, position } = locate_cursor_pos(editor, len);
        let range              = document.createRange();
        sel.removeAllRanges();
        range.setStart(node, position);
        range.setEnd(node, position);
        sel.addRange(range);
    }

    editor.addEventListener('input', input);

    editor.addEventListener('keyup', async _ =>
        await idb.setItem('editor-content', editor.textContent)
    );

    editor.addEventListener('paste', e => {
        // some copy-paste text is not formatted correctly due to .textContent reading it incorrectly
        // so the paste event is used as a workaround for this issue
        e.preventDefault();
        let txt =
            (e.clipboardData || window.clipboardData).getData('text')
                .replace(/\r/g, '');
        let sel = window.getSelection();
        let rng = sel.getRangeAt(0);
        sel.deleteFromDocument();
        rng.insertNode(document.createTextNode(txt));
        rng.collapse(false);
        input(e);
    });

    editor.addEventListener('keydown', e => {
        const sel = window.getSelection();
        if (e.key === 'Tab' || (e.keyCode || e.which) === 9) {
            e.preventDefault();
            const rng  = sel.getRangeAt(0),
                  span = document.createElement('span');
            span.appendChild(document.createTextNode('\t'));
            rng.deleteContents();
            rng.insertNode(span);
            rng.collapse(false);
        }

        // modified from SO answer: https://stackoverflow.com/a/20398132
        if (e.key === 'Enter' || (e.keyCode || e.which) === 13) {
            e.preventDefault();
            const rng = sel.getRangeAt(0),
                  df  = document.createDocumentFragment();
            df.appendChild(document.createTextNode('\n'));
            rng.deleteContents();
            rng.insertNode(df);
            rng.collapse(false);
            input(e); // cursor sometimes bounces when event is not triggered here
            // tried to fix no-scroll when enter key is pressed :(, it was bad.
            // // partially fixes no scroll when enter key is pressed.
            // // it stops working after a lot of new lines, idk why.
            // const range = window.getSelection().getRangeAt(0);
            // const br    = range.getBoundingClientRect();
            // editor.scrollTo(br.x, br.y);
        }
    });

    save_btn.addEventListener('click', async _ => {
        const copy_link = (el, link) => {
            el?.addEventListener('click', async _ => {
                try {
                    await navigator.clipboard.writeText(link);
                    notifs.set_type('n-success');
                    notifs.send('Successfully copied link to clipboard!');
                } catch (e) {
                    notifs.set_type('n-err');
                    notifs.send(
                        'Failed to copy link to clipboard! Please try again, or enable sufficient permissions.'
                    );
                    console.error('Failed to add to clipboard! Error', e);
                }
            });
        }
        if (document.querySelector('#url')?.checked) {
            if (editor.textContent.length > max_recommended_encoded_len) {
                notifs.set_type('n-warn');
                notifs.send(
                    `Storing more than ${ max_recommended_encoded_len } characters of code, encoded is not recommended. Please use the database to store the data instead.`
                );
            }
            let gen_url = encode_unicode(editor.textContent);
            let link = `${ window.location.pathname }?b=${ gen_url }`;
            window.history.replaceState(null, null, link);
            let abs_link =
                `${ window.location.protocol }//${ window.location.hostname }${ window.location.port ? ':' + window.location.port : '' }` + link;
            notifs.set_type('n-info');
            let el;
            if (abs_link.length < 100)
                el = notifs.send(`The link for this snippet is: ${ abs_link }. Click to copy`);
            else
                el = notifs.send(`The link for this snippet is too long to display. Click to copy the link`);
            copy_link(el, abs_link);
            return;
        }
        if (waiting_for_link) {
            notifs.set_type('n-info');
            notifs.send('Whoa there! Wait up! Your link is getting prepared...');
            return;
        }

        // only require FB because we know URL isnt checked.
        const type =
            document.querySelector('#fb-db')?.checked
                ? 'fb' : 'sb';

        waiting_for_link = true;
        let res = null;
        try {
            res = await add(editor.textContent, play_name.value, type);
            if (res?.name)
                play_name.value = res.name;
            waiting_for_link = false;
        } catch (e) {
            waiting_for_link = false;
            notifs.set_type('n-err');
            notifs.send(`Failed to add to database! ${e}`);
            return;
        }
        let link = `${ window.location.pathname }?i=${ res.id }&t=${ type }`;
        window.history.replaceState(null, null, link);
        let abs_link =
            `${ window.location.protocol }//${ window.location.hostname }${ window.location.port ? ':' + window.location.port : '' }` + link;

        notifs.set_type('n-info');
        const span = document.createElement('span');
        let similar = 'The link for this snippet is: ';
        if (res?.match === 'exact')
            similar = 'An exact entry already exists in the database, for which the link is: ';
        else if (res?.match === 'similar')
            similar =
                'A similar entry (with a different name and same value) already exists in the database, for which the link is: ';
        span.innerHTML =
            `${ similar }<span class='artificial-link'>${ abs_link }</span>. All entries expire after 30 days. Click to copy`;
        copy_link(notifs.send(span), abs_link);
    });

    run_btn.addEventListener('click', _ => {
        notifs.set_type('n-warn');
        notifs.send(
            'Running the code does not do anything currently, since the language is not in a ready state.'
        );
    });

    // Blur, or un-blur the background when opening and closing the theme modal
    const set_theme_modal = (open) => {
        if (open) {
            theme_modal.style.display = 'flex';
            theme_modal.classList.remove('hidden');
            main.classList.add('blurred');
        } else {
            theme_modal.classList.add('hidden');
            main.classList.remove('blurred');
        }
    }

    theme_btn.addEventListener('click', _ => set_theme_modal(true));

    settings_btn.addEventListener('click', _ => {
        notifs.set_type('n-warn');
        notifs.send(
            'The settings pane is not currently implemented and will be implemented in future releases.'
        );
    });

    theme_search.addEventListener('input', _ => {
        const values =
            theme_search
                .value
                .split(' ')
                .filter(v => v.length > 0);
        for(const opt of theme_opts) {
            const label =
                opt.querySelector('label')
                    .textContent
                    .toLowerCase();
            let included = false,
                valued   = false;
            for (const value of values) {
                valued = true;
                if (label.includes(value)) {
                    included = true;
                    break;
                }
            }
            if (!included && valued)
                opt.style.display = 'none';
            else
                opt.style.display = 'flex';
        }
    });

    async function theme_select() {
        const thm     = this.parentElement,
              file    = thm.getAttribute('data-file'),
              idb_key = thm.getAttribute('data-idb');

        if (!file && !idb_key) return;
        if (file)
            await load_theme(file);
        else {
            try {
                let json = idb.toJSON(await idb.getItem(idb_key));
                await load_theme(json);
                custom_theme_key = idb_key;
            } catch (e) {
                notifs.set_type('n-err');
                notifs.send('Failed to load theme! ' + e);
                console.log('Failed to load theme! Error', e);
            }
        }
        check_load_err();
    }

    const create_theme_opt = (
        thm_name  ,
        thm_author,
        thm_type  ,
        thm_file  ,
        idb_key = null
    ) => {
        const name_under   = thm_name  .replace(thm_regex, '_'),
              author_under = thm_author.replace(thm_regex, '_'),
              type_under   = thm_type  .replace(thm_regex, '_'),
              theme_opt    = document.createElement('div'),
              radio        = document.createElement('input'),
              label        = document.createElement('label'),
              name         = document.createElement('span'),
              type         = document.createElement('span'),
              author       = document.createElement('span');

        const input_id = `${name_under}-${author_under}-${type_under}`;

        if (document.querySelector('#' + input_id)) return;

        if (thm_file)
            theme_opt.setAttribute('data-file', thm_file);
        else if (idb_key)
            theme_opt.setAttribute('data-idb', idb_key);

        theme_opt.classList.add('theme-opt');

        radio.type = 'radio';
        radio.name = 'theme-selector';
        radio.id   = input_id;

        if (current_theme?.url === thm_file)
            radio.checked = true;

        theme_opt.append(radio);

        name  .textContent = thm_name;
        type  .textContent = thm_type;
        author.textContent = thm_author;

        name  .classList.add('name');
        type  .classList.add('type');
        author.classList.add('author');

        label.htmlFor = input_id;

        label.append(name);
        label.append(type);
        label.append(author);
        theme_opt.append(label);

        radio.addEventListener('input', theme_select.bind(radio));

        themes.append(theme_opt);
    };

    // fetch all available themes from server
    let theme_items;
    try {
        const _thm_fetch = await fetch('/themes/.theme-map.generated.json', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        const fetched_themes = await _thm_fetch.json();

        theme_items = fetched_themes.items;
        for(const item of theme_items)
            create_theme_opt(item.name, item.author, item.type, item.file);

        theme_opts = document.querySelectorAll('.themes .theme-opt');
    } catch (e) {
        notifs.set_type('n-err');
        notifs.send('Failed to load themes! ' + e);
        console.log('Failed to load themes! Reason:', e);
    }

    try {
        let list = idb.toJSON(await idb.getItem('theme-key-list'));
        if (list)
            for(const item of list) {
                const json = idb.toJSON(await idb.getItem(item));
                create_theme_opt(json.name, json.author, json.type, null, item);
            }

        theme_opts = document.querySelectorAll('.themes .theme-opt');
    } catch (e) {
        console.log('Failed to load custom themes! Error', e);
    }

    theme_modal.addEventListener('click', e => {
        if (!e.target.closest('.theme-selector'))
            set_theme_modal(false);
    });

    const thm_ok     = theme_btns.querySelector('.ok');
    const thm_cancel = theme_btns.querySelector('.cancel');

    const find_theme = url => {
        for (const opt of theme_opts) {
            const input = opt.querySelector('input');
            if (opt.hasAttribute('data-file'))
                input.checked =
                    opt.getAttribute('data-file') === url;
            else if (opt.hasAttribute('data-idb'))
                input.checked =
                    opt.getAttribute('data-idb') === url;
        }
    }

    const close_on_error = async () => {
        const type = await load_default_theme();
        set_theme_modal(false);
        await find_theme(type);
        custom_theme_key = null;
    }

    const close_thm_modal = async _ => {
        if (thm_load_err) {
            await close_on_error();
            return;
        }
        set_theme_modal(false);
        find_theme(previous_theme?.url ?? custom_theme_key);
        if (
            previous_theme?.name   === current_theme?.name   &&
            previous_theme?.author === current_theme?.author &&
            previous_theme?.type   === current_theme?.type
        ) return;
        await load_theme(previous_theme?.value);
        check_load_err();
    };

    thm_ok.addEventListener('click', async _ => {
        if (thm_load_err) {
            await close_on_error();
            return;
        }
        previous_theme = current_theme;
        let selected =
            document.querySelector('input[type=radio][name=theme-selector]:checked');
        if (selected?.parentElement?.hasAttribute('data-file')) {
            await idb.setItem('custom-theme', false);
            await idb.setItem('theme', current_theme.url);
        } else if (custom_theme_key) {
            await idb.setItem('custom-theme', true);
            await idb.setItem('theme', custom_theme_key);
        }
        set_theme_modal(false);
    });

    thm_cancel.addEventListener('click', close_thm_modal);

    document.addEventListener('keydown', async e => {
        if (e.key === 'Escape' || (e.keyCode || e.which) === 27)
            await close_thm_modal();
    });

    download_thm.addEventListener('click', async _ => {
        let theme       = current_theme.value;
        theme.author    = '[add your name or nickname here]';
        theme.type      = '[add the type of your theme here (light or dark only)]';
        theme.name      = '[add the name of your theme here]';
        const a         = document.createElement('a');
        a.href          = "data:text/json;charset=utf-8," + encodeURIComponent(formatted_stringify_JSON(theme));
        a.download      =
            `theme-${current_theme.author.replace(thm_regex, '-')}-${current_theme.name.replace(thm_regex, '-')}.json`;
        a.hidden        = true;
        a.style.display = 'none';
        document.body.append(a);
        a.click();
        a.remove();
    });

    upload_thm.addEventListener('click', async e => {
        const input         = document.createElement('input');
        input.type          = 'file';
        input.accept        = '*/json';
        input.hidden        = true;
        input.style.display = 'none';
        document.body.append(input);
        input.click();

        input.addEventListener('input', _ => {
            const fr = new FileReader();
            fr.readAsText(input.files[0]);

            fr.onload = async e => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    // check for the constraints of the uploaded theme
                    if (parsed?.name?.length > 40)
                        throw 'Theme name is too long!';
                    if (parsed?.author?.length > 30)
                        throw 'Author\'s name is too long!';
                    if (!['light', 'dark'].includes(parsed?.type))
                        throw 'The type of theme specified is invalid (only light or dark)!';

                    // load the theme if no constraints were triggered
                    await load_theme(parsed);
                    check_load_err();

                    // create a theme option, and create a theme-key for the newly uploaded theme
                    const idb_key = `theme-${parsed.name}-${parsed.author}-${parsed.type}`;
                    create_theme_opt(parsed.name, parsed.author, parsed.type, null, idb_key);
                    await idb.setItem(idb_key, parsed);

                    try {
                        let key_list = idb.toJSON(await idb.getItem('theme-key-list'));

                        if (!key_list)
                            key_list = [];

                        if (!key_list.includes(idb_key))
                            key_list.push(idb_key);

                        await idb.setItem('theme-key-list', key_list);
                        custom_theme_key = idb_key;
                    } catch (e) {
                        notifs.set_type('n-err');
                        notifs.send('Failed to add custom theme! ' + e);
                        console.log('Error adding to custom theme list! Error:', e);
                    }

                    theme_opts = document.querySelectorAll('.themes .theme-opt');
                } catch (e) {
                    notifs.set_type('n-err');
                    notifs.send('Failed to add custom theme! ' + e);
                    console.log('Error loading file:', e);
                }
            }
        });
    });
})();