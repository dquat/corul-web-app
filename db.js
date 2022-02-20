
const [ DATA_API_KEY, APP_ID ] = [Deno.env.get("DATA_API_KEY"), Deno.env.get("APP_ID")];

const BASE_URI = `https://data.mongodb-api.com/app/${APP_ID}/endpoint/data/beta/action`;
const DATA_SOURCE = "Corul-playground-cluster";
const DATABASE = "playground-url";
const COLLECTION = "playground-data";
const options = {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "api-key": DATA_API_KEY
    },
    body: "",
    expireAt: new Date()
};

export async function add(document, expire = 30) {
    try {
        const URI = `${BASE_URI}/insertOne`;
        let date = new Date();
        date.setDate(date.getDate() + expire);
        const query = {
            collection : COLLECTION,
            database   : DATABASE,
            dataSource : DATA_SOURCE,
            document
        };
        options.body = JSON.stringify(query);
        options.expireAt = date;
        const dataResponse = await fetch(URI, options);
        const { insertedId } = await dataResponse.json();
        return { data: insertedId, error: null };
    } catch (e) {
        console.log("Error adding to DB:", e.message ?? e);
        return { error: e, data: null };
    }
}

export async function get(id) {
    try {
        const URI = `${BASE_URI}/findOne`;
        const query = {
            collection : COLLECTION,
            database   : DATABASE,
            dataSource : DATA_SOURCE,
            filter     : { _id: { "$oid": id } }
        };
        options.body = JSON.stringify(query);
        const dataResponse = await fetch(URI, options);
        return await dataResponse.json();
    } catch (e) {
        console.log("Error getting from DB:", e.message ?? e);
        return { error: e, data: null };
    }
}