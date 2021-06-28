'use strict';

const ytdl = require('ytdl-core');
const fs = require('fs');
const md5 = require('md5');
const express = require('express');
const responseRange = require('express-response-range');
const slice = require('stream-slice').slice;

const app = express();
app.use(express.static('./webapp/dist'));
app.use(responseRange({defaultLimit: 1024 * 1024}));

const mp4response = (path, req, res) => {
  // console.log('mp4response');
  console.log(' headers.range', req.headers.range);
  console.log(' req.range', req.range);

  const stat = fs.statSync(path);
  const tmpDirFile = fs.createReadStream( path );
  tmpDirFile.on('error', (error) => {
      console.error(`${error}`);
      res.writeHead(500, {'Content-Type' : 'text/plain'});
      res.write(`500 error ${error}`);
      res.end();
  });
  tmpDirFile.on('end', () => {
    console.log('end');
    res.end();
  });

  if (req.headers.range) {
    const headers = {
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${req.range.offset}-${req.range.offset + req.range.limit - 1}/${stat.size}`,
      'Content-Length': req.range.limit
    };
    console.log('headers', headers);
    res.writeHead(206, headers);
    tmpDirFile
      .pipe(slice(req.range.offset, req.range.offset + req.range.limit))
      .pipe(res)
      
    return;
  }
  const headers = {
    'Content-Type': 'video/mp4',
    'Content-Length': stat.size
  }
  res.writeHead(200, headers);
  tmpDirFile.pipe(res);
}

app.get('/:videoid', async (req, res) => {
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }

  const md5VideoId = md5(req.params.videoid);
  const tmpDirFilePath = `/tmp/${md5VideoId}.mp4`;
  const exists = fs.existsSync(tmpDirFilePath);

  console.log('req videoid', req.params.videoid);

  if (exists == true) {
    // 既にファイルが有った場合
    mp4response(tmpDirFilePath, req, res);
  }
  else {
    console.log('download videoid', req.params.videoid);

    // ファイルがダウンロードされてない場合は ダウンロードする
    const info = await ytdl.getInfo(req.params.videoid);
    const format = ytdl.chooseFormat(info.formats, { quality: 'lowest' });
    // console.log('info.formats', info.formats); lowest
    // console.log('Format found!', format);
    const stream = ytdl(`http://www.youtube.com/watch?v=${req.params.videoid}`, { format: format });
    stream.once('progress', (chunkLength, downloaded, total) => {
      console.log('progress', total);
    });

    stream.on('data', (chunk) => {
      console.log('data', chunk.length);
    });

    stream.on('end', () => {
      console.log('end');

      // ダウンロード終了 レスポンス生成
      mp4response(tmpDirFilePath, req, res);
    });

    stream.on('error', err => {
      console.error(err);

      console.error(`${error}`);
      res.writeHead(500, {'Content-Type' : 'text/plain'});
      res.write(`500 error ${error}`);
      res.end();      
    });

    // /temp に mp4 ファイルをダウンロードする
    stream.pipe( fs.createWriteStream( tmpDirFilePath ) );
  }
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
// [END app]

module.exports = app;
