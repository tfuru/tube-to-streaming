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

const careteTmpDirFilePath = (videoid) => {
  const identifier = md5(videoid);
  return {path: `/tmp/${identifier}.mp4`, identifier: identifier};
}

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

const mp4download = async (videoid, path) => {
  return new Promise(async (resolve, reject) => {
    // ファイルがダウンロードされてない場合は ダウンロードする
    const info = await ytdl.getInfo(videoid);
    console.log('video info.formats', info.formats);    
    const format = (info.formats.length > 0) ? ytdl.chooseFormat(info.formats, { quality: '18' }) : null;
    const stream = ytdl(`http://www.youtube.com/watch?v=${videoid}`, { format: format });
    stream.once('progress', (chunkLength, downloaded, total) => {
      console.log('progress', total);
    });

    stream.on('data', (chunk) => {
      console.log('data', chunk.length);
    });

    stream.on('end', () => {
      console.log('end');
      // ダウンロード終了
      resolve();
    });

    stream.on('error', err => {
      console.error(err);
      // エラー発生
      reject(err);
    });

    // /temp に mp4 ファイルをダウンロードする
    stream.pipe( fs.createWriteStream( path ) );    
  });
}

app.get('/:videoid', async (req, res) => {
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }

  const tmpDirFilePath = careteTmpDirFilePath(req.params.videoid);
  const exists = fs.existsSync(tmpDirFilePath.path);
  console.log('req videoid', req.params.videoid);

  if (exists == true) {
    // 既にファイルが有った場合
    mp4response(tmpDirFilePath.path, req, res);
  }
  else {
    console.log('download videoid', req.params.videoid);

    // YouTubeからのファイルダウンロード処理
    mp4download(req.params.videoid, tmpDirFilePath.path)
      .then(() => {
        // ダウンロードしたファイルを出力
        mp4response(tmpDirFilePath.path, req, res);
      })
      .catch((err) => {
        res.writeHead(500, {'Content-Type' : 'text/plain'});
        res.write(`500 error ${err}`);
        res.end();  
      });
  }
});

app.get('/api/convert/last/:videoid', async (req, res) => {
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }

  const tmpDirFilePath = careteTmpDirFilePath(req.params.videoid);
  const exists = fs.existsSync(tmpDirFilePath.path);
  console.log('req videoid', req.params.videoid);

  if (exists == true) {
    // 既にファイルが有った場合
    res
      .status(200)
      .json({ status: "success" });
  }
  else {
    console.log('download videoid', req.params.videoid);

    // YouTubeからのファイルダウンロード処理
    mp4download(req.params.videoid, tmpDirFilePath.path)
      .then(() => {
        // ダウンロード成功
        res
          .status(200)
          .json({ status: "success" });
      })
      .catch((err) => {
        res
          .status(500)
          .json({status: "error", error: err});
      });
  }
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
// [END app]

module.exports = app;
