var blocks = [{}];

var wsurl = "wss://robotics-trvrsalom.c9.io/";
var ws = new WebSocket(wsurl);

ws.onmessage = function(data) {
    if (JSON.parse(data.data).reload) {
        gen();
        console.log("refresh")
    } else {
        console.log(JSON.parse(data.data))
    }
}

function nominate() {
  $.ajax({
    type: "POST",
    url: "/api/nominate",
    data: {
        name: $("#jname").val(),
        email: $("#jemail").val()
    },
    success: function(data) {
      if(data["status"] == "OK") {
          $("#nsuccess").show();
      }
      else {
        $("#nerror").show()
        $("#nerrormessage").html(data.message);
      }
    },
    error: function(data) {
      $("#nerror").show()
      $("#nerrormessage").html("Failed to connect");
    },
    dataType: "json"
  });
}

function enroll(shift_id, email, first, last, shirt, callback) {
    $.ajax({
      type: "POST",
      url: "/api/register",
      data: {
          first: first,
          last: last,
          shirt: shirt,
          email: email,
          shift: shift_id,
      },
      success: function(data) {
          callback(data)
      },
      dataType: "json"
    });
}

function signup(timeslot, role, double, shiftid, shirt) {
    if(shirt == "true") {
        $("#fieldCount").removeClass("three");
        $("#fieldCount").addClass("four");
        $("#confirmShirt").show();
    }
    else {
        $("#fieldCount").removeClass("four");
        $("#fieldCount").addClass("three");
        $("#confirmShirt").hide();
    }
    var shifts = "<ul><li>" + blocks[timeslot] + "</li>";
    if(double) {
        shifts += "<li>" + blocks[timeslot + 1] + "</li>";
    }
    shifts += "</ul>"
    $("#submitButton").off("click");
    $("#submitButton").removeClass("disabled");
    $(".ui.message").hide();
    $("#submitButton").on("click", function() {
        $("#submitButton").addClass("disabled");
        enroll(shiftid, $("#email").val().replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig, ""), $("#fname").val().replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig, ""), $("#lname").val().replace(/[\\\*\?\^\$\[\]\(\)\{\}\/\'\#\:\=\|]/ig, ""), shirt == "true" ? $("#shirtsize").val() : "null", function(data) {
            console.log(data);
            if(data["status"] == "OK") {
                $("#success").show();
		gen();
		setTimeout(function(){
		    $('.ui.confirm.modal').modal('hide');
		    //$("input").val("");
		}, 1000);
            } else {
                $("#error").show()
                $("#errormessage").html(data.message);
                //window.setTimeout(window.location)
            }
            //gen(); //replaced by websocket
        });
    });
    $("#confirmShifts").html(shifts);
    $("#confirmRole").html(role);
    $('select.dropdown').dropdown();
    $('.ui.modal').modal('show');
}

function gen() {
    $("#tablehead").html("");
    $("#tablebody").html("");

    $.get('/api/blocks', function(data) {
        $("#tablehead").append("<th></th>")
        blocks = data;
        for(var block in data) {
            $("#tablehead").append("<th>" + data[block] + "</th>");
        }
    })

    $.get('/api/' + roletype, function(data) {

       var table = $("#tablebody");
       for(key in data) {
           var datarow = data[key];
           var row = "<tr><td>" + datarow.type + "</td>";
           for(var i = 0; i < Object.keys(datarow).length-1; i++) {
               var celldata = datarow["_" + i];
               var nextdata = datarow["_" + (i+1)];
               var colspan = "colspan='1'";
               var double = false;
               if(celldata != undefined && nextdata != undefined && celldata.id == nextdata.id) {
                   colspan = "colspan='2'";
                   i++
                   double = true;
               }
                if (celldata == null) {
                    row += "<td class='active'></td>"
                } else if (celldata.people < celldata.max) {
                    row += "<td " + colspan + " onclick='signup(" + i + ", \"" + datarow.type + "\", " + double + ", \"" + celldata.id + "\"" +  ", \"" + celldata.shirt + "\")' style='cursor:pointer'>(" + celldata.people + "/" + celldata.max + ")</td>";
                } else {
                    row += "<td class='active' " + colspan + " >Full (" + celldata.people + "/" + celldata.max + ")</td>";
                }
           }
           row+="</tr>"
           table.append(row);
       }
    });
}

gen();
