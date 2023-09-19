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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const node_appwrite_1 = require("node-appwrite");
const sync_1 = require("./sync");
// 
// Your secret API key
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: '*'
}));
const port = process.env.PORT;
const client = new node_appwrite_1.Client()
    .setEndpoint(process.env.ENDPOINT || '') // Your Appwrite Endpoint
    .setProject(process.env.PROJECT_ID || '') // Your project ID
    .setKey(process.env.PROJECT_KEY || ''); // Your; 
// You can remove services you don't use
const database = new node_appwrite_1.Databases(client);
const users = new node_appwrite_1.Users(client);
app.get('/', (req, res) => {
    res.send('TAL Backend api');
});
app.get('/agency', (req, res) => {
    res.send({ id: process.env.PROJECT_ID });
});
app.post('/user', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('called', req.body);
    try {
        const { collection, user } = req.body;
        const name = user.name ? user.name : user.firstName + " " + user.lastName;
        const { $id } = yield users.create("unique()", user.email, user.phoneNumber, "password", name);
        user.syncedAt = new Date();
        yield database.createDocument(process.env.DB || 'test', collection, $id, user);
        res.status(200).json({
            id: $id,
        });
    }
    catch (err) {
        console.log(err.message);
        res.json({
            err: err.message,
        });
    }
}));
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    if (+process.env.SYNC)
        (0, sync_1.syncJob)();
});
