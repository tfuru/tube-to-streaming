'use strict';

const http = require('http');
const ytdl = require('ytdl-core');

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Tube-To-Streaming');
});

app.get('/:videoid', (req, res) => {
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }

  res.writeHead(200, {'Content-Type': 'video/mp4'});  
  const stream = ytdl(`http://www.youtube.com/watch?v=${req.params.videoid}`);
  stream.on('data', chunk => {
    console.log('downloaded', chunk.length);
  });

  stream.on('end', () => {
    console.log('Finished');
    res.end();
  });

  stream.on('error', err => {
    console.error(err);

    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
  });
  stream.pipe( res, false );
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
// [END app]

module.exports = app;
