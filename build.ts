try {
    const dirs = await Deno.readDir('./themes');
    const items = [];
    for await (const dir of dirs) {
        if (!dir.name.startsWith('.')) {
            const contents = await Deno.readFile(`./themes/${dir.name}`),
                  decoded  = new TextDecoder('utf-8').decode(contents),
                { name, type, author } = JSON.parse(decoded);
            items.push({ file: dir.name, name, type, author });
        }
    }
    await Deno.writeTextFile('./themes/.theme-map.generated.json', JSON.stringify({ items }));
    console.log("Successfully built themes!");
} catch (e) {
    console.log("Themes build failed! Reason:", e);
}