const { MongoClient } = require('mongodb');



const state = {
    db: null
}

module.exports.main = async function () {

    // Connection URL
    const url = 'mongodb://0.0.0.0:27017';
    const client = new MongoClient(url);

    // Database Name
    const dbName = 'Fliq';


    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    state.db = client.db(dbName);
    return true;
}

module.exports.get = () => {
    return state.db;
}