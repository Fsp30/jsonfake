const fs = require("fs");
const path = require("path");

const DB_DIR = path.join(__dirname, "db");

function listNames() {
    if (!fs.existsSync(DB_DIR)) return [];
    return fs
        .readdirSync(DB_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => path.basename(f, ".json"))
        .sort();
}

function load(name) {
    if (!listNames().includes(name)) return { error: "not_found" };
    try {
        const data = JSON.parse(
            fs.readFileSync(path.join(DB_DIR, `${name}.json`), "utf8"),
        );
        if (data === null || typeof data !== "object" || Array.isArray(data)) {
            return {
                error: "invalid",
                message:
                    'O JSON deve ser um objeto na raiz: { "recurso": [...] }',
            };
        }
        return { data };
    } catch (e) {
        return { error: "invalid", message: e.message };
    }
}

module.exports = { listNames, load, DB_DIR };
