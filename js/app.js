'use strict';

var canvas = document.getElementById('output');
var context = canvas.getContext('2d');
var film = new Film(new Point2(1024, 600), new BoxFilter(0.5), 1.0, Infinity);

var get_samples = (url_base, object) => {
  fetch(new URL(object, url_base).href)
    .then((response) => {
      if (!response.ok) {
        throw new Error('response was not ok');
      }

      return response.arrayBuffer();
    })
    .then((buffer) => {
      var littleEndian = true;
      var dv = new DataView(buffer);
      for (var offset = 0; offset < dv.byteLength;) {
        var len = dv.getUint32(offset, littleEndian);
        offset += 4;

        // var sampleId = dv.getUint64(offset, littleEndian);
        offset += 8;

        var x = dv.getFloat32(offset, littleEndian);
        offset += 4;

        var y = dv.getFloat32(offset, littleEndian);
        offset += 4;

        var weight = dv.getFloat32(offset, littleEndian);
        offset += 4;

        var r = dv.getFloat32(offset, littleEndian);
        offset += 4;

        var g = dv.getFloat32(offset, littleEndian);
        offset += 4;

        var b = dv.getFloat32(offset, littleEndian);
        offset += 4;

        var p_film = new Point2(x, y);
        var color = new Spectrum(r, g, b);
        film.add_sample(p_film, color, weight);
      }
    })
    .then(() => { film.write_image(canvas, context); });
}

const socket = new WebSocket("ws://sadjad.stanford.edu:9091");

socket.addEventListener('open', (event) => { socket.send('subscribe 0'); });

socket.addEventListener('message', (event) => {
  var msg = JSON.parse(event.data);
  for (var i in msg.sampleBags) {
    get_samples(msg.urlPrefix, msg.sampleBags[i]);
  }
});

socket.addEventListener('close', (event) => {});

var start_button = document.getElementById("start-job");
start_button.addEventListener('click', (event) => {
  start_button.disabled = true;
  socket.send('start');
});
