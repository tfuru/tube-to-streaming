const http = require('http');
const ytdl = require('ytdl-core');

http.createServer((req, res) => {
  console.log("req.url", req.url);
  // http://localhost:8080/aqz-KE-bpKQ
  const videoid = req.url.replace(/^\//, '');
  if (videoid == '' ||  videoid == 'favicon.ico') {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('videoid not found');
    res.end();
    return;
  }

  res.writeHead(200, {'Content-Type': 'video/mp4'});  
  const stream = ytdl(`http://www.youtube.com/watch?v=${videoid}`);
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

}).listen(8080);
