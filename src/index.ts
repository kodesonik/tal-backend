import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client, Databases, Users } from 'node-appwrite';
import { syncJob } from './sync';
import multer from 'multer';
import fs from 'fs';
// import path from 'path';
import bodyParser from 'body-parser';

import imageModel from './schemas/image.schema';
// 
// Your secret API key
dotenv.config();


const app: Express = express();
app.use(express.json())
app.use(cors({
  origin: '*'
}))
const port = process.env.PORT;
app.use(bodyParser.urlencoded(
  { extended: true }
))

app.set("view engine", "ejs");

// SET STORAGE
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

const upload = multer({ storage: storage })
const client = new Client()
  .setEndpoint(process.env.ENDPOINT || '') // Your Appwrite Endpoint
  .setProject(process.env.PROJECT_ID || '')                // Your project ID
  .setKey(process.env.PROJECT_KEY || '') // Your; 


// You can remove services you don't use
const database = new Databases(client);
const users = new Users(client);

app.get('/', (req: Request, res: Response) => {
  res.send('TAL Backend api');
});

app.get('/agency', (req: Request, res: Response) => {
  res.send({ id: process.env.AGENCY_ID });
});

app.post('/user', async (req: Request, res: Response) => {
  console.log('called', req.body)
  try {
    const { collection, user } = req.body;
    const name = user.name ? user.name : user.firstName + " " + user.lastName;
    const { $id } = await users.create(
      "unique()",
      user.email,
      null,
      "password",
      name
    );
    user.syncedAt = new Date();
    await database.createDocument(process.env.DB || 'test', collection, $id, user);
    res.status(200).json({
      id: $id,
    });
  } catch (err: any) {
    console.log(err.message)
    res.json({
      err: err.message,
    });
  }

});

app.get("/test", (req, res) => {
  res.render("index");
})

app.post("/uploadphoto", upload.single('myImage'), async (req, res) => {
  const img = fs.readFileSync(req.file.path);
  const encode_img = img.toString('base64');
  const final_img: any = {
    name: req.file.path,
    contentType: req.file.mimetype,
    data: Buffer.from(encode_img, 'base64')
  };
  // console.log('final_img',final_img);
  const image = await imageModel.create(final_img)
  // res.contentType(final_img.contentType);
  res.status(200).json(image._id);
})

app.get('/image/:id', async (req, res) => {
  const id = req.params.id;
  console.log('id: ' + id);
  const image = await imageModel.findById(id);
  res.contentType(image.contentType);
  res.send(image.data);
})


// Sync
app.get('/copy-image/:id', async (req, res) => {
  const id = req.params.id;
  console.log('id: ' + id);
  const image = await imageModel.findById(id);
  res.status(200).json(image);
})

app.post('/save-image', async (req, res) => {
  const image = req.body;
  await imageModel.create(image);
  res.status(200).json({ res: 'success' });
})

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  if (+process.env.SYNC) syncJob()
});
