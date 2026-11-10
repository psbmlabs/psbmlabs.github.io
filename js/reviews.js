/* PSBM Labs — Review / Comment / Suggestion popup for the Apps page.
   Data lives in the Google Sheet "Reviews" tab through the same Apps Script web app as the rest of the site (apps-script/Code.gs).
   Loaded by js/sheet.js on pages that have the app grid. Emails are sent to the sheet only and are never shown on the site. */
(function(){
if(window.__psbmRv)return;window.__psbmRv=1;
var PER=30,MAXMSG=1000,HOLD=450,TMO=10000;
var sc=document.currentScript,base=(sc&&sc.src)?sc.src.replace(/js\/reviews\.js.*$/,''):'';
var E=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var TYPES={review:['Review','⭐'],comment:['Comment','💬'],suggestion:['Suggestion','💡']};
var API=null,ov,box,app=null,st=null,opener=null;

/* ---------- styles ---------- */
var css='.rv-ov{position:fixed;inset:0;z-index:2000;display:none;align-items:center;justify-content:center;padding:1rem;background:rgba(7,20,43,.55);backdrop-filter:blur(3px)}.rv-ov.on{display:flex}'
+'.rv-box{position:relative;width:min(720px,100%);max-height:min(92vh,880px);display:flex;flex-direction:column;background:#fff;color:#0b1b33;border-radius:20px;box-shadow:0 30px 80px -20px rgba(7,20,43,.55);overflow:hidden;font-family:Inter,system-ui,sans-serif;animation:rvIn .28s cubic-bezier(.2,.8,.2,1)}'
+'@keyframes rvIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}'
+'.rv-head{display:flex;align-items:flex-start;gap:.8rem;padding:1.1rem 1.3rem .9rem;border-bottom:1px solid rgba(11,27,51,.1)}'
+'.rv-head h2{margin:0;font:800 1.1rem/1.25 Sora,Inter,sans-serif;color:#0b1b33}.rv-sum{margin-top:.3rem;display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:#4d5d78;flex-wrap:wrap}'
+'.rv-x{margin-left:auto;flex:none;width:36px;height:36px;border-radius:10px;border:1px solid rgba(11,27,51,.15);background:#fff;color:#0b1b33;font-size:1.15rem;line-height:1;cursor:pointer}.rv-x:hover{background:#f1f4fb}'
+'.rv-scroll{overflow-y:auto;overscroll-behavior:contain;padding:1rem 1.3rem 1.4rem;-webkit-overflow-scrolling:touch}'
+'.rv-form{border:1px solid rgba(11,27,51,.12);border-radius:16px;padding:1rem;background:#f8f9fd}.rv-form h3{margin:0 0 .7rem;font:700 .95rem Sora,Inter,sans-serif}'
+'.rv-seg{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.7rem}.rv-seg button{flex:1 1 0;min-width:96px;padding:.5rem .6rem;border-radius:11px;border:1px solid rgba(11,27,51,.16);background:#fff;color:#4d5d78;font:700 .82rem Inter,sans-serif;cursor:pointer}'
+'.rv-seg button.on{background:#eef0ff;border-color:#9aa6ff;color:#3730a3}'
+'.rv-star-in{display:flex;gap:.15rem;margin:0 0 .7rem}.rv-star-in button{border:0;background:none;padding:.1rem;font-size:1.7rem;line-height:1;color:#cfd6e8;cursor:pointer}.rv-star-in button.on{color:#f5a623}'
+'.rv-row{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.6rem}@media(max-width:560px){.rv-row{grid-template-columns:1fr}}'
+'.rv-form label{display:block;font-size:.74rem;font-weight:700;color:#4d5d78;margin:0 0 .25rem}.rv-form input[type=text],.rv-form input[type=email],.rv-form textarea{width:100%;border-radius:10px;padding:.55rem .7rem;font:500 .9rem Inter,sans-serif;box-sizing:border-box}'
+'.rv-form textarea{min-height:92px;resize:vertical}.rv-form [aria-invalid=true]{border-color:#dc2626!important}'
+'.rv-foot{display:flex;align-items:center;gap:.7rem;margin-top:.6rem;flex-wrap:wrap}.rv-cnt{margin-left:auto;font-size:.72rem;color:#7a89a3}'
+'.rv-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.1rem;border-radius:11px;border:0;background:linear-gradient(135deg,#5b5bf0,#4338ca);color:#fff;font:700 .85rem Inter,sans-serif;cursor:pointer}.rv-btn:disabled{opacity:.6;cursor:default}'
+'.rv-btn.alt{background:#fff;color:#3730a3;border:1px solid #c7cdfa}'
+'.rv-note{font-size:.72rem;color:#7a89a3;margin:.5rem 0 0}.rv-msgbar{font-size:.82rem;font-weight:600;min-height:1.1em;margin-top:.5rem}.rv-msgbar.ok{color:#0f766e}.rv-msgbar.err{color:#b42318}'
+'.rv-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}'
+'.rv-list{margin-top:1.1rem;min-height:140px}.rv-item{display:flex;gap:.7rem;padding:.9rem 0;border-top:1px solid rgba(11,27,51,.09)}.rv-item:first-child{border-top:0}'
+'.rv-av{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font:800 .85rem Sora,sans-serif;color:#fff;background:linear-gradient(135deg,#5b5bf0,#2dd4bf)}.rv-av.sm{width:28px;height:28px;font-size:.72rem}'
+'.rv-body{min-width:0;flex:1}.rv-top{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.rv-nm{font-weight:800;font-size:.9rem}.rv-chip{font-size:.66rem;font-weight:800;padding:.14rem .5rem;border-radius:99px;background:#eef0ff;color:#3730a3;text-transform:uppercase;letter-spacing:.04em}'
+'.rv-chip.t-comment{background:#e6faf6;color:#0b5d52}.rv-chip.t-suggestion{background:#fff4e0;color:#7a5200}.rv-time{font-size:.72rem;color:#7a89a3;margin-left:auto}'
+'.rv-stars{color:#f5a623;font-size:.95rem;letter-spacing:.06em;margin:.15rem 0}.rv-stars i{color:#d8deee;font-style:normal}'
+'.rv-msg{margin:.2rem 0 0;font-size:.9rem;line-height:1.5;color:#26344f;white-space:pre-wrap;overflow-wrap:anywhere}'
+'.rv-act{margin-top:.35rem}.rv-link{border:0;background:none;padding:0;font:700 .76rem Inter,sans-serif;color:#4338ca;cursor:pointer}.rv-link:hover{text-decoration:underline}'
+'.rv-off{margin-top:.6rem;padding:.65rem .8rem;border-radius:12px;background:#eef0ff;border:1px solid #c7cdfa}.rv-badge{display:inline-block;font-size:.66rem;font-weight:800;padding:.14rem .5rem;border-radius:99px;background:#4338ca;color:#fff;margin-bottom:.25rem}'
+'.rv-reps{margin-top:.6rem;display:flex;flex-direction:column;gap:.55rem;padding-left:.2rem;border-left:2px solid rgba(11,27,51,.08)}.rv-rep{display:flex;gap:.55rem;padding-left:.6rem}'
+'.rv-rform{margin-top:.6rem}.rv-more{display:flex;flex-direction:column;align-items:center;gap:.4rem;margin-top:.9rem}.rv-info{font-size:.74rem;color:#7a89a3}'
+'.rv-empty{padding:1.6rem .5rem;text-align:center;color:#4d5d78;font-size:.9rem}.rv-err{padding:1.2rem .5rem;text-align:center;color:#b42318;font-weight:600;font-size:.88rem}.rv-err .rv-btn{margin-top:.6rem}'
+'.rv-list .psbm-loader{padding-top:0}'
+'html.rv-lock,html.rv-lock body{overflow:hidden}'
+'@media(max-width:560px){.rv-ov{padding:0;align-items:flex-end}.rv-box{width:100%;max-height:94vh;border-radius:20px 20px 0 0}}'
+'@media(prefers-reduced-motion:reduce){.rv-box{animation:none}}';
var sty=document.createElement('style');sty.textContent=css;document.head.appendChild(sty);

/* ---------- API ---------- */
function apiUrl(){
  if(API)return Promise.resolve(API);
  if(window.PSBM_API){API=window.PSBM_API;return Promise.resolve(API)}
  return fetch(base+'data/site-config.json',{cache:'no-store'}).then(function(r){return r.json()}).then(function(c){if(!c.appsScript)throw new Error('no api');API=c.appsScript;return API});
}
function timeout(p,ms){return new Promise(function(res,rej){var t=setTimeout(function(){rej(new Error('timeout'))},ms);p.then(function(v){clearTimeout(t);res(v)},function(e){clearTimeout(t);rej(e)})})}
function jsonp(url){return new Promise(function(res,rej){var n='psbmRv'+Date.now()+Math.floor(Math.random()*999),s=document.createElement('script'),done=0;window[n]=function(d){done=1;res(d);s.remove();delete window[n]};s.onerror=function(){rej(new Error('script'));s.remove()};s.src=url+'&callback='+n;document.head.appendChild(s);setTimeout(function(){if(!done){rej(new Error('timeout'));s.remove()}},TMO/2)})}
function list(slug,page){
  return apiUrl().then(function(u){
    var url=u+'?action=reviews&app='+encodeURIComponent(slug)+'&page='+page+'&t='+Date.now();
    return timeout(fetch(url).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}),TMO).catch(function(){return jsonp(url)});
  }).then(function(d){if(!d||!d.ok)throw new Error('bad response');return d});
}
function send(data){
  return apiUrl().then(function(u){
    /* text/plain keeps this a "simple" request: no CORS pre-flight, which Apps Script cannot answer */
    return timeout(fetch(u,{method:'POST',body:JSON.stringify(data)}).then(function(r){return r.json()}),TMO*1.5);
  });
}

