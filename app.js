'use strict';

const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const md5 = require('md5');
const express = require('express');
const cors = require('cors');
const responseRange = require('express-response-range');
const slice = require('stream-slice').slice;
const ffmpeg = require('ffmpeg');

const app = express();
app.use(express.static('./webapp/dist'));
app.use(responseRange({defaultLimit: 1024 * 1024}));
app.use(cors());
app.use(express.json());

// タイムアウト時間
const SERVER_TIMEOUT_MSEC = 5 * 60 * 1000;
// 最大ダウンロードファイルサイズ 100MB 5分
const MAX_FILE_SIZE = 1000 * 1024 * 1024;

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

// Range指定で last ファイルを作成する
const careteRangeTmpDirLastFile = (userid, path, options) => {
  console.log('careteRangeTmpDirLastFile', userid, path, options);
  // 指定時間を切り出し
  // https://www.dev-dev.net/entry/2018/04/18/154731
  return new Promise((resolve, reject) => {
    const process = new ffmpeg(path);
    process.then(
      (video) => {
        const lastFilePath = careteTmpDirLastFilePath(userid);
        const exists = fs.existsSync(lastFilePath.path);
        if (exists == true) {
          // 既に last ファイルが有った場合 削除
          fs.unlinkSync(lastFilePath.path);
        }

        // console.log('video', video);
        const ss = options.range.start;
        const t = options.range.end - options.range.start;
        console.log(`ss ${ss} t ${t}`);

        video.addCommand('-ss', `${ss}`);
        video.addCommand('-t', `${t}`);
        // video.addCommand('-c:v', 'copy');
        // video.addCommand('-c:a', 'copy');
        video.addCommand('-f', 'mp4');
        video.save(lastFilePath.path, (error, file) => {
          if (error) {
            console.error('error' + error);
            reject(error);
            return
          }
          console.log('Video file: ' + file);
          resolve();
        });
      },
      (error) => {
        console.error('error', error);
        reject(error);
      }
    );
  })
}

const mp4response = (path, mime, req, res) => {
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
  res.writeHead(200, headers);
  tmpDirFile.pipe(res);
}

