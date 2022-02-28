// xml http request polyfill
import "https://deno.land/x/xhr@0.1.1/mod.ts";
// supabase import
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

import init, { random_name } from "../corul-wasm/pkg/corul_wasm.js";
await init();

const status = {
    ok    : 'ok',
    error : 'error'
};

const supabase =
    createClient(
        'https://jtsmmfjbuxpfzsbppjyb.supabase.co',
        Deno.env.get('SB_SR_KEY')
    );

// insert an element.
// if an element with the same value exists, and no name is provided -> that element, with any name will be returned
// if a name and a value is provided, and an element matching both exists -> that element will be returned,
// which will be an exact match, also the timestamp will be updated on both
export async function add(name, value = '') {
    // if it exists, then return the same thing
    let get =
        await supabase
            .from('corul-playground-db')
            .select('*')
            .eq('value', value);
    let match;
    if (!name) {
        // generate a random name of 3 words!
        name = random_name(3);
        match = 'similar';
    }
    else {
        match = 'exact';
        let exact = false;
        for (let i = 0; i < get.data.length; i++)
            if (get.data[i].value === value && get.data[i].name === name) {
                get.data = [get.data[i]];
                exact = true;
            }
        if (!exact)
            match = 'similar';
    }
    if (get.data.length > 0 && !get.error) {
        let data = get.data[0];
        let error = null;
        // this should never error, but whatever
        try {
            let ts = await supabase
                // call the function to update time on the entry
                .rpc('uptimezone', { row_id: data.id });
            ts = ts?.data || ts?.body;
            data.time_stamp = ts;
        } catch (e) {
            console.log("Failed to update timezone: ", e);
            error = e;
        }
        return {
            match,
            error,
            status: status.ok,
            value: data,
        };
    }
    const { data, error } =
        await supabase
            .from('corul-playground-db')
            .insert([{ name, value }]);
    return {
        status : error || !data || data.length === 0 ? status.error : status.ok,
        value  : data?.length > 0 ? data[0] : null,
        error  : error,
    };
}

// get element with the same id
export async function get_id(id) {
    const { data, error } =
        await supabase
            .from('corul-playground-db')
            .select('*')
            .eq('id', id)
    return {
        status : error || !data || data.length === 0 ? status.error : status.ok,
        value  : data?.length > 0 ? data[0] : null,
        error  : error,
    };
}

// get all the elements with matching names
export async function get_nms(name = "") {
    if (!name || name.trim() === "")
        return {
            status : status.error,
            value  : null,
            error  : 'No name provided to search for',
        };
    const { data, error } =
        await supabase
            .from('corul-playground-db')
            .select('*')
            .ilike('name', `%${name.trim()}%`);
    return {
        status : error || !data || data.length === 0 ? status.error : status.ok,
        value  : data?.length > 0 ? data : null,
        error  : error,
    };
}
