const express = require("express");
const router = express.Router();
const { client } = require("./database.js");

router.get("/health", (req,res) => {
    client.query("SELECT VERSION();\n" +
        "SELECT pg_database_size('dota2')/1024/1024 as dota2_db_size;", (err, result) => {
        if (err){
            throw err;
        }

        let data = {}

        for(let element of result){
            Object.assign(data, element.rows[0])
        }

        console.log(data)
        res.status(200);
        res.type('application/json');
        res.json({pgsql: data});
    });
});

module.exports = router;