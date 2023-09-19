import mongoose from "mongoose";

const db = process.env.MONGO_DB
mongoose.connect('mongodb://mongo-db:27017/'+db);
const conn = mongoose.connection;
conn.on('connected', function() {
    console.log('database is connected successfully');
});
conn.on('disconnected',function(){
    console.log('database is disconnected successfully');
})
conn.on('error', console.error.bind(console, 'connection error:'));

export default conn