'use strict';

const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const md5 = require('md5');
const express = require('express');
const cors = require('cors');
const responseRange = require('express-response-range');
const slice = require('stream-slice').slice;

const app = express();
app.use(express.static('./webapp/dist'));
app.use(responseRange({defaultLimit: 1024 * 1024}));
app.use(cors());

const careteTmpDirFilePath = (userid, videoid) => {
  const identifier = md5(videoid);
  fs.mkdirsSync(`/tmp/${userid}`);
  return {path: `/tmp/${userid}/${identifier}.mp4`, identifier: identifier};
}

const careteTmpDirLastFilePath = (userid) => {
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
    console.log('video formats', formats[0]);
    if (formats[0].isLive) {
      // ライブ配信 の場合
      reject({message:'live is not supported'});
      return;
    }

    const format = (info.formats.length > 0) ? ytdl.chooseFormat(info.formats, { quality: formats[0].itag }) : null;
    const stream = ytdl(`http://www.youtube.com/watch?v=${videoid}`, { format: format });
    stream.once('progress', (chunkLength, downloaded, total) => {
      console.log('progress', total);
    });

    stream.on('data', (chunk) => {
      // console.log('data', chunk.length);
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
app.get('/api/convert/last/:userid/:videoid', async (req, res) => {
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
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
    // last.mp4 を生成する
    careteTmpDirLastFile(req.params.userid, tmpDirFilePath.path)
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
    console.log('download videoid', req.params.videoid);

    // YouTubeからのファイルダウンロード処理
    mp4download(req.params.videoid, tmpDirFilePath.path)
      .then(() => {
        // ダウンロード成功 last.mp4 を生成する
        careteTmpDirLastFile(req.params.userid, tmpDirFilePath.path)
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
});


app.get('/:userid/:videoid', async (req, res) => {
  if (req.params.videoid == '' || req.params.videoid == 'favicon.ico') {
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
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
// [END app]

module.exports = app;