/* ---------- mini loader: same look as the page loader (premium.css .psbm-loader), finishes the moment data is here ---------- */
function loader(host){
  var LV=[[['G','Hey… are you coming to me?'],['B','Always. I’m already on my way ♥']],[['B','Can you feel how close I am now?'],['G','Yes… my heart is racing to meet you ♥']],[['G','Don’t stop walking, okay?'],['B','Never. Not until I’m beside you ♥']],[['B','What are you carrying for me?'],['G','Everything we built, wrapped in love ♥']]];
  var pin=function(c,src,alt){return '<div class="pl-pin '+c+'"><div class="pk"><div class="ph"><img src="'+base+'assets/'+src+'" alt="'+alt+'"></div></div></div>'};
  var el=document.createElement('div');el.className='psbm-loader';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.innerHTML='<div class="pl-wrap"><div class="pl-stage" style="--p:0"><div class="pl-track"><i class="pl-fill l"></i><i class="pl-fill r"></i></div><span class="pl-ripple"></span>'
    +pin('l','prothes.jpg','Prothes Barai')+pin('r','shreyasi_madhu_shampa.jpg','Shreyasi Madhu')
    +'<svg class="pl-heart" viewBox="0 0 24 22" aria-hidden="true"><defs><linearGradient id="plHg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7aa8"/><stop offset="1" stop-color="#f43f5e"/></linearGradient></defs><path fill="url(#plHg2)" d="M12 21.2C5.2 15.6 1.5 12 1.5 7.4 1.5 4.2 3.9 2 6.8 2c2 0 3.9 1.1 5.2 3C13.3 3.1 15.2 2 17.2 2c2.9 0 5.3 2.2 5.3 5.4 0 4.6-3.7 8.2-10.5 13.8z"/></svg>'
    +'<span class="pl-mini m1">♥</span><span class="pl-mini m2">♥</span><span class="pl-mini m3">♥</span><span class="pl-mini m4">♥</span><span class="pl-mini m5">♥</span></div>'
    +'<div class="pl-chat"></div><div class="pl-line"><span class="pl-status">Loading</span><b class="pl-pct"><span class="pl-num">0</span><small>%</small></b></div></div>';
  host.innerHTML='';host.appendChild(el);
  var stg=el.querySelector('.pl-stage'),num=el.querySelector('.pl-num'),chat=el.querySelector('.pl-chat'),stat=el.querySelector('.pl-status');
  var cur=0,tgt=8,ease=.12,fin=0,shown=0,rt,lvi=0,t1,t2,t3,raf;
  function bub(m){var b=m[0]==='B',n=document.createElement('div');n.className='pl-bub '+(b?'b':'g');n.innerHTML='<img src="'+base+'assets/'+(b?'prothes.jpg':'shreyasi_madhu_shampa.jpg')+'" alt=""><span></span>';n.lastChild.textContent=m[1];chat.appendChild(n)}
  function talk(p){clearTimeout(rt);chat.innerHTML='';bub(p[0]);rt=setTimeout(function(){if(!fin)bub(p[1])},950)}
  function tick(){if(!el.parentNode)return;var d=tgt-cur;cur+=Math.abs(d)<.25?d:d*ease;num.textContent=Math.round(cur);stg.style.setProperty('--p',(cur/100).toFixed(4));raf=requestAnimationFrame(tick)}
  talk(LV[0]);tick();
  t1=setTimeout(function(){shown=1;el.classList.add('show')},150);
  t2=setInterval(function(){if(!fin){lvi=(lvi+1)%LV.length;talk(LV[lvi])}},2200);
  t3=setInterval(function(){if(tgt<86)tgt+=(88-tgt)*.06},150);
  function stop(){clearTimeout(t1);clearInterval(t2);clearInterval(t3);clearTimeout(rt)}
  return{
    done:function(cb){
      if(fin)return;fin=1;stop();tgt=100;ease=.4;
      if(!shown){cancelAnimationFrame(raf);el.remove();cb&&cb();return}
      (function meet(){if(cur<99.5){setTimeout(meet,30);return}cur=100;stg.style.setProperty('--p',1);num.textContent=100;el.classList.add('love');stat.textContent='Successful';
        setTimeout(function(){el.classList.add('out');setTimeout(function(){cancelAnimationFrame(raf);el.remove();cb&&cb()},220)},HOLD)})();
    },
    kill:function(){fin=1;stop();cancelAnimationFrame(raf);el.remove()}
  };
}

