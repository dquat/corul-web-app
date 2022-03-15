// XMLHttpRequest polyfill
import "https://deno.land/x/xhr@0.1.2/mod.ts";

// V9.6.8 does not seem to work right now...
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js';
import {
    child,
    equalTo,
    get as get_item,
    getDatabase,
    orderByChild,
    query,
    ref,
    set,
    endAt,
    onValue,
    update
} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-database.js';

import { validate } from 'https://deno.land/std@0.129.0/uuid/mod.ts';

import init, { random_name } from "../corul-wasm/pkg/corul_wasm.js";

await init();

// initialize firebase
const config = JSON.parse(Deno.env.get("FB_CONFIG")),
      app    = initializeApp(config, "example"),
      db     = getDatabase(app);

const ret = (error, value, status) =>
    ({ error, value, status });

const status = {
    ok    : 'ok',
    error : 'error'
};

export async function add(name, value = '') {
    let got = query(ref(db), orderByChild('value'), equalTo(value));
    let existing_value;
    try {
        existing_value = await get_item(got);
    } catch (e) {
        console.error('Failed to get existing value from database! Error:', e);
        return ret(e, null, status.error);
    }
    if (!name)
        // generate a random name of 3 words!
        name = random_name(3).substring(0, 50);

    if (existing_value.exists()) {
        try {
            const first = Object.entries(existing_value.val())[0][1]; // can this throw an error?
            first.time_stamp = Date.now(); // update timestamp
            await set(ref(db, `/${first.id}`), first); // this can throw an error
            let match;
            if (first?.name !== name) match = 'similar';
            else                      match = 'exact';
            return { match, error: null, status: status.ok, value: first };
        } catch (e) {
            console.error('Failed to update existing value from database! Error:', e);
            return ret(e, null, status.error);
        }
    }

    const uuid = crypto.randomUUID();
    let data = {
        value,
        name ,
        time_stamp : Date.now(),
        id         : uuid
    };

    try {
        await set(ref(db, `/${uuid}`), data);
        return ret(null, data, status.ok);
    } catch (e) {
        console.error('Failed to set value to database! Error:', e);
        return ret(e, null, status.error);
    }
}

export async function get_id(id) {
    if (!validate(id))
        return ret({ code: '22P02' }, null, status.error);
    try {
        const snapshot = await get_item(child(ref(db), `/${id}`));
        if (snapshot.exists())
            return ret(null, snapshot.val(), status.ok);
        else
            return ret(null, null, status.error);
    } catch (e) {
        return ret(e, null, status.error);
    }
}

// Check for outdated data and delete it on a regular basis (every 24 hrs)
(async function delete_outdated() {
    const db_ref = ref(db),
          now    = Date.now(),
          month  = 30 /* days */ * 24 /* hrs */ * 60 /* min */ * 60 /* sec */ * 1000 /* ms */,
          q      = query(db_ref, orderByChild('time_stamp'), endAt(now - month));
    try {
        onValue(q, async (ss) => {
            const updates = { };
            ss.forEach(e => {
                updates[e.key] = null;
                const val = e.val();
                console.log(
`Removing -> 
    name         : ${ val?.name }
    value        : ${ (val?.value ?? "").substring(0, 100) } (Trimmed to 100 chars if too long) 
    id           : ${ val?.id }
    time stamp   : ${ val?.time_stamp } -> ${ new Date(val?.time_stamp ?? 0).toISOString() }
    max duration : ${ month }ms (Decided by server)
`);
            });
            update(db_ref, updates);
        });
    } catch (e) {
        console.error('Failed checking / deleting values from database that is too old! Error:', e);
    }
    const duration = 24 * 60 * 60 * 1000 /* 24 hrs */ - (Date.now() - now) /* normalize function duration fluctuation */;
    setTimeout(delete_outdated,  duration > 0 ? duration : 0);
})();