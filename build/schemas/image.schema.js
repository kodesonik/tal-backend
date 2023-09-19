"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { conn }  from "../database";
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = __importDefault(require("../database"));
const imageSchema = new mongoose_1.default.Schema({
    name: String,
    desc: String,
    data: Buffer,
    contentType: String
});
//Image is a model which has a schema imageSchema
const imageModel = database_1.default.model('Image', imageSchema);
exports.default = imageModel;