/* ---------- helpers ---------- */
function stars(n){n=Math.max(0,Math.min(5,n|0));return '<span class="rv-stars" role="img" aria-label="'+n+' out of 5 stars">'+'★'.repeat(n)+'<i>'+'★'.repeat(5-n)+'</i></span>'}
function when(iso){var d=new Date(iso);return isNaN(d)?'':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}
function av(name,sm){return '<div class="rv-av'+(sm?' sm':'')+'" aria-hidden="true">'+E((String(name||'?').trim().charAt(0)||'?').toUpperCase())+'</div>'}
function repHtml(r){return '<div class="rv-rep">'+av(r.name,1)+'<div class="rv-body"><div class="rv-top"><span class="rv-nm">'+E(r.name)+'</span><span class="rv-time">'+E(when(r.created))+'</span></div><p class="rv-msg">'+E(r.message)+'</p></div></div>'}
function itemHtml(r){
  var t=TYPES[r.type]||TYPES.comment;
  return '<article class="rv-item" data-id="'+E(r.id)+'">'+av(r.name)+'<div class="rv-body"><div class="rv-top"><span class="rv-nm">'+E(r.name)+'</span><span class="rv-chip t-'+E(r.type)+'">'+t[0]+'</span><span class="rv-time">'+E(when(r.created))+'</span></div>'
    +(r.type==='review'&&r.rating?stars(r.rating):'')+'<p class="rv-msg">'+E(r.message)+'</p>'
    +'<div class="rv-act"><button type="button" class="rv-link rv-rp">Reply</button></div>'
    +(r.reply?'<div class="rv-off"><span class="rv-badge">'+E(r.reply_by||'PSBM Labs')+'</span><p class="rv-msg">'+E(r.reply)+'</p></div>':'')
    +'<div class="rv-reps">'+(r.replies||[]).map(repHtml).join('')+'</div><div class="rv-rform"></div></div></article>';
}
function formHtml(kind){
  var rep=kind==='reply',id=rep?'rr':'rn';
  return '<form novalidate autocomplete="on" data-kind="'+kind+'">'
    +(rep?'':'<div class="rv-seg" role="tablist" aria-label="What would you like to send?">'+Object.keys(TYPES).map(function(k,i){return '<button type="button" role="tab" data-t="'+k+'" class="'+(i===0?'on':'')+'" aria-selected="'+(i===0)+'">'+TYPES[k][1]+' '+TYPES[k][0]+'</button>'}).join('')+'</div>'
      +'<div class="rv-star-in" role="radiogroup" aria-label="Your rating">'+[1,2,3,4,5].map(function(n){return '<button type="button" data-r="'+n+'" aria-label="'+n+' star'+(n>1?'s':'')+'" aria-pressed="false">★</button>'}).join('')+'</div>')
    +'<div class="rv-row"><div><label for="'+id+'N">Your name *</label><input id="'+id+'N" name="name" type="text" maxlength="60" autocomplete="name" required></div>'
    +'<div><label for="'+id+'E">Your email * <span style="font-weight:500">(never shown)</span></label><input id="'+id+'E" name="email" type="email" maxlength="120" autocomplete="email" required></div></div>'
    +'<div><label for="'+id+'M">'+(rep?'Your reply':'Your message')+' *</label><textarea id="'+id+'M" name="message" maxlength="'+MAXMSG+'" required></textarea></div>'
    +'<input class="rv-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'
    +'<div class="rv-foot"><button type="submit" class="rv-btn">'+(rep?'Send reply':'Submit')+'</button>'+(rep?'<button type="button" class="rv-btn alt rv-cancel">Cancel</button>':'')+'<span class="rv-cnt">0 / '+MAXMSG+'</span></div>'
    +'<div class="rv-msgbar" role="status" aria-live="polite"></div></form>';
}

