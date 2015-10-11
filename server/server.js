var express = require('express');
var jsonfile = require('jsonfile');
var util = require('util')
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  next();
});

var blockFile = 'data/blocks.json';
var studentRoleFile = 'data/studentroles.json';
var parentRoleFile = 'data/parentroles.json';

app.get('/', function (req, res) {
  res.json({"success":true});
});

app.get('/blocks', function(req, res) {
  jsonfile.readFile(blockFile, function(err, obj) {
    if(err)
      throw err;
    res.json(obj);
  });
});

app.get('/roles/students', function(req, res) {
  jsonfile.readFile(studentRoleFile, function(err, obj) {
    if(err)
      throw err;
    res.json(obj);
  });
});

app.post('/roles/students/:role/:id', function(req, res) {
  jsonfile.readFile(studentRoleFile, function(err, obj) {
    if(err)
      throw err;
    obj[req.params.role][req.params.id]["people"][req.body.name] = {
      "email" : req.body.email,
      "studentid" : req.body.studentid,
      "shirt" : req.body.shirtsize
    };
    if(Object.keys(obj[req.params.role][req.params.id]["people"]).length > obj[req.params.role][req.params.id]["slots"]) {
      res.json({"success":false, "message":"Sorry, it looks like that slot has been filled."});
    }
    else {
      jsonfile.writeFile(studentRoleFile, obj, function (err) {
        if(err)
          throw err;
        res.json({"success":true});
      });
    }
  });
});

app.get('/roles/parents', function(req, res) {
  jsonfile.readFile(parentRoleFile, function(err, obj) {
    if(err)
      throw err;
    res.json(obj);
  });
});

app.post('/roles/parents/:role/:id', function(req, res) {
  jsonfile.readFile(parentRoleFile, function(err, obj) {
    if(err)
      throw err;
    obj[req.params.role][req.params.id]["people"][req.body.name] = {
      "email" : req.body.email,
      "shirt" : req.body.shirtsize
    };
    if(Object.keys(obj[req.params.role][req.params.id]["people"]).length > obj[req.params.role][req.params.id]["slots"]) {
      res.json({"success":false, "message":"Sorry, it looks like that slot has been filled."});
    }
    else {
      jsonfile.writeFile(parentRoleFile, obj, function (err) {
        if(err)
          throw err;
        res.json({"success":true});
      });
    }
  });
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});
