#!/usr/bin/env python3
"""data/i18n/bn.json -> js/i18n-bn.js   (run after editing bn.json)"""
import json,os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
d=json.load(open('data/i18n/bn.json',encoding='utf-8'))
open('js/i18n-bn.js','w',encoding='utf-8').write('window.PSBM_BN='+json.dumps(d,ensure_ascii=False)+';')
print(len(d),'translations')
