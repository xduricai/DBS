const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;

const routerV1 = require("./routesV1.js");
const routerV2 = require("./routesV2.js");
const routerV3 = require("./routesV3.js");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/v1", routerV1);
app.use("/v2", routerV2);
app.use("/v3", routerV3);

app.listen(PORT, ()=>{
    console.log("Server running.")
});
