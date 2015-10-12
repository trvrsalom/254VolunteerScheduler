var blocks = 0;
var gRole = "";
var gShiftId = 0;
var shirts = true;

function sanitizeString(str){
  str = str.replace(/([^a-z0-9áéíóúñü_-\s\.,]|[\t\n\f\r\v\0])/gim,"");
  return str.trim();
}

function showShirts() {
  shirts = true;
  $("#form").removeClass("three");
  $("#form").addClass("four");
  $("#shirt").show();
}

function hideShirts() {
  shirts = false;
  $("#form").addClass("three");
  $("#form").removeClass("four");
  $("#shirt").hide();
}

function submit() {
  var subdata = {"name" : sanitizeString($("#formName").val()), "email": sanitizeString($("#formEmail").val()), "studentid": sanitizeString($("#formStudentID").val()), "shirtsize": sanitizeString($('.ui.dropdown' ).dropdown('get value'))};
  $.post(url + "/roles/" + role + "/" + gRole + "/" + gShiftId, subdata)
    .done(function(data){
      if(data.success) {
        $("#submitButtons").fadeOut();
        $("#goodNotif").fadeIn();
      }
      else {
        $("#errorMessage").html(data["message"])
        $("#submitButtons").fadeOut();
        $("#badNotif").fadeIn();
      }
      setTimeout(function(){
         window.location.reload();
      }, 5000);
    })
    .fail(function(){
      $("#submitButtons").fadeOut();
      $("#badNotif").fadeIn();
      setTimeout(function(){
         window.location.reload();
      }, 5000);
    });
}

function signUp(roleId, shiftId) {
  gRole = roleId;
  gShiftId = shiftId;
  $.get(url + "/roles/" + role, function(data) {
    $("#roleVerify").html(roleId);
    var start = data[roleId][shiftId]["start"];
    var end = data[roleId][shiftId]["end"];
    $.get(url + "/blocks", function(blocks) {
      var str = "";
      for(var i = start; i <= start + (end-start); i++) {
        str += blocks.blocks[i] + "<br />";
      }
      $("#shiftVerify").html(str);
      $('.ui.modal').modal('show');
    });
  });
}

function getShifts() {
  $.get(url + "/blocks", function(data) {
    $("#tablehead").append("<th></th>")
    for(var i = 0; i < data.blocks.length; i++) {
      $("#tablehead").append("<th>" + data.blocks[i] + "</th>");
      blocks = data.blocks.length;
    }
  });
}

function getRoles() {
  $.get(url + "/roles/" + role, function(data) {
    $.each(data, function (role, item) {
      var last = 0;
      $("#tbody").append("<tr id='" + role.replace(/ /g, "") + "'><td>" + role + "</td></tr>");
      for(var i = 0; i < blocks; i++) {
        var curr = item[last];
        if(curr != undefined && curr.start == i) {
          var colspan = 1;
          var currlast = last;
          if(curr.end - curr.start == 0) {
            last++;
          }
          else {
            colspan += curr.end - curr.start;
            i += curr.end - curr.start
            last++;
          }
          var p = "";
          for(var e = 0; e < Object.keys(curr.people).length; e++) {
            p += "<span id='vnames'>" + Object.keys(curr.people)[e] + "<br /><hr></span>";
          }
          var sh = ""
          if(curr.shirt) {
            sh = "showShirts();"
          }
          else {
            sh = "hideShirts();"
          }
          if(Object.keys(curr.people).length != curr.slots) {
            p += "<div class='sub header'><a>Sign Up</a></div>"
            p += "(" + Object.keys(curr.people).length + "/" + curr.slots + ")";
            $("#" + role.replace(/ /g, "")).append("<td colspan='" + colspan + "' onclick='" + sh + "signUp(\"" + role + "\", \"" + currlast + "\")'>" + p + "</td>");
          }
          else if(Object.keys(curr.people).length == curr.slots) {
            p += "(" + Object.keys(curr.people).length + "/" + curr.slots + ")";
            $("#" + role.replace(/ /g, "")).append("<td class='active' colspan='" + colspan + "'>" + p + "</td>");
          }
        }
        else {
          $("#" + role.replace(/ /g, "")).append("<td class='active'> </td>");
        }
      }
    });
  });
}

function checkReload() {
  if($($("#tbody").children()[0]).children().length < 4) {
    window.location.reload();
  }
}

function repeatXI(callback, interval, repeats, immediate) {
    var timer, trigger;
    trigger = function() {
        callback();
        --repeats || clearInterval(timer);
    };

    interval = interval <= 0 ? 1000 : interval; // default: 1000ms
    repeats = parseInt(repeats, 10) || 0; // default: repeat forever
    timer = setInterval(trigger, interval);

    if ( !! immediate) { // Coerce boolean
        trigger();
    }

    return timer;
}

getShifts()
getRoles()

repeatXI(checkReload, 50, 10, false);
