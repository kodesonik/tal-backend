"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const node_appwrite_1 = require("node-appwrite");
const axios_1 = __importDefault(require("axios"));
const image_schema_1 = __importDefault(require("./schemas/image.schema"));
const syncJob = () => {
    node_cron_1.default.schedule('* * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        yield syncAgency();
    }));
};
exports.syncJob = syncJob;
const MASTER_IMAGE_HOST = 'http://141.148.237.51:' + process.env.PORT + '/';
const collections = [
    "admin",
    "country",
    "town",
    "agency",
    "employee",
    "partner",
    "store",
    "customer",
    "vehicleType",
    "vehicle",
    "package",
    "payment",
    "entrance",
    "delivery",
    "exit",
    "file",
    "contact"
];
const syncAgency = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = new node_appwrite_1.Client()
            .setEndpoint(process.env.ENDPOINT || '') // Your Appwrite Endpoint
            .setProject(process.env.PROJECT_ID || '') // Your project ID
            .setKey(process.env.PROJECT_KEY || ''); // Your; 
        const clientDatabases = new node_appwrite_1.Databases(client);
        const clientDatabaseId = process.env.DB || "test";
        const clientUsers = new node_appwrite_1.Users(client);
        const master = new node_appwrite_1.Client()
            .setEndpoint(process.env.MASTER_ENDPOINT || '') // Your Appwrite Endpoint
            .setProject(process.env.MASTER_PROJECT_ID || '') // Your project ID
            .setKey(process.env.MASTER_PROJECT_KEY || ''); // Your; 
        const masterDatabases = new node_appwrite_1.Databases(master);
        const masterDatabaseId = process.env.MASTER_DB || "test";
        const masterUsers = new node_appwrite_1.Users(master);
        //SYnc users
        const remoteUsers = yield masterUsers.list();
        const localUsers = yield clientUsers.list();
        const promises = [];
        if (!remoteUsers.total && !localUsers.total) {
        }
        else if (remoteUsers.total && !localUsers.total) {
            remoteUsers.users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
                const { $id } = user, data = __rest(user, ["$id"]);
                return yield promises.push(clientUsers.create($id, data.email, data.phone || '', "password", data.name));
            }));
            yield Promise.all(promises);
        }
        else if (!remoteUsers.total && localUsers.total) {
            localUsers.users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
                const { $id } = user, data = __rest(user, ["$id"]);
                return yield promises.push(masterUsers.create($id, data.email, data.phone || '', "password", data.name));
            }));
            yield Promise.all(promises);
        }
        else if (remoteUsers.total && localUsers.total) {
            yield remoteUsers.users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
                const { $id } = user, data = __rest(user, ["$id"]);
                const localUser = yield localUsers.users.find((user) => user["$id"] === $id);
                if (!localUser) {
                    return yield promises.push(clientUsers.create($id, data.email, data.phone || '', "password", data.name));
                }
            }));
            yield localUsers.users.map((user) => __awaiter(void 0, void 0, void 0, function* () {
                const { $id } = user, data = __rest(user, ["$id"]);
                const remoteUser = yield remoteUsers.users.find((user) => user["$id"] === $id);
                if (!remoteUser) {
                    return yield promises.push(masterUsers.create($id, data.email, data.phone || '', "password", data.name));
                }
            }));
        }
        // Data Sync
        const syncData = (collection) => __awaiter(void 0, void 0, void 0, function* () {
            const syncedFiles = collection === 'file';
            const localData = yield clientDatabases.listDocuments(clientDatabaseId, collection);
            const remoteData = yield masterDatabases.listDocuments(masterDatabaseId, collection);
            yield localData.documents.forEach((lItem) => __awaiter(void 0, void 0, void 0, function* () {
                const rItem = remoteData.documents.find((rItem) => rItem["$id"] === lItem["$id"]);
                // delete subdocuments
                delete lItem.contacts;
                if (rItem)
                    delete rItem.contacts;
                if (rItem && rItem["syncedAt"] < lItem["syncedAt"]) {
                    console.log(collection, "elder on remote");
                    const { $id, $permissions, $collectionId, $databaseId } = lItem, data = __rest(lItem, ["$id", "$permissions", "$collectionId", "$databaseId"]);
                    yield masterDatabases.updateDocument(masterDatabaseId, collection, $id, data);
                }
                else if (rItem && rItem["syncedAt"] > lItem["syncedAt"]) {
                    console.log(collection, "Newer on remote");
                    const { $id, $permissions, $collectionId, $databaseId } = rItem, data = __rest(rItem, ["$id", "$permissions", "$collectionId", "$databaseId"]);
                    yield clientDatabases.updateDocument(clientDatabaseId, collection, $id, data);
                }
                else if (rItem && rItem["syncedAt"] == lItem["syncedAt"]) {
                    console.log(collection, "Alreadry synced");
                }
                else {
                    console.log(collection, "Don't exist on remote");
                    const { $id, $permissions, $collectionId, $databaseId } = lItem, data = __rest(lItem, ["$id", "$permissions", "$collectionId", "$databaseId"]);
                    // console.log(data);
                    yield masterDatabases.createDocument(masterDatabaseId, collection, $id, data);
                    if (syncedFiles) {
                        console.log('sending images...', data.value);
                        yield sendImage(data.value);
                    }
                }
            }));
            return yield remoteData.documents
                .filter((rItem) => !localData.documents.find((lItem) => lItem["$id"] === rItem["$id"]))
                .forEach((rItem) => __awaiter(void 0, void 0, void 0, function* () {
                console.log(collection, "Add new element from remote", rItem["$id"]);
                const _a = rItem, { $id, $permissions, $collectionId, $databaseId } = _a, data = __rest(_a, ["$id", "$permissions", "$collectionId", "$databaseId"]);
                yield clientDatabases.createDocument(clientDatabaseId, collection, $id, data);
                if (syncedFiles) {
                    console.log('receiveing images...', data.value);
                    yield receiveImage(data.value);
                }
            }));
        });
        const dataPromises = collections.map((collection) => __awaiter(void 0, void 0, void 0, function* () { return syncData(collection); }));
        yield Promise.all(dataPromises);
    }
    catch (err) {
        console.log('SYnc failed this time for: ' + err.message);
    }
});
const sendImage = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const image = yield image_schema_1.default.findById(id);
    // console.log('image', image)
    if (!image) {
        return console.log('failed to find image');
    }
    return yield $post('save-image', image);
});
const receiveImage = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const image = yield $get('copy-image', id);
    console.log('image', image);
    if (!image) {
        return console.log('failed to retrieve image');
    }
    return yield image_schema_1.default.create(image);
});
const $post = (path, image) => __awaiter(void 0, void 0, void 0, function* () {
    const headers = {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer ' +  await TokenManager.generate({ id: 0, role: 'super'})
    };
    // console.log(url)
    try {
        const { data } = yield axios_1.default.post(MASTER_IMAGE_HOST + path, image, { headers });
        return data;
    }
    catch (err) {
        console.log('error', err.message);
    }
});
const $get = (path, id) => __awaiter(void 0, void 0, void 0, function* () {
    const headers = {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer ' + await TokenManager.generate({ id: 0, role: 'super'})
    };
    // console.log(url)
    try {
        const { data } = yield axios_1.default.get(MASTER_IMAGE_HOST + path, { headers, data: { id } });
        console.log('data');
        return data;
    }
    catch (err) {
        // console.log(err)
    }
});
