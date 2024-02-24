const mongoose = require('mongoose');

const DB_PORT = 27017;
async function connect(){
    try{
        await mongoose.connect(`mongodb://localhost:${DB_PORT}`);
    }catch(e){
        console.log(e);
    }
}

module.exports = {
    connect:connect
}