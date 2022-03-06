// from https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
// and https://javascript.info/indexeddb

// A indexedDB wrapper that has functions like localstorage, will use localstorage if indexedDB does not work

let db, inited = false;
async function init() {
    return new Promise(function (resolve, reject) {
        if (!window.indexedDB) {
            alert('Your browser doesn\'t support a stable version of IndexedDB. Some features will not be available. Please use a newer browser that supports the IndexedDB API.');
            resolve('unsupported');
        } else {
            let req = indexedDB.open('playground_db', 1);

            req.onerror = e => {
                console.error('Failed to connect to IndexedDB. Error code:', e.target.errorCode ?? req.result);
                inited = true; // we're gonna use localstorage
                db = null;
                resolve(e.target.errorCode);
            };

            req.onsuccess = e => {
                db = e.target.result ?? req.result;
                inited = true;
                // resolve only when DB is finally open
                resolve(db);
            };

            req.onupgradeneeded = e => {
                db = e.target.result ?? req.result;
                db.createObjectStore('playground_store');
                // if resolved here, errors occur (version change error)
            };

            req.onblocked = _ => {
                alert('Database is outdated on other open tabs. Please close them before proceeding, and reload this page.');
                reject('blocked');
            };
        }
    });
}

export async function setItem(item, value) {
    return new Promise(async function setItem(resolve, reject) {
        if (!inited) try { db = await init(); } catch { }
        if (!db) {
            if (value instanceof Object)
                value = JSON.stringify(value);
            localStorage.setItem(item, value);
            resolve("localstorage");
            return;
        }
        if (db.current_transaction) reject('transaction');
        const transaction = db.transaction('playground_store', 'readwrite');
        transaction.oncomplete = () => resolve(true);
        const store = transaction.objectStore('playground_store');
        const req   = store.put(value, item);
        req.onsuccess = _ => resolve(true);
        req.onerror   = e => {
            console.error(`Failed to add key ${item} with value ${value} to database. Error code: ${e.target.errorCode}`);
            reject(e.target.errorCode);
        }
    });
}

export async function getItem(item) {
    return new Promise(async function setItem(resolve, reject) {
        if (!inited) try { db = await init(); } catch { }
        if (!db) {
            resolve(localStorage.getItem(item));
            return;
        }
        if (db.current_transaction) reject('transaction');
        const transaction = db.transaction('playground_store', 'readonly', { durability: 'relaxed' });
        transaction.oncomplete = () => resolve(null);
        const store = transaction.objectStore('playground_store');
        const req   = store.get(item);
        req.onsuccess = e => resolve(e.target.result ?? req.result);
        req.onerror   = e => {
            console.error(`Failed to get key ${item} from database. Error code: ${e.target.errorCode}`);
            reject(e.target.errorCode);
        }
    });
}

export async function clear() {
    return new Promise(async function setItem(resolve, reject) {
        if (!inited) try { db = await init(); } catch { }
        if (!db) {
            localStorage.clear();
            resolve(true);
            return;
        }
        if (db.current_transaction) reject('transaction');
        const transaction = db.transaction('playground_store', 'readwrite');
        transaction.oncomplete = () => resolve(true);
        const store = transaction.objectStore('playground_store');
        const req   = store.clear();
        req.onsuccess = _ => resolve(true);
        req.onerror   = e => {
            console.error(`Failed to clear all items from the database. Error code: ${e.target.errorCode}`);
            reject(e.target.errorCode);
        }
    });
}

export function toJSON(idb_item) {
    if (typeof idb_item !== 'object')
        return JSON.parse(idb_item);
    return idb_item;
}

export function toBool(idb_item) {
    if (typeof idb_item !== "boolean")
        return JSON.parse(idb_item);
    return idb_item;
}