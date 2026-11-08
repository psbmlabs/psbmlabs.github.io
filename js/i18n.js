/* PSBM Labs — English/Bangla switcher. Default: English. Translations: data/i18n/bn.json */
(function(){
if(window.__psbmI18n)return;window.__psbmI18n=1;
var base=document.currentScript.src.replace(/js\/i18n\.js.*$/,'');
var q=new URLSearchParams(location.search).get('lang'),lang=q||localStorage.getItem('psbm_lang')||'en';if(lang!=='bn')lang='en';
var dict=null,loading=null,orig=new WeakMap(),aOrig=new WeakMap(),SKIP={SCRIPT:1,STYLE:1,CODE:1,PRE:1,TEXTAREA:1,NOSCRIPT:1},btn;
var norm=function(s){return s.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim()};
window.psbmLang=function(){return lang};
function tn(n){var p=n.parentNode;if(!p||SKIP[p.nodeName]||(p.closest&&p.closest('.code,.notranslate')))return;
  var o=orig.has(n)?orig.get(n):n.nodeValue,k=norm(o);if(!k)return;
  if(lang==='bn'&&dict&&dict[k]){if(!orig.has(n))orig.set(n,o);var m=o.match(/^(\s*)[\s\S]*?(\s*)$/),v=m[1]+dict[k]+m[2];if(n.nodeValue!==v)n.nodeValue=v}
  else if(orig.has(n)&&n.nodeValue!==orig.get(n))n.nodeValue=orig.get(n)}
function ta(el){['placeholder','title','aria-label'].forEach(function(a){if(!el.hasAttribute||!el.hasAttribute(a))return;var st=aOrig.get(el)||{};if(!(a in st))st[a]=el.getAttribute(a);aOrig.set(el,st);var k=norm(st[a]);
  el.setAttribute(a,(lang==='bn'&&dict&&dict[k])?dict[k]:st[a])})}
function walk(root){if(root.nodeType===3){tn(root);return}if(root.nodeType!==1)return;ta(root);
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n;while(n=w.nextNode())tn(n);root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(ta)}
var mo=new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='childList')m.addedNodes.forEach(walk);else if(m.type==='characterData')tn(m.target)})});
function load(){if(dict)return Promise.resolve();return loading||(loading=fetch(base+'data/i18n/bn.json').then(function(r){return r.json()}).then(function(d){dict={};Object.keys(d).forEach(function(k){dict[norm(k)]=d[k]})}).catch(function(){dict={}}))}
function font(){if(document.getElementById('bnFont'))return;var l=document.createElement('link');l.id='bnFont';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap';document.head.appendChild(l)}
var dd,lab,items;
function ui(){if(!dd)return;lab.textContent=lang==='bn'?'বাংলা':'English';items.forEach(function(b){var on=b.dataset.l===lang;b.classList.toggle('on',on);b.setAttribute('aria-checked',on)})}
function apply(){mo.disconnect();walk(document.body);mo.observe(document.body,{childList:true,subtree:true,characterData:true});ui()}
function cookie(on){var v=on?'/en/bn':'',x=on?'':';expires=Thu, 01 Jan 1970 00:00:00 GMT';document.cookie='googtrans='+v+';path=/'+x;document.cookie='googtrans='+v+';path=/;domain='+location.hostname+x}
function gt(){if(window.__gt)return;window.__gt=1;var d=document.createElement('div');d.id='google_translate_element';d.className='notranslate';d.style.display='none';document.body.appendChild(d);
  document.querySelectorAll('pre,code,.code').forEach(function(n){n.setAttribute('translate','no')});
  window.googleTranslateElementInit=function(){new google.translate.TranslateElement({pageLanguage:'en',includedLanguages:'bn',autoDisplay:false},'google_translate_element');
    var n=0,t=setInterval(function(){var s=document.querySelector('select.goog-te-combo');if(s){clearInterval(t);if(s.value!=='bn'){s.value='bn';s.dispatchEvent(new Event('change'))}}else if(++n>40)clearInterval(t)},250)};
  var s=document.createElement('script');s.src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';s.async=1;document.head.appendChild(s)}
function set(l){var prev=lang;lang=l;localStorage.setItem('psbm_lang',l);cookie(l==='bn');
  if(prev==='bn'&&l==='en'){location.reload();return}
  document.documentElement.lang=l;document.documentElement.classList.toggle('lang-bn',l==='bn');
  (l==='bn'?(font(),load()):Promise.resolve()).then(function(){apply();if(l==='bn')gt();window.dispatchEvent(new Event('langchange'))})}
var GLOBE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',CHEV='<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
function init(){document.querySelectorAll('.lang-dd,.lang-btn').forEach(function(n){n.remove()});
  var ul=document.querySelector('.navbar-nav'),li=document.createElement('li');li.className='nav-item lang-dd notranslate ms-lg-2';
  li.innerHTML='<button type="button" class="lang-trigger" aria-haspopup="menu" aria-expanded="false" aria-label="Language">'+GLOBE+'<span class="lang-label"></span>'+CHEV+'</button><ul class="lang-menu" role="menu"><li role="none"><button type="button" role="menuitemradio" data-l="en"><span>English</span><em>EN</em></button></li><li role="none"><button type="button" role="menuitemradio" data-l="bn"><span>বাংলা</span><em>BN</em></button></li></ul>';
  (ul||document.querySelector('nav')||document.body).appendChild(li);dd=li;lab=li.querySelector('.lang-label');items=[].slice.call(li.querySelectorAll('.lang-menu button'));
  var tg=li.querySelector('.lang-trigger'),close=function(){li.classList.remove('open');tg.setAttribute('aria-expanded','false')};
  tg.onclick=function(e){e.stopPropagation();var o=li.classList.toggle('open');tg.setAttribute('aria-expanded',o)};
  items.forEach(function(b){b.onclick=function(){close();if(b.dataset.l!==lang)set(b.dataset.l)}});
  document.addEventListener('click',function(e){if(!li.contains(e.target))close()});document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  if(lang==='bn')set('bn');else apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
