'use strict';

const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const md5 = require('md5');
const express = require('express');
const cors = require('cors');
const responseRange = require('express-response-range');
const slice = require('stream-slice').slice;
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
// console.info('process.env', process.env);

const app = express();
app.use(express.static('./webapp/dist'));
app.use(responseRange({defaultLimit: 1024 * 1024}));
app.use(cors());
app.use(express.json());

// タイムアウト時間 5分
const SERVER_TIMEOUT_MSEC = 5 * 60 * 1000;

const careteTmpDirFilePath = (userid, videoid) => {
  const identifier = md5(videoid);
  fs.mkdirsSync(`/tmp/${userid}`);
  fs.chmodSync(`/tmp/${userid}`, '0755');
  return {path: `/tmp/${userid}/${identifier}.mp4`, identifier: identifier};
}

const careteTmpDirLastFilePath = (userid) => {
  fs.mkdirsSync(`/tmp/${userid}`);
  fs.chmodSync(`/tmp/${userid}`, '0755');
  return {path: `/tmp/${userid}/last.mp4`};
}

// `/tmp/[userid]/last.mp4` を 生成する
const careteTmpDirLastFile = (userid, path) => {
  return new Promise((resolve, reject) => {
    const lastFilePath = careteTmpDirLastFilePath(userid);
    fs.copyFile(path, lastFilePath.path, (err) => {
      if (err) {
        // ファイコピーに失敗
        reject(err);
        return;
      }      
      resolve();
    });
  });
}

const mp4response = (path, mime, req, res) => {
  // console.log('mp4response');
  console.log(' headers.range', req.headers.range);
  console.log(' req.range', req.range);

  const stat = fs.statSync(path);
  const tmpDirFile = fs.createReadStream( path, {flags: 'rs+'} );
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

  if (typeof req.headers.range != 'undefined') {
    // req.range.limit = 2 の stat.size が 分割ダウンロードサイズ
    const headers = {
      'Content-Type': mime,
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
  console.log('headers', headers);
  res.writeHead(200, headers);
  tmpDirFile.pipe(res);
}

// B1 等 利用時
app.get('/_ah/start', (req, res) => {
  res.status(200).send('').end();
});

app.get('/_ah/stop', (req, res) => {
  res.status(200).send('').end();
});

app.get('/last', (req, res) => {
  res.redirect("/dummy/last");
});

app.get('/:userid/last', (req, res) => {
  const userid = req.params.userid;
  const path = process.env[`LAST_${userid}`];
  const exists = fs.existsSync( path );
  if (exists == true) {
    // 既にファイルが有った場合
    mp4response(path, 'video/mp4', req, res);
  }
  else {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write(`Not Found ${path}`);
    res.end();
  }
});

// ファイル削除 API
app.get('/:userid/last/delete', (req, res) => {
  const userid = req.params.userid;
  const path = process.env[`LAST_${userid}`];
  const exists = fs.existsSync(path);

  if (exists == true) {
    // 既にファイルが有った場合
    fs.unlinkSync(path);
  }
  // ダウンロード処理をキャンセルする
  process.env[`DL_CANCEL_${userid}`] = true;

  res
    .status(200)
    .json({status: "ok", message: "deleted the file.", path: path});
});

// 指定IDの動画を変換
const convert = async (userid, videoid, res, options = {}) => {
  const tmpDirFilePath = careteTmpDirFilePath(userid, videoid);

  const lastFilePath = careteTmpDirLastFilePath(userid);
  const exists = fs.existsSync(lastFilePath.path);
  if (exists == true) {
    // 既に last ファイルが有った場合 削除
    fs.unlinkSync(lastFilePath.path);
  }

  const info = await ytdl.getInfo(videoid);
  console.log('formats', info.formats);
  process.env[`IS_LIVE_${userid}`] = info.formats[0].isLive;

  // const formats = info.formats.filter((f) => (f.hasVideo == true && f.hasAudio == true));
  // const format = (info.formats.length > 0) ? ytdl.chooseFormat(info.formats, { quality: formats[0].itag }) : null;
  const formats = info.formats.filter((f) => (f.container === 'mp4'));
  const format = formats[0];
  const op = {
    format: format,
  }
  console.log('container', format.container);
  console.log('IS_LIVE', process.env[`IS_LIVE_${userid}`]);

  // /:userid/last の為に 環境変数 LAST に ファイルパスを書き込む
  process.env[`LAST_${userid}`] = tmpDirFilePath.path;
  process.env[`DL_CANCEL_${userid}`] = false;

  const stream = ytdl(`http://www.youtube.com/watch?v=${videoid}`, op);
  stream.on('progress', (chunkLength, downloaded, total) => {
    console.log('progress1', downloaded, total);
    if (process.env[`DL_CANCEL_${userid}`] == true) {
      // ダウンロードキャンセル
      console.log('DOWNLOAD CANCEL');
      stream.destroy();
    }
  });
  
  // そのまま出力
  stream.pipe( fs.createWriteStream(`${tmpDirFilePath.path}`) );

  /*
  process.env.LAST = lastFilePath.path;
  // ライブの場合 mp4 にコンバートする
  ffmpeg({source: stream})
    .on('progress', (progress) => {
      console.log('progress2', progress);
    })
    .videoCodec('copy')
    .audioCodec('copy')
    .format('mp4')
    .save(lastFilePath.path);
  */
  
  // 変換処理がおわるまでディレイ追加
  setTimeout(() =>{
    res.status(200)
    .json({ 
      status: "success",
      identifier: tmpDirFilePath.identifier,
    });
  }, 30 * 1000);
}

app.post('/api/convert/last/:userid/:videoid', (req, res) => {
  console.log("POST", req.body);
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }
  const options = req.body;
  req.setTimeout(0); 
  convert(req.params.userid, req.params.videoid, res, options)
});

app.get('/api/convert/last/:userid/:videoid', (req, res) => {
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }
  req.setTimeout(0);
  convert(req.params.userid, req.params.videoid, res)
});

// cron ダミー実行
app.get('/cron/dummy', (req, res) => {
  res
    .status(200)
    .json({status: "OK"});
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
var server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

// タイムアウト時間を設定
server.timeout = SERVER_TIMEOUT_MSEC;

// [END app]

module.exports = app;
