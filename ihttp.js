let net = require('net');
let {StringDecoder} = require('string_decoder');
let {Readable} = require('stream');

let server = net.createServer(function(socket){
  parser(socket,function(req,res){
    server.emit('request',req,res);
  });
});

server.listen(3000);

server.on('request',function(req,res){
  console.log(req.method);
  console.log(req.url);
  console.log(req.httpVersion);
  console.log(req.headers);

  req.on('data',function(data){
    console.log(data.toString());
  });
  req.on('end',function(){
    console.log('end');
    // 注意顶格
    res.end(`
HTTP/1.1 200 OK
Content-Type:text/plain
Content-Length:9

finished!`)
  })
})
server.on('connection',function(){
  console.log('建立连接');
})

class IncomingMessage extends Readable{
  _read(){}
}

function parser(socket,callback){
  let buffers = [] //每次读取的数据放到数组中
    ,sd = new StringDecoder()
    ,im = new IncomingMessage();

  socket.on('readable',fn) //只想把头读出来，故要精确的读

  function fn(){
    // 调用res.write 就是 调socket.write
    let res = {write:socket.write.bind(socket),end:socket.end.bind(socket)}
    let content = socket.read(); // 默认将缓存区内容读干，读完后如果还有就又会触发readable事件
    buffers.push(content);
    let str = sd.write(Buffer.concat(buffers));
    // console.log(str);
    if(str.match(/\r\n\r\n/)){
      socket.removeListener('readable',fn); //移除监听
      let result = str.split('\r\n\r\n');
      let head = parseHeader(result[0]);
      // console.log(head)
      // curl -v -d 'abc=123' http://localhost:3000
        // { url: '/',
      //   method: 'POST',
      //   httpVersion: '1.1',
      //   headers:
      //   { Host: 'localhost:3000',
      //     'User-Agent': 'curl/7.53.0',
      //     Accept: '*/*',
      //     'Content-Length': '7',
      //     'Content-Type': 'application/x-www-form-urlencoded' } }
      // Object.assign(socket,head);
      Object.assign(im,head);
      // 先默认 socket 就是req对象 （但其实内部又封装了一个可读流 IncomingMessage)
      socket.unshift(Buffer.from(result[1])); //将内容塞回流中
      // callback(socket);
      if(result[1]){ //有请求体
        socket.on('data',function(data){
          im.push(data);
          im.push(null);
          callback(im,res);
        });
      }else{ //没请求体
        im.push(null);
        callback(im,res);
      }

    }
  }

}

function parseHeader(head){
  let lines = head.split(/\r\n/);
  let start = lines.shift();
  let lr = start.split(' ');
  let method = lr[0];
  let url = lr[1];
  let httpVersion = lr[2].split('/')[1];
  let headers = {};
  lines.forEach(line=>{
    let col = line.split(': ');
    headers[col[0]] = col[1];
  });
  return {url,method,httpVersion,headers};
}


//this.RETURN = 0x0d; //13
// this.LINE = 0x0a; //10