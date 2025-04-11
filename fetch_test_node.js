const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.use('/', (req, res) => {
    console.log(req.body);
    console.log(req.body["ID"]);
})

app.listen(4000, () => console.log('Listening on 4000'))
