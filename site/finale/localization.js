const GameL10N=(()=>{
 const params=new URLSearchParams(location.search);
 const fromQuery=params.get('lang');
 if(['zh-Hans','zh-Hant','en'].includes(fromQuery))localStorage.setItem('storyLanguage',fromQuery);
 const lang=['zh-Hans','zh-Hant','en'].includes(localStorage.getItem('storyLanguage'))?localStorage.getItem('storyLanguage'):'zh-Hans';
 document.documentElement.lang=lang;
 const ui={
  'zh-Hans':{title:'我们只在世界毁灭时相见',start:'开始',pause:'暂停',restart:'重试',continue:'继续对话',scene:'互动叙事场景',loading:'正在接续故事…',loadError:'结尾加载失败，请重新打开游戏',nextDay:'翌日',end:'终',you:'你',him:'他',failed:'未启动：',missing:'缺损镜头仍在制作，当前未接完'},
  'zh-Hant':{title:'我們只在世界毀滅時相見',start:'開始',pause:'暫停',restart:'重試',continue:'繼續對話',scene:'互動敘事場景',loading:'正在接續故事…',loadError:'結尾載入失敗，請重新開啟遊戲',nextDay:'翌日',end:'終',you:'你',him:'他',failed:'無法啟動：',missing:'缺損鏡頭仍在製作，尚未接完'},
  en:{title:'We Meet Only When the World Ends',start:'Start',pause:'Pause',restart:'Restart',continue:'Continue dialogue',scene:'Interactive story',loading:'Continuing the story…',loadError:'The ending failed to load. Please reopen the game.',nextDay:'The next day',end:'The End',you:'You',him:'He',failed:'Could not start: ',missing:'This scene is still in production'}
 };
 const t=key=>ui[lang][key]||ui['zh-Hans'][key]||key;
 function lines(){const base=typeof G05_DIALOGUE==='undefined'?[]:G05_DIALOGUE;if(lang==='zh-Hans')return base;const trans=lang==='zh-Hant'?G05_DIALOGUE_ZH_HANT:G05_DIALOGUE_EN;if(trans.length!==base.length)throw Error('Dialogue translation count mismatch');return base.map((line,i)=>({...line,text:trans[i]}));}
 function apply(){document.title=t('title');const start=document.querySelector('#start');if(start)start.textContent=t('start');for(const [id,key] of [['pause','pause'],['restart','restart'],['dialogue','continue']]){const el=document.querySelector('#'+id);if(el)el.setAttribute('aria-label',t(key));}const canvas=document.querySelector('canvas');if(canvas)canvas.setAttribute('aria-label',t('scene'));}
 return{lang,t,lines,apply};
})();
GameL10N.apply();
