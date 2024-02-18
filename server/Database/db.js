const mongoose = require('mongoose');

const DB_PORT = 27017;
async function connect(){
    await mongoose.connect(`mongodb://localhost:${DB_PORT}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
}

module.exports = {
    connect:connect
}