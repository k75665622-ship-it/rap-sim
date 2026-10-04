const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'dist');
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const f=path.join(root,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('nf');}
  const ext=path.extname(f);
  const ct={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[ext]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':ct});
  fs.createReadStream(f).pipe(res);
}).listen(4173,()=>console.log('up on 4173'));