const mp4download = async (videoid, path) => {
  return new Promise(async (resolve, reject) => {
    // ファイルがダウンロードされてない場合は ダウンロードする
    const info = await ytdl.getInfo(videoid);
    // console.log('video info.formats', info.formats);
    const formats = info.formats.filter((f) => (f.hasVideo == true && f.hasAudio == true));
    if (formats == null) {
      // フォーマット不明
      reject({message:'format is null.'});
      return;
    }
    // console.log('video formats', formats[0]);
    if (formats[0].isLive) {
      // ライブ配信 の場合
      reject({message:'live is not supported'});
      return;
    }

    const format = (info.formats.length > 0) ? ytdl.chooseFormat(info.formats, { quality: formats[0].itag }) : null;
    const options = {
      format: format,
    }
    const stream = ytdl(`http://www.youtube.com/watch?v=${videoid}`, options);
    stream.on('progress', (chunkLength, downloaded, total) => {
      // console.log('progress', downloaded, total);
      if (downloaded >= MAX_FILE_SIZE) {
        // 指定サイズ ダウンロード終了
        stream.destroy();
        resolve();
      }
    });

    stream.on('data', (chunk) => {
      // console.log('data', chunk.length);
    });

    stream.on('end', () => {
      console.log('end', videoid);
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

app.get('/last', (req, res) => {
  res.redirect("/dummy/last");
});

app.get('/:userid/last', (req, res) => {
  const lastPath = careteTmpDirLastFilePath(req.params.userid);
  const exists = fs.existsSync(lastPath.path);

  if (exists == true) {
    // 既にファイルが有った場合
    mp4response(lastPath.path, 'video/mp4', req, res);
  }
  else {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('Not Found');
    res.end();
  }
});

// ファイル削除 API
app.get('/:userid/last/delete', (req, res) => {
  const lastPath = careteTmpDirLastFilePath(req.params.userid);
  const exists = fs.existsSync(lastPath.path);

  if (exists == true) {
    // 既にファイルが有った場合
    fs.unlinkSync(lastPath.path);
  }

  res
    .status(200)
    .json({status: "ok", message: "deleted the file.", path: lastPath.path});
});

// 指定IDの動画を変換
const convert = (userid, videoid, res, options = {}) => {
  const tmpDirFilePath = careteTmpDirFilePath(userid, videoid);
  let exists = fs.existsSync(tmpDirFilePath.path);
  // console.log('req videoid', videoid);
  if (exists == true) {
    // 既にファイルが有った場合
    if ('range' in options) {
      // TODO options 時間指定で 切り抜く
      careteRangeTmpDirLastFile(userid, tmpDirFilePath.path, options)
      .then(() => {
        res
          .status(200)
          .json({
            status: "success",
            identifier: tmpDirFilePath.identifier
          });
      })
      .catch((err) => {
        console.error('careteTmpDirLastFile', err);
        res
          .status(500)
          .json({status: "error", error: err});
      });
      return;
    }    
    // last.mp4 を生成する
    careteTmpDirLastFile(userid, tmpDirFilePath.path)
      .then(() => {
        res
          .status(200)
          .json({ 
            status: "success",
            identifier: tmpDirFilePath.identifier,
          });
      })
      .catch((err) => {
        res
          .status(500)
          .json({status: "error", error: err});
      });
  }
  else {
    console.log('download videoid', videoid);
    console.log('tmpDirFilePath', tmpDirFilePath.path);
    console.log('options', options);

    // YouTubeからのファイルダウンロード処理
    mp4download(videoid, tmpDirFilePath.path)
      .then(() => {        
        if ('range' in options) {
          // TODO options 時間指定で 切り抜く
          careteRangeTmpDirLastFile(userid, tmpDirFilePath.path, options)
          .then(() => {
            res
              .status(200)
              .json({
                status: "success",
                identifier: tmpDirFilePath.identifier
              });
          })
          .catch((err) => {
            console.error('careteTmpDirLastFile', err);
            res
              .status(500)
              .json({status: "error", error: err});
          });
          return;
        }
        // ダウンロード成功 last.mp4 を生成する
        careteTmpDirLastFile(userid, tmpDirFilePath.path)
          .then(() => {
            res
              .status(200)
              .json({
                status: "success",
                identifier: tmpDirFilePath.identifier
              });
          })
          .catch((err) => {
            console.error('careteTmpDirLastFile', err);
            res
              .status(500)
              .json({status: "error", error: err});
          });
      })
      .catch((err) => {
        console.error('mp4download', err);
        res
          .status(500)
          .json({status: "error", error: err});
      });
  }
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

app.get('/:userid/:videoid', async (req, res) => {
  if (req.params.videoid == '' 
    || req.params.videoid == 'favicon.ico' 
    || req.params.videoid == 'start'
    || req.params.videoid == 'stop') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }

  const tmpDirFilePath = careteTmpDirFilePath(req.params.userid, req.params.videoid);
  const exists = fs.existsSync(tmpDirFilePath.path);
  console.log('req videoid', req.params.videoid);

  if (exists == true) {
    // 既にファイルが有った場合
    mp4response(tmpDirFilePath.path, 'video/mp4', req, res);
  }
  else {
    console.log('download videoid', req.params.videoid);

    // YouTubeからのファイルダウンロード処理
    mp4download(req.params.videoid, tmpDirFilePath.path)
      .then(() => {
        // ダウンロードしたファイルを出力
        mp4response(tmpDirFilePath.path, 'video/mp4', req, res);
      })
      .catch((err) => {
        console.error('mp4download', err);
        res.writeHead(500, {'Content-Type' : 'text/plain'});
        res.write(`500 error ${err}`);
        res.end();
      });
  }
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
