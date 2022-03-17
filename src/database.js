const { Client } = require("pg")
let types = require('pg').types

types.setTypeParser(20, function(val) {
    return parseInt(val, 10)
})

const client = new Client()
client.connect()
console.log("DB connected")

module.exports = { client }