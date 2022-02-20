import "https://deno.land/x/xhr@0.1.1/mod.ts";
// import { installGlobals } from "https://deno.land/x/virtualstorage@0.1.0/mod.ts";
// installGlobals();
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js';
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    addDoc,
    documentId
} from 'https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js';
const firebaseConfig = JSON.parse(Deno.env.get("FB_CONFIG"));
const firebaseApp = initializeApp(firebaseConfig, "example");
const db = getFirestore(firebaseApp);

export async function add(document) {
    try {
        try {
            const links = collection(db, 'playground-links');
            const q = query(links, where('document', '==', { value: document.value }));
            const res = await getDocs(q);
            let all = [];
            res.forEach(d => all.push(d.id));
            if (all.length > 0)
                return all[0];
        } catch (e) {
            console.log("Failed to get all matching value, proceeding to add.");
        }
        const links = collection(db, 'playground-links');
        const added = await addDoc(links, {
            document,
            time_stamp: Date.now()
        });
        return added.id;
    } catch (e) {
        console.log('Failed to add to DB:', e);
        return { error: e, data: null };
    }
}

export async function get(id) {
    try {
        const links = collection(db, 'playground-links');
        const q = query(links, where(documentId(), '==', id))
        const res = await getDocs(q);
        let get = { id: null, data: null, error: "not-found" };
        res.forEach(d => get = { id: d.id, data: d.data().document, error: null });
        return get;
    } catch (e) {
        console.log('Failed to get from DB:', e);
        return { error: e, data: null, id: null };
    }
}