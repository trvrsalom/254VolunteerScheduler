var server = require('http').createServer()
var express = require('express');
var app = express();
var mysql = require('mysql');
var async = require('async');
var bodyParser = require('body-parser')
var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({ server: server });

app.use(express.static('static'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

//Caches
var savedStudents = [{}];
var savedPeople = [{}];
var savedParents = [{}];
var savedShifts = [{}];
var studentData = {};
var parentData = {};
var savedBlocks = [];


//Set up mysql connection
var connection = mysql.createConnection({
  host     : '',
  user     : '',
  password : '',
  database : 'signup'
});

//Initiate connection
connection.connect();

//Websocket Broadcaster
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
};

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: \"%s\" over websocket', message);
    ws.send(JSON.stringify({message: "Please wait for a reload signal"}));
  });

  ws.send(JSON.stringify({message: "Connected!"}));
});


//Initializer function: Load all database data into RAM
function init(cb) {
  async.parallel([
    function(callback) {
      connection.query('SELECT * FROM students;', function(err, rows, fields) {
        if (err) throw err;
        savedStudents = rows;
        callback()
      })
    },
    function(callback) {
      connection.query('SELECT * FROM parents;', function(err, rows, fields) {
        if (err) throw err;
        savedParents = rows;
        callback()
      })
    },
    function(callback) {
      connection.query('SELECT * FROM people;', function(err, rows, fields) {
        if (err) throw err;
        savedPeople = rows;
        callback()
      })
    },
    function(callback) {
      connection.query('SELECT * FROM shifts;', function(err, rows, fields) {
        if (err) throw err;
        savedShifts = rows;
        callback()
      })
    },
    function (callback) {
      connection.query("SELECT * FROM header", function(err, rows, fields) {
        for(var i in rows) {
          savedBlocks.push(rows[i].text);
        }
        callback();
      })
    },
  ], function(){
    //console.log(savedParents, savedStudents)
    studentData = generateStudentOrParentData(savedStudents);

    parentData = generateStudentOrParentData(savedParents);

    cb();
  })

}

//Call initializer
init(function(){
  console.log("Loaded data")
});

app.get('/api/testws', function (req, res) {
  wss.broadcast(JSON.stringify({reload: true}))
  res.json({"success":true});
})

app.get("/api/reload", function(req, res) {
  init();
  res.json("Success");
})

app.get('/api/blocks', function (rea, res) {
  res.json(savedBlocks);
});

//JSON For student table
app.get('/api/student', function (req, res) {
  res.json(studentData);
});

//JSON For parent table
app.get('/api/parent', function (req, res) {
  res.json(parentData);
});

app.post('/api/register', function (req, res) {
  var expects = ["first", "last", "email", "shirt", "shift"];
  for (var i in expects) {
    if (req.body[expects[i]] === undefined) {
      res.json({status: "error", message: "invalid parameters."});
      return;
    }
  }

  console.log(req.body.email)

  //Check if user exists by email
  connection.query('SELECT id, shirt FROM people WHERE email="' + req.body.email.replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig,"") + '"', function(err, rows, fields) {
    if (err) throw err;

    var shirt = ((req.body.shirt != "null")? "\"": "") + req.body.shirt + ((req.body.shirt !== "null")? "\"": "");

    if (rows.length == 0){
      //User DNE

      connection.query('INSERT INTO people (email, first, last, shirt) VALUES ("'+req.body.email.replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig,"")+'", "'+req.body.first.replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig,"")+'", "'+req.body.last.replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig,"")+'", '+shirt.replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig,"")+')', function(err, rows, fields) {
        if (err) throw err;
        registerUser(rows.insertId, req.body.shift);
      })
    } else {
      //User Exists, but update shirt
      if (rows[0].shirt != null) {
      } else {
        connection.query('UPDATE people SET shirt = '+shirt.replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig,"")+' WHERE id="' + rows[0].id + '"', function(err, rows, fields) {
          if (err) throw err;
        });
      }
      registerUser(rows[0].id, req.body.shift)

    }
  })

  //Sign them up!
  function registerUser(id, shift){

    //Check session
    connection.query('SELECT people, max FROM shifts WHERE id="' + shift.replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig,"") + '"', function(err, rows, fields) {
      if (err) throw err;
      if (rows.length == 0) {
        res.json({status: "error", message: "Invalid Shift"});
        return;
      }

      rows[0].people = JSON.parse(rows[0].people);

      if (rows[0].people === null) {
        rows[0].people = []
      } else if (rows[0].people.length >= rows[0].max) {
        res.json({status: "error", message: "Shift has no available slots"});
        return;
      } else if (rows[0].people.indexOf(id) >-1) {
        res.json({status: "error", message: "Already signed up"});
        return;
      }

      rows[0].people.push(id);

      connection.query('UPDATE shifts SET people = "'+JSON.stringify(rows[0].people)+'" WHERE id="' + shift.replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig,"") + '"', function(err, rows, fields) {
        if (err) throw err
        if (rows.affectedRows == 1){
          init(function(){
            wss.broadcast(JSON.stringify({"reload": true}))
            res.json({status: "OK"});
          }); //Sketchy Reload!
        } else {
          res.json({status: "error", message: "Did not register: Session not found in table"});
        }
      });


    });

  }
});

function generateStudentOrParentData(which) {
  var response = {};
  for (var type in which) {
    response[type] = which[type];


    for (var slot in response[type]) {

      if (slot.substr(0,1) == "_") { //Make sure you only read _INTEGERs
        if (response[type][slot] !== null && response[type][slot] !== undefined) {
          var _shift = savedShifts[response[type][slot]-1]
          var shift = {
            id: _shift.id,
            people: _shift.people,
            shirt: _shift.shirt,
            max: _shift.max,
          };

          shift.shirt = (shift.shirt == 0) ? false : true;
          shift.people = (shift.people === null) ? 0 : JSON.parse(shift.people).length;
          response[type][slot] = shift;
        }
      } else {
        response[type][slot] = which[type][slot];
      }
    }
  }
  return response;
}

app.use(express.static('static'));

//Start APP
//app.listen(process.env.PORT, process.env.IP);
console.log("Running on " + process.env.IP + ":" + process.env.PORT)
server.on('request', app);
server.listen(process.env.PORT, function () { console.log('Listening on ' + server.address().port) });
