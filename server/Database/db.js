const mongoose = require('mongoose');

async function connect(DB_PORT = 27017){
    try{
        const mongodbEndpoint = process.env.DB_ENDPOINT || `mongodb://localhost:${DB_PORT}`;
        await mongoose.connect(mongodbEndpoint);
        console.log("Connected to DB")
    }catch(e){
        console.log(e);
    }
}

module.exports = {
    connect:connect
}