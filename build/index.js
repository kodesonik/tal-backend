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
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
// import path from 'path';
const body_parser_1 = __importDefault(require("body-parser"));
const image_schema_1 = __importDefault(require("./schemas/image.schema"));
// 
// Your secret API key
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "10mb" }));
app.use((0, cors_1.default)({
    origin: '*'
}));
const port = process.env.PORT;
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.set("view engine", "ejs");
// SET STORAGE
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now());
    }
});
const upload = (0, multer_1.default)({ storage: storage });
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
    res.send({ id: process.env.AGENCY_ID });
});
app.post('/user', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('called', req.body);
    try {
        const { collection, user } = req.body;
        const name = user.name ? user.name : user.firstName + " " + user.lastName;
        const { $id } = yield users.create("unique()", user.email, null, "password", name);
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
app.get("/test", (req, res) => {
    res.render("index");
});
app.post("/uploadphoto", upload.single('myImage'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const img = fs_1.default.readFileSync(req.file.path);
    const encode_img = img.toString('base64');
    const final_img = {
        name: req.file.path,
        contentType: req.file.mimetype,
        data: Buffer.from(encode_img, 'base64')
    };
    // console.log('final_img',final_img);
    const image = yield image_schema_1.default.create(final_img);
    // res.contentType(final_img.contentType);
    res.status(200).json(image._id);
}));
app.get('/image/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    console.log('id: ' + id);
    const image = yield image_schema_1.default.findById(id);
    if (!image)
        return res.status(404).send();
    res.contentType(image.contentType);
    res.send(image.data);
}));
// Sync
app.get('/copy-image/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    console.log('id: ' + id);
    const image = yield image_schema_1.default.findById(id);
    res.status(200).json(image);
}));
app.post('/save-image', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const image = req.body;
    yield image_schema_1.default.create(image);
    res.status(200).json({ res: 'success' });
}));
app.get('/package/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.id;
    console.log('id: ' + id);
    const pkg = yield database.getDocument(process.env.DB || 'test', 'package', id);
    if (!pkg)
        return res.status(503).json({ message: 'Colis non trouvé' });
    if (!pkg.deliveryId)
        return res.status(200).json({ message: 'Colis non expédié pour le moment!' });
    const delivery = yield database.getDocument(process.env.DB || 'test', 'delivery', pkg.deliveryId);
    const location = yield database.getDocument(process.env.DB || 'test', 'town', delivery.locationTownId);
    res.status(200).json({ package: pkg, delivery, location });
}));
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    if (+process.env.SYNC)
        (0, sync_1.syncJob)();
});
