#!/usr/bin/env python3
"""List every visible English text node that has no Bangla translation yet.
Run: python3 tools/extract_strings.py  -> writes data/i18n/missing.txt (add them to data/i18n/bn.json)"""
import re,glob,json,os,html
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));os.chdir(ROOT)
bn=json.load(open('data/i18n/bn.json',encoding='utf-8')) if os.path.exists('data/i18n/bn.json') else {}
def strings(f):
    s=open(f,encoding='utf-8').read()
    s=re.sub(r'<(script|style|pre)[\s\S]*?</\1>','',s);s=re.sub(r'<!--[\s\S]*?-->','',s)
    out=[]
    for t in re.findall(r'>([^<>]+)<',s):
        t=re.sub(r'\s+',' ',html.unescape(t)).strip()
        if len(t)>1 and re.search('[A-Za-z]{2}',t):out.append(t)
    return out
if __name__=='__main__':
    cnt={};where={}
    for f in glob.glob('*.html')+glob.glob('packages/*.html'):
        for t in set(strings(f)):cnt[t]=cnt.get(t,0)+1;where.setdefault(t,f)
    miss=[(where[t],t) for t in cnt if t not in bn]
    open('data/i18n/missing.txt','w',encoding='utf-8').write('\n'.join(f'{w}\t{t}' for w,t in sorted(miss)))
    print(len(cnt),'strings;',len(miss),'untranslated')