/* ---------- modal ---------- */
function build(){
  ov=document.createElement('div');ov.className='rv-ov';
  ov.innerHTML='<div class="rv-box" role="dialog" aria-modal="true" aria-labelledby="rvTitle"><div class="rv-head"><div><h2 id="rvTitle"></h2><div class="rv-sum"></div></div><button type="button" class="rv-x" aria-label="Close">✕</button></div>'
    +'<div class="rv-scroll"><div class="rv-form"><h3>Share your thoughts</h3><div class="rv-fhost"></div><p class="rv-note">Your email stays private. We only use it to follow up if needed.</p></div><div class="rv-list" aria-live="polite"></div></div></div>';
  document.body.appendChild(ov);box=ov.firstChild;
  ov.querySelector('.rv-fhost').innerHTML=formHtml('new');
  ov.addEventListener('mousedown',function(e){if(e.target===ov)close()});
  ov.querySelector('.rv-x').onclick=close;
  document.addEventListener('keydown',function(e){
    if(!ov.classList.contains('on'))return;
    if(e.key==='Escape'){close();return}
    if(e.key==='Tab'){var f=[].filter.call(box.querySelectorAll('button,input,textarea,a[href]'),function(x){return !x.disabled&&x.offsetParent!==null&&x.tabIndex>=0});if(!f.length)return;var a=f[0],z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
  });
  wireForm(ov.querySelector('form'));
  ov.querySelector('.rv-list').addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('button');if(!b)return;
    if(b.classList.contains('rv-rp')){openReply(b.closest('.rv-item'))}
    else if(b.classList.contains('rv-cancel')){b.closest('.rv-rform').innerHTML=''}
    else if(b.classList.contains('rv-load')){more(b)}
    else if(b.classList.contains('rv-retry')){firstLoad()}
  });
}
function openReply(item){
  var h=item.querySelector('.rv-rform');if(h.firstChild){h.innerHTML='';return}
  document.querySelectorAll('.rv-rform').forEach(function(x){x.innerHTML=''});
  h.innerHTML=formHtml('reply');var f=h.firstChild;wireForm(f,item.dataset.id);f.querySelector('input[name=name]').focus();
}
function wireForm(f,parent){
  var kind=f.dataset.kind,type='review',rating=0,ta=f.querySelector('textarea'),cnt=f.querySelector('.rv-cnt'),bar=f.querySelector('.rv-msgbar'),sub=f.querySelector('.rv-btn[type=submit]'),stars_=f.querySelector('.rv-star-in');
  function syncStars(){[].forEach.call(f.querySelectorAll('.rv-star-in button'),function(b){var on=+b.dataset.r<=rating;b.classList.toggle('on',on);b.setAttribute('aria-pressed',+b.dataset.r===rating)})}
  if(kind==='new'){
    f.querySelector('.rv-seg').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;type=b.dataset.t;
      [].forEach.call(f.querySelectorAll('.rv-seg button'),function(x){var on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-selected',on)});stars_.style.display=type==='review'?'':'none'});
    stars_.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;rating=+b.dataset.r;syncStars()});
  }
  ta.addEventListener('input',function(){cnt.textContent=ta.value.length+' / '+MAXMSG});
  function msg(t,c){bar.textContent=t||'';bar.className='rv-msgbar'+(c?' '+c:'')}
  function bad(el,t){el.setAttribute('aria-invalid','true');msg(t,'err');el.focus()}
  f.addEventListener('submit',function(e){
    e.preventDefault();msg('');[].forEach.call(f.querySelectorAll('[aria-invalid]'),function(x){x.removeAttribute('aria-invalid')});
    var nm=f.elements.name,em=f.elements.email,name=nm.value.trim(),email=em.value.trim(),text=ta.value.trim();
    if(name.length<2)return bad(nm,'Please enter your name.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return bad(em,'Please enter a valid email address.');
    if(kind==='new'&&type==='review'&&!rating){msg('Please give a star rating.','err');stars_.querySelector('button').focus();return}
    if(text.length<3)return bad(ta,'Please write a few words.');
    var data={app:app.slug,type:kind==='reply'?'reply':type,name:name,email:email,message:text,website:f.elements.website.value};
    if(kind==='reply')data.parent=parent;else if(type==='review')data.rating=rating;
    sub.disabled=true;var lbl=sub.textContent;sub.textContent='Sending…';
    send(data).then(function(r){
      if(!r||!r.ok){msg((r&&r.error)||'Could not send. Please try again.','err');return}
      msg(r.pending?'Thank you! Your message will appear after a quick check.':'Thank you! Your message is live.','ok');
      ta.value='';cnt.textContent='0 / '+MAXMSG;
      if(r.hidden||r.pending||!r.item)return;
      if(kind==='reply'){var item=ov.querySelector('.rv-item[data-id="'+parent+'"]');if(item){item.querySelector('.rv-reps').insertAdjacentHTML('beforeend',repHtml(r.item));setTimeout(function(){f.closest('.rv-rform').innerHTML=''},900)}}
      else{addTop(r.item)}
    }).catch(function(){msg('We could not confirm that it was sent. Please check the list in a moment before trying again.','err')})
    .then(function(){sub.disabled=false;sub.textContent=lbl});
  });
}

/* ---------- list ---------- */
function summary(){
  var s=ov.querySelector('.rv-sum');
  s.innerHTML=st.total?((st.rated?stars(Math.round(st.avg))+'<b>'+st.avg.toFixed(1)+'</b> · '+st.rated+' review'+(st.rated>1?'s':'')+' · ':'')+st.total+' conversation'+(st.total>1?'s':'')):'Be the first to share your thoughts';
  var c=document.querySelectorAll('.rv-open[data-app="'+app.slug+'"] .rv-c');[].forEach.call(c,function(x){x.textContent=st.total?' ('+st.total+')':''});
}
function foot(){
  var host=ov.querySelector('.rv-list'),old=host.querySelector('.rv-more');if(old)old.remove();
  if(!st.items.length)return;
  var left=st.total-st.items.length,h=document.createElement('div');h.className='rv-more';
  h.innerHTML=(left>0?'<button type="button" class="rv-btn alt rv-load">Load '+Math.min(PER,left)+' more</button>':'')+'<span class="rv-info">Showing '+st.items.length+' of '+st.total+'</span>';
  host.appendChild(h);
}
function addTop(it){
  if(!st)return;
  var host=ov.querySelector('.rv-list'),e=host.querySelector('.rv-empty');if(e)e.remove();
  var wrap=host.querySelector('.rv-items');if(!wrap){wrap=document.createElement('div');wrap.className='rv-items';host.insertBefore(wrap,host.firstChild)}
  wrap.insertAdjacentHTML('afterbegin',itemHtml(it));st.items.unshift(it);st.total++;
  if(it.type==='review'&&it.rating){var t=st.avg*st.rated+it.rating;st.rated++;st.avg=Math.round(t/st.rated*10)/10}
  summary();foot();
}
function firstLoad(){
  var host=ov.querySelector('.rv-list'),my=app.slug,ld=loader(host);st=null;
  list(my,1).then(function(d){
    if(!app||app.slug!==my){ld.kill();return}
    st={items:d.items.slice(),total:d.total,pages:d.pages,page:1,avg:d.avg||0,rated:d.rated||0};
    ld.done(function(){
      if(!app||app.slug!==my)return;
      host.innerHTML=st.items.length?'<div class="rv-items">'+st.items.map(itemHtml).join('')+'</div>':'<div class="rv-empty">No reviews yet. Be the first to share your thoughts!</div>';
      summary();foot();
    });
  }).catch(function(){
    ld.kill();host.innerHTML='<div class="rv-err">We could not load the conversation right now.<br><button type="button" class="rv-btn alt rv-retry">Try again</button></div>';
  });
}
function more(b){
  var my=app.slug;b.disabled=true;b.textContent='Loading…';
  list(my,st.page+1).then(function(d){
    if(!app||app.slug!==my)return;
    var seen={};st.items.forEach(function(x){seen[x.id]=1});
    var fresh=d.items.filter(function(x){return !seen[x.id]});
    st.page=d.page;st.items=st.items.concat(fresh);st.total=d.total;
    ov.querySelector('.rv-items').insertAdjacentHTML('beforeend',fresh.map(itemHtml).join(''));summary();foot();
  }).catch(function(){b.disabled=false;b.textContent='Could not load. Try again'});
}

function open(slug,name,btn){
  if(!ov)build();
  app={slug:slug,name:name};opener=btn||null;
  ov.querySelector('#rvTitle').textContent='Reviews · '+name;
  ov.querySelector('.rv-sum').textContent='';
  ov.querySelector('.rv-fhost').innerHTML=formHtml('new');wireForm(ov.querySelector('.rv-fhost form'));
  ov.querySelector('.rv-scroll').scrollTop=0;
  ov.classList.add('on');document.documentElement.classList.add('rv-lock');
  var qs=ov.querySelector('.rv-star-in');if(qs)qs.style.display='';
  setTimeout(function(){var x=ov.querySelector('.rv-x');x&&x.focus()},30);
  firstLoad();
}
function close(){
  if(!ov)return;ov.classList.remove('on');document.documentElement.classList.remove('rv-lock');app=null;
  ov.querySelector('.rv-list').innerHTML='';
  if(opener&&document.contains(opener))opener.focus();
}
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('.rv-open');if(!b)return;
  e.preventDefault();open(b.dataset.app,b.dataset.name||'this app',b);
});
})();
