const { Client } = require("pg")

const client = new Client()
client.connect()
console.log("DB connected")

module.exports = { client }