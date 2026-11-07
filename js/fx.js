(function(){
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var S=['{ }','</>','0 1',';','( )','=>','#','[ ]'];
document.addEventListener('pointerdown',function(e){
  var x=e.clientX,y=e.clientY;
  ['','b'].forEach(function(c){var r=document.createElement('i');r.className='fx-ring '+c;r.style.left=x+'px';r.style.top=y+'px';document.body.appendChild(r);setTimeout(function(){r.remove()},900)});
  for(var i=0;i<9;i++){var p=document.createElement('span'),a=Math.random()*6.28,d=40+Math.random()*60;
    p.className='fx-p';p.textContent=S[Math.floor(Math.random()*S.length)];p.style.left=x+'px';p.style.top=y+'px';
    p.style.setProperty('--dx',Math.cos(a)*d+'px');p.style.setProperty('--dy',Math.sin(a)*d-20+'px');p.style.setProperty('--r',(Math.random()*80-40)+'deg');
    if(i%2)p.style.color='#2dd4bf';document.body.appendChild(p);(function(n){setTimeout(function(){n.remove()},1000)})(p)}
},{passive:true});
document.querySelectorAll('.code').forEach(function(c){var b=document.createElement('button');b.textContent='Copy';b.onclick=function(){navigator.clipboard&&navigator.clipboard.writeText(c.innerText.replace(/Copy$/,'').trim());b.textContent='Copied ✓';setTimeout(function(){b.textContent='Copy'},1500)};c.appendChild(b)});
})();
