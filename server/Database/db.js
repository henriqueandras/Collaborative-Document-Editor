const mongoose = require('mongoose');

const DB_PORT = 27019;

const mongodbEndpoint = process.env.DB_ENDPOINT || `mongodb://localhost:${DB_PORT}`;

async function connect(){
    try{
        await mongoose.connect(mongodbEndpoint);
        console.log("Connected to DB")
    }catch(e){
        console.log(e);
    }
}

module.exports = {
    connect:connect
}