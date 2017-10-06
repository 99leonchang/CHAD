/*

    GRBLWeb - a web based CNC controller for GRBL
    Copyright (C) 2015 Andrew Hodel

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
    MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
    ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
    ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
    OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

$(document).ready(function() {

	// init vars for better controls
	var tsLast = Date.now();
	socket = io.connect('');
	var labelClass = {
    	Idle: "label label-default pull-right",
    	Queue: "label label-warning pull-right",
    	Run: "label label-success pull-right",
    	Hold: "label label-warning pull-right",
    	Home: "label label-info pull-right",
    	Alarm:"label label-danger pull-right",
    	Check: "label label-primary pull-right"
	};
	var timelineData = {
    	0 : { "colour" : "blue", "text" : "Image processed", "icon" : "camera" },
        1 : { "colour" : "gray", "text" : "Moving to part", "icon" : "road" },
        2 : { "colour" : "purple", "text" : "Picked up part", "icon" : "microchip" },
        3 : { "colour" : "gray", "text" : "Moving to bin", "icon" : "road" },
        4 : { "colour" : "maroon", "text" : "Dropped at bin", "icon" : "archive" }
    };
	var itemConversion = {
	    1 : "Battery",
        2 : "Motherboard",
        3 : "Sound Driver",
        4 : "Vibration Module"
    };
    var timelineHistory = [];

    function singleEvent(data){
        return '<li>' +
            '<i class="fa fa-' + timelineData[data.event]["icon"] + ' bg-' + timelineData[data.event]["colour"] + '"></i>' +
            '<div class="timeline-item">' +
            '<h3 class="timeline-header no-border">' +
            timelineData[data.event]["text"] +
            ( data.event == 2 ? '<code>' + itemConversion[data.type] + '</code>' : ( data.event == 4 ? '<code>' + data.type + '</code>' : '')) +
            '</h3>' +
            ( data.event == 0 ? '<div class="timeline-body"><img class="img-responsive pad" src="data:image/jpeg;base64,' + data.image + '"></div>' : '' ) +
            '</div>' +
            '</li>';
    }


	socket.on('serverError', function (data) {
		alert(data);
	});

	// config from server
	socket.on('config', function (data) {
		if (data.showWebCam == true) {
			// show the webcam and link

			var webroot = window.location.protocol+'//'+window.location.hostname;
			//console.log(webroot);

			$('#wcImg').attr('src', webroot+':'+data.webcamPort+'/?action=stream');

			$('#wcLink').attr('href', webroot+':'+data.webcamPort+'/javascript_simple.html');

			$('#webcam').css('display','inline-block');
		}
	});

	socket.on('ports', function (data) {
		//console.log('ports event',data);
		$('#choosePort').html('<option val="no">Select a serial port</option>');
		for (var i=0; i<data.length; i++) {
			$('#choosePort').append('<option value="'+i+'">'+data[i].comName+':'+data[i].pnpId+'</option>');
		}
		if (data.length == 1) {
			$('#choosePort').val('0');
			$('#choosePort').change();
		}
	});

	socket.on('qStatus', function (data) {
		$('#qStatus').html(data.currentLength+'/'+data.currentMax);
	});

	socket.on('machineStatus', function (data) {
		$('#mStatus').html(data.status).removeClass().addClass(labelClass[data.status]);
		$('#wStatus').html((data.workerID == -1 ? 'Offline' : 'Online')).removeClass().addClass((data.workerID == -1 ? 'label label-danger pull-right' : 'label label-success pull-right'));
		$('#mX').html('X: '+data.mpos[0]);
		$('#mY').html('Y: '+data.mpos[1]);
		$('#mZ').html('Z: '+data.mpos[2]);
		$('#wX').html('X: '+data.wpos[0]);
		$('#wY').html('Y: '+data.wpos[1]);
		$('#wZ').html('Z: '+data.wpos[2]);
		//console.log(data);
	});

	socket.on('serialRead', function (data) {
		if ($('#console span').length > 300) {
			// remove oldest if already at 300 lines
			$('#console span').first().remove();
		}
		$('#console').append(data.line);
		$('#console').scrollTop($("#console")[0].scrollHeight - $("#console").height());
	});
	
	// ----- CHAD LISTENERS ----- //
	
	// capture initial timeline payload
	socket.on('initialBundle', function (data) {

		$('#timeline').empty();
		timelineHistory = data;
		console.log(data);
		for (i = 0; i < data.length; i++) {
            if (i > 0)
                $('#loop' + (i - 1) + '_head').toggleClass('bg-orange bg-green');
            $('#timeline').prepend('<li class="time-label"><span id="loop' + i + '_head" class="bg-orange">' + itemConversion[data[i][0].type] + '</span></li><div id="loop' + i + '"></div>');
    		for ( j = 0; j < data[i].length; j++) {
    			console.log(data[i][j]);
    			$('#loop' + i).prepend(singleEvent(data[i][j]));
    		}
		}
	});

	//single update payload
	socket.on('bundleUpdate', function (data) {
		console.log(data);
		if(data.type != 0) {
            if (timelineHistory[data.loop] == null) {
                timelineHistory[data.loop] = [];
                if (data.loop > 0)
                    $('#loop' + (data.loop - 1) + '_head').toggleClass('bg-orange bg-green');
                $('#timeline').prepend('<li class="time-label"><span id="loop' + data.loop + '_head" class="bg-orange">' + itemConversion[data.type] + '</span></li><div id="loop' + data.loop + '"></div>');
            }
            timelineHistory[data.loop].push(data);
            $('#loop' + data.loop).prepend(singleEvent(data));
        } else {
            $('#loop' + (data.loop - 1) + '_head').toggleClass('bg-orange bg-green');
            //$('#timeline').prepend('<li class="time-label"><span id="complete" class="bg-green">All Done!</span></li>');
        }

        });
	
	socket.on('done', function (data) {
		console.log(data);
	});

	$('#choosePort').on('change', function() {
		// select port
		socket.emit('usePort', $('#choosePort').val());
		$('#mStatus').html('Port Selected');
	});

	$('#sendReset').on('click', function() {
		socket.emit('doReset', 1);
	});

	$('#sendGrblHelp').on('click', function() {
		socket.emit('gcodeLine', { line: '$' });
	});

	$('#sendGrblSettings').on('click', function() {
		socket.emit('gcodeLine', { line: '$$' });
	});

	$('#pause').on('click', function() {
		if ($('#pause').html() == 'Pause') {
			// pause queue on server
			socket.emit('pause', 1);
			$('#pause').html('Unpause');
			$('#clearQ').removeClass('disabled');
		} else {
			socket.emit('pause', 0);
			$('#pause').html('Pause');
			$('#clearQ').addClass('disabled');
		}
	});

	$('#clearQ').on('click', function() {
		// if paused let user clear the command queue
		socket.emit('clearQ', 1);
		// must clear queue first, then unpause (click) because unpause does a sendFirstQ on server
		$('#pause').click();
	});

	$('#sendZero').on('click', function() {
		socket.emit('gcodeLine', { line: 'G92 X0 Y0 Z0' });
	});

	$('#sendCommand').on('click', function() {

		socket.emit('gcodeLine', { line: $('#command').val() });
		$('#command').val('');

	});

	// shift enter for send command
	$('#command').keydown(function (e) {
		if (e.shiftKey) {
			var keyCode = e.keyCode || e.which;
			if (keyCode == 13) {
				// we have shift + enter
				$('#sendCommand').click();
				// stop enter from creating a new line
				e.preventDefault();
			}
		}
	});

	$('#xM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' X-'+$('#jogSize').val()+'\nG90'});
	});
	$('#xP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' X'+$('#jogSize').val()+'\nG90'});
	});
	$('#yP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' Y'+$('#jogSize').val()+'\nG90'});
	});
	$('#yM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' Y-'+$('#jogSize').val()+'\nG90'});
	});
	$('#zP').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' Z'+$('#jogSize').val()+'\nG90'});
	});
	$('#zM').on('click', function() {
		socket.emit('gcodeLine', { line: 'G91\nG1 F'+$('#jogSpeed').val()+' Z-'+$('#jogSize').val()+'\nG90'});
	});

	// WASD and up/down keys
	$(document).keydown(function (e) {
		var keyCode = e.keyCode || e.which;

		if ($('#command').is(':focus')) {
			// don't handle keycodes inside command window
			return;
		}

		switch (keyCode) {
		case 65:
			// a key X-
			e.preventDefault();
			$('#xM').click();
			break;
		case 68:
			// d key X+
			e.preventDefault();
			$('#xP').click();
			break;
		case 87:
			// w key Y+
			e.preventDefault();
			$('#yP').click();
			break;
		case 83:
			// s key Y-
			e.preventDefault();
			$('#yM').click();
			break;
		case 38:
			// up arrow Z+
			e.preventDefault();
			$('#zP').click();
			break;
		case 40:
			// down arrow Z-
			e.preventDefault();
			$('#zM').click();
			break;
		}
	});
	
	// ---- CHAD FUNCTIONS ---- //
	$('#startChad').on('click', function() {
        $('#timeline').empty().html('<li><i class="fa fa-clock-o bg-gray"></i></li>');
		socket.emit('start');
	});
	
	$('#goHome').on('click', function() {
		socket.emit('gcodeLine', { line: 'G1 X0 Y0 Z0 F2500' });
	});
	

	// handle gcode uploads
	if (window.FileReader) {

		var reader = new FileReader ();

		// drag and drop
		function dragEvent (ev) {
			ev.stopPropagation (); 
			ev.preventDefault ();
			if (ev.type == 'drop') {
				reader.onloadend = function (ev) {
					document.getElementById('command').value = this.result;
					openGCodeFromText();
				};
				reader.readAsText (ev.dataTransfer.files[0]);
			}  
		}

		document.getElementById('command').addEventListener ('dragenter', dragEvent, false);
		document.getElementById('command').addEventListener ('dragover', dragEvent, false);
		document.getElementById('command').addEventListener ('drop', dragEvent, false);

		// button
		var fileInput = document.getElementById('fileInput');
		fileInput.addEventListener('change', function(e) {
			reader.onloadend = function (ev) {
				document.getElementById('command').value = this.result;
				openGCodeFromText();
			};
			reader.readAsText (fileInput.files[0]);
		});

	} else {
		alert('your browser is too old to upload files, get the latest Chromium or Firefox');
	}

});
