// import { conn }  from "../database";
import mongoose from "mongoose";
import conn from "../database";

const imageSchema = new mongoose.Schema({
    name: String,
    desc: String,
    data: Buffer,
    contentType: String
});

//Image is a model which has a schema imageSchema

const imageModel = conn.model('Image', imageSchema);
export default imageModel