'use strict';

const ytdl = require('ytdl-core');
const fs = require('fs');
const express = require('express');
const app = express();

app.use(express.static('./webapp/dist'));

app.get('/:videoid', async (req, res) => {
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }
  // console.log('req', req.headers);
  const range = req.headers.range ? req.headers.range.split(/[=-]/) : null;
  console.log('range', range);

  const info = await ytdl.getInfo(req.params.videoid);
  const format = ytdl.chooseFormat(info.formats, { quality: 'lowest' });
  format.hasAudio = true;
  // console.log('info.formats', info.formats);
  // console.log('Format found!', format);

  const stream = ytdl(`http://www.youtube.com/watch?v=${req.params.videoid}`, { format: format });

  stream.once('progress', (chunkLength, downloaded, total) => {
    console.log('progress total', total );
    if (range) {
      // Range ヘッダーがある場合 iosへの対応
      const headers = {
        'Content-Range': `bytes ${range[1]}-${range[2]}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Type': 'video/mp4',
        'Content-Length': range[2]
      };
      res.writeHead(206, headers);
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': total,
    });

  });

  stream.on('data', (chunk) => {
    // console.log('data chunk', chunk );
    if (range) {
      res.write(chunk.slice(range[1], range[2]));
      return;
    }
    res.write(chunk);
  });

  stream.on('close', () => {
    console.log('close');
    res.end();
  });

  stream.on('end', () => {
    console.log('end');
    res.end();
  });

  stream.on('error', err => {
    console.error(err);

    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
  });

  const devnull = fs.createWriteStream('/dev/null');
  stream.pipe( devnull );
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
// [END app]

module.exports = app;
