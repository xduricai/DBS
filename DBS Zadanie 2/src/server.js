const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;
const router = require("./routes.js");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('', router)

app.listen(PORT, ()=>{
    console.log("Server running.")
});
