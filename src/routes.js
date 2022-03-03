const express = require("express");
const router = express.Router();
const { client } = require("./database.js");

router.get("/v1/health", (req,res) => {
    client.query("SELECT VERSION();\n" +
        "SELECT pg_database_size('dota2')/1024/1024 as dota2_db_size;", (err, result) => {
        if (err){
            throw err;
        }

        let data = {}

        for(let element of result){
            Object.assign(data, element.rows[0])
        }

        res.json({pgsql: data});
    });
});

module.exports = router;
