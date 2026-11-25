/* travel-map.js：自页面内联脚本迁移，执行顺序与作用域保持不变。 */

let places=[],filter='all',map,markers,tempMarker,tempPos=null,geoCtx=null,editingIndex=null;

const M=window.MAPDATA;
const PROJ=M.proj;
function project(lng,lat){const x=lng*20037508.34/180;const y=Math.log(Math.tan((90+lat)*Math.PI/360))/(Math.PI/180)*20037508.34/180;const tx=(x-PROJ.minx)*PROJ.scale+PROJ.pad+((PROJ.W-2*PROJ.pad)-(PROJ.maxx-PROJ.minx)*PROJ.scale)/2;const ty=(PROJ.maxy-y)*PROJ.scale+PROJ.pad+((PROJ.H-2*PROJ.pad)-(PROJ.maxy-PROJ.miny)*PROJ.scale)/2;return{x:tx,y:ty};}

// 省份名匹配
function provinceByName(str){if(!str)return null;for(const p of M.provinces){if(str.includes(p.short)||str.includes(p.name))return p;}return null;}
// 最近邻省中心判断归属（兜底）
function nearestProvince(lng,lat){let best=null,bd=1e18;for(const p of M.provinces){if(p.lng==null)continue;const d=(p.lng-lng)*(p.lng-lng)+(p.lat-lat)*(p.lat-lat);if(d<bd){bd=d;best=p;}}return best;}

// 射线法：点是否在多边形环内
function pointInRing(lng,lat,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];if((yi>lat)!==(yj>lat)&&(lng<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;}return inside;}
function pointInPoly(lng,lat,polys){let hits=0;for(const ring of polys){if(pointInRing(lng,lat,ring))hits++;}return hits>0;}
// 精确省份判断（射线法，遍历省界多边形）
function exactProvince(lng,lat){const GEO=window.PROVINCE_GEO;if(!GEO)return null;for(const p of GEO){if(pointInPoly(lng,lat,p.polys))return M.provinces.find(x=>x.name===p.name)||null;}return null;}

function provinceOf(place){let p=provinceByName(place.region);if(!p)p=exactProvince(place.lng,place.lat);if(!p)p=nearestProvince(place.lng,place.lat);return p;}

function distinctProvinces(){const s=new Set();for(const pl of places){const p=provinceOf(pl);if(p)s.add(p.name);}return [...s];}

function render(){const data=places.filter(p=>(filter==='all'||p.type===filter));document.getElementById('placeList').innerHTML=data.map((p,i)=>{const prov=provinceOf(p);const d=p.date?p.date.slice(0,7):'';return `<div class="place" data-idx="${places.indexOf(p)}"><i class="place-dot ${p.type==='城市'?'city':''}"></i><div class="place-body"><strong>${p.name}</strong><small>${prov?prov.short:''}${d?' · '+d:''}</small></div><span class="place-meta">${p.type}</span><button class="place-edit" data-edit="${places.indexOf(p)}">修改</button></div>`}).join('');document.getElementById('empty').style.display=data.length?'none':'block';document.getElementById('empty').textContent=places.length?'该分类下暂无足迹':'还没有足迹，搜索地名或点击地图开始标记吧';document.getElementById('countText').textContent=places.length+' 个标记';document.getElementById('spotNum').textContent=places.length;document.getElementById('cityNum').textContent=places.filter(p=>p.type==='城市').length;const provs=distinctProvinces();document.getElementById('provNum').textContent=provs.length;document.getElementById('provCount').textContent=provs.length+' 个省份';
document.querySelectorAll('.place').forEach(el=>{el.onclick=(e)=>{if(e.target.closest('.place-edit'))return;const p=places[+el.dataset.idx];if(map){map.setCenter(new TMap.LatLng(p.lat,p.lng));map.setZoom(9);}};});document.querySelectorAll('.place-edit').forEach(b=>b.onclick=(e)=>{e.stopPropagation();editPlace(+b.dataset.edit);});
if(markers)markers.setGeometries(places.map((p,i)=>({id:String(i),styleId:p.type==='城市'?'city':'spot',position:new TMap.LatLng(p.lat,p.lng),properties:{title:p.name}})));}

function initMap(){if(!window.TMap)return;map=new TMap.Map('map',{zoom:4,center:new TMap.LatLng(35.8617,104.1954)});
const pin=(c)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="M12 1C6.5 1 3 5 3 9.5 3 15 12 23 12 23s9-8 9-13.5C21 5 17.5 1 12 1z" fill="${c}" stroke="white" stroke-width="3"/></svg>`);
const tempPin='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><circle cx="15" cy="15" r="15" fill="#19a974"/><circle cx="15" cy="15" r="7" fill="#fff"/></svg>');
markers=new TMap.MultiMarker({map,styles:{spot:new TMap.MarkerStyle({width:24,height:24,anchor:{x:12,y:24},src:pin('#2f80ed')}),city:new TMap.MarkerStyle({width:24,height:24,anchor:{x:12,y:24},src:pin('#f2994a')})},geometries:[]});
tempMarker=new TMap.MultiMarker({map,styles:{temp:new TMap.MarkerStyle({width:30,height:30,anchor:{x:15,y:15},src:tempPin})},geometries:[]});
map.on('click',e=>{tempPos={lat:e.latLng.lat,lng:e.latLng.lng};tempMarker.setGeometries([{id:'tmp',styleId:'temp',position:new TMap.LatLng(tempPos.lat,tempPos.lng)}]);openEditor(tempPos);});render();}

function openEditor(pos,prefill){tempPos=pos;geoCtx=prefill&&prefill.geo?prefill.geo:null;editingIndex=(prefill&&prefill.editing!==undefined)?prefill.editing:null;const isEdit=editingIndex!==null;document.getElementById('editorTitle').textContent=isEdit?'修改足迹':'标记新地点';document.getElementById('saveBtn').textContent=isEdit?'保存修改':'保存标记';document.getElementById('deleteBtn').style.display=isEdit?'block':'none';document.getElementById('coordTag').textContent='坐标：'+pos.lat.toFixed(4)+'，'+pos.lng.toFixed(4);document.getElementById('editor').classList.add('open');document.getElementById('nameInput').value=prefill&&prefill.name?prefill.name:'';document.getElementById('typeInput').value=prefill&&prefill.type?prefill.type:'景点';document.getElementById('dateInput').value=prefill&&prefill.date?prefill.date:new Date().toISOString().slice(0,10);document.getElementById('nameInput').focus();const st=document.getElementById('geoStatus');if(prefill&&prefill.geo){const g=prefill.geo;st.textContent='已识别：'+(g.province||'')+(g.city&&g.city!==g.province?' · '+g.city:'')+(g.district?' · '+g.district:'');st.className='geo-status ok';}else if(isEdit){st.textContent='修改后点击「保存修改」生效';st.className='geo-status';}else{st.textContent='正在识别地名…';st.className='geo-status';reverseGeocode(pos);}}
function closeEditor(){document.getElementById('editor').classList.remove('open');tempPos=null;editingIndex=null;if(tempMarker)tempMarker.setGeometries([]);document.getElementById('geoStatus').textContent='';document.getElementById('deleteBtn').style.display='none';}
function reverseGeocode(pos){if(!window.TMap||!TMap.service)return;const st=document.getElementById('geoStatus');new TMap.service.Geocoder({location:new TMap.LatLng(pos.lat,pos.lng)}).getAddress({}).then(res=>{if(res&&res.result){const a=res.result;const nm=a.formatted_addresses&&a.formatted_addresses.recommend||'';const prov=a.address_component&&a.address_component.province||'';const city=a.address_component&&a.address_component.city||'';const district=a.address_component&&a.address_component.district||'';geoCtx={province:prov,city:city,district:district};if(nm&&!document.getElementById('nameInput').value)document.getElementById('nameInput').value=nm;if(prov)st.textContent='识别为：'+prov+(city&&city!==prov?' · '+city:'')+(district?' · '+district:'');st.className='geo-status ok';}else{st.textContent='未识别到地名，可手动填写';}}).catch(()=>{st.textContent='未识别到地名，可手动填写';});}

document.getElementById('cancelBtn').onclick=closeEditor;
document.getElementById('saveBtn').onclick=()=>{const name=document.getElementById('nameInput').value.trim();if(!name)return document.getElementById('nameInput').focus();if(!tempPos)return;let region='';if(geoCtx&&geoCtx.province){const p=provinceByName(geoCtx.province);region=p?p.name:geoCtx.province;}else{const p=exactProvince(tempPos.lng,tempPos.lat)||nearestProvince(tempPos.lng,tempPos.lat);region=p?p.name:'';}const date=document.getElementById('dateInput').value||new Date().toISOString().slice(0,10);const obj={name,region,type:document.getElementById('typeInput').value,date,lat:tempPos.lat,lng:tempPos.lng};if(editingIndex!==null){places[editingIndex]=obj;}else{places.push(obj);}closeEditor();render();};
document.getElementById('deleteBtn').onclick=()=>{if(editingIndex===null)return;places.splice(editingIndex,1);closeEditor();render();};
function editPlace(idx){const p=places[idx];if(!p)return;const pos={lat:p.lat,lng:p.lng};if(map){map.setCenter(new TMap.LatLng(pos.lat,pos.lng));map.setZoom(10);}if(tempMarker)tempMarker.setGeometries([{id:'tmp',styleId:'temp',position:new TMap.LatLng(pos.lat,pos.lng)}]);openEditor(pos,{name:p.name,type:p.type,date:p.date,editing:idx,geo:{province:p.region||'',city:'',district:''}});}
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');filter=c.dataset.filter;render();});

// —— 手动添加：搜索地名 → 候选 → 自动定位 ——
let suggestTimer=null;

// 本地数据库搜索（全国地级市 + 知名景点）
function localSearch(keyword){const D=window.SEARCH_DATA||[];const kw=keyword.toLowerCase();const starts=[],contains=[];for(const it of D){const n=it.name.toLowerCase();if(n.startsWith(kw))starts.push(it);else if(n.includes(kw))contains.push(it);}return [...starts,...contains].slice(0,15);}

// 统一渲染候选列表（本地与网络结果都转成 {name,sub,lat,lng,prov,city,type} 结构）
function renderSuggest(items){const suggest=document.getElementById('suggest');suggest.className='suggest open';suggest.innerHTML=items.map((it,i)=>`<div class="suggest-item" data-i="${i}"><strong>${escapeXml(it.name)}</strong><small>${escapeXml(it.sub||'')}${it.type==='城市'?' · 城市':''}</small></div>`).join('');window.__suggestList=items;document.querySelectorAll('.suggest-item').forEach(el=>el.onclick=()=>pickSuggest(+el.dataset.i));}
function showSuggestEmpty(msg){const suggest=document.getElementById('suggest');suggest.className='suggest open';suggest.innerHTML=`<div class="suggest-empty">${escapeXml(msg)}</div>`;window.__suggestList=[];}

function searchPlaces(keyword){
  // 1. 本地数据库优先（可靠、离线可用）
  const local=localSearch(keyword);
  if(local.length){renderSuggest(local.map(it=>({name:it.name,sub:(it.prov||'')+(it.city&&it.city!==it.prov?' · '+it.city:''),lat:it.lat,lng:it.lng,prov:it.prov,city:it.city,type:it.type})));return;}
  // 2. 本地无结果，调腾讯地图全国搜索（不传 location，避免被限制在周边）
  let svc=null;
  try{ if(window.TMap&&TMap.service&&TMap.service.Search){ svc=new TMap.service.Search({pageSize:10}); } }catch(e){ svc=null; }
  if(!svc||typeof svc.search!=='function'){ showSuggestEmpty('暂未收录，可手动在地图中添加'); return; }
  try{
    svc.search({keyword,pageSize:10}).then(res=>{
      const list=(res&&res.data)||[];
      if(!list.length){showSuggestEmpty('暂未收录，可手动在地图中添加');return;}
      renderSuggest(list.map(poi=>{const ai=poi.ad_info||{};const loc=poi.location;return {name:poi.title,sub:poi.address||'',lat:loc.lat,lng:loc.lng,prov:ai.province||'',city:ai.city||'',type:'景点'};}));
    }).catch(()=>showSuggestEmpty('暂未收录，可手动在地图中添加'));
  }catch(e){ showSuggestEmpty('暂未收录，可手动在地图中添加'); }
}

function pickSuggest(i){const list=window.__suggestList;if(!list||!list[i])return;const it=list[i];const pos={lat:it.lat,lng:it.lng};const suggest=document.getElementById('suggest');suggest.className='suggest';document.getElementById('addInput').value=it.name;const geo={province:it.prov||'',city:it.city||''};if(map){map.setCenter(new TMap.LatLng(pos.lat,pos.lng));map.setZoom(12);}tempPos=pos;if(tempMarker)tempMarker.setGeometries([{id:'tmp',styleId:'temp',position:new TMap.LatLng(pos.lat,pos.lng)}]);openEditor(pos,{name:it.name,type:it.type,geo});}

function onAddInput(){clearTimeout(suggestTimer);const kw=document.getElementById('addInput').value.trim();if(!kw){document.getElementById('suggest').className='suggest';return;}suggestTimer=setTimeout(()=>searchPlaces(kw),200);}
document.getElementById('addInput').oninput=onAddInput;
document.getElementById('addInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const list=window.__suggestList;if(list&&list.length){pickSuggest(0);}else{searchPlaces(document.getElementById('addInput').value.trim());}}};
document.getElementById('addSearchBtn').onclick=()=>{const kw=document.getElementById('addInput').value.trim();if(kw)searchPlaces(kw);};
document.addEventListener('click',e=>{const box=document.querySelector('.add-box');if(box&&!box.contains(e.target))document.getElementById('suggest').className='suggest';});

// —— 分享卡片：中国地图 + 省份高亮 + 城市红点 + 统计 + 足迹清单 ——
function escapeXml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function buildShareSVG(){const provsSet=new Set();const cities=[];const spots=[];for(const pl of places){const p=provinceOf(pl);if(p)provsSet.add(p.name);if(pl.type==='城市')cities.push(pl);else spots.push(pl);}
const provList=[...provsSet].map(n=>{const p=M.provinces.find(x=>x.name===n);return p?p.short:n;});
// 地图区尺寸（原始投影 900x1000 缩放到宽 720）
const scale=0.72,mapW=Math.round(M.viewW*scale),mapH=Math.round(M.viewH*scale);
const marge=48; // 卡片左右边距
const cardW=mapW+marge*2;
const headerH=140; // 标题+统计区
const footTop=headerH+mapH+40;
// 足迹列表高度
const items=places.map(p=>({name:p.name,type:p.type,short:(provinceOf(p)||{}).short||'',date:p.date?p.date.slice(0,7):''}));
const lineH=34,lineW=Math.floor((cardW-20)/2);
const rows=Math.max(1,Math.ceil(items.length/2));

// 省份高亮 + 九段线
const provPaths=M.provinces.map(p=>{const hl=provsSet.has(p.name);return `<path d="${p.path}" fill="${hl?'#ffd9b3':'#eef2f6'}" stroke="${hl?'#f2994a':'#d8e0e8'}" stroke-width="1.2" stroke-linejoin="round" transform="translate(${marge},${headerH}) scale(${scale})"/>`;}).join('');
const jdPath=M.jd?`<path d="${M.jd}" fill="none" stroke="#d8e0e8" stroke-width="1" stroke-dasharray="4 3" transform="translate(${marge},${headerH}) scale(${scale})"/>`:'';
// 城市红点（投影后乘 scale + 平移）
const dots=cities.map(c=>{const pt=project(c.lng,c.lat);const x=marge+pt.x*scale,y=headerH+pt.y*scale;return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="#e5484d" stroke="#fff" stroke-width="2"/>`;}).join('');
// 景点小圆点
const spotDots=spots.map(s=>{const pt=project(s.lng,s.lat);const x=marge+pt.x*scale,y=headerH+pt.y*scale;return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#2f80ed" stroke="#fff" stroke-width="1.8"/>`;}).join('');

// 统计数字
const stat=(num,label,cx,color)=>`<text x="${cx}" y="108" font-family="Arial,sans-serif" font-size="34" font-weight="800" fill="${color}" text-anchor="middle">${num}</text><text x="${cx}" y="132" font-family="PingFang SC,Microsoft YaHei,Arial" font-size="13" fill="#718096" text-anchor="middle">${label}</text>`;
const statCX=[cardW*0.28,cardW*0.5,cardW*0.72];

// 省份清单（chip 样式，每行 6 个）
const provPerRow=6,provRows=Math.max(1,Math.ceil(provList.length/provPerRow));
const chips=provList.map((s,i)=>{const x=marge+10+(i%provPerRow)*((cardW-20)/provPerRow),y=footTop+40+Math.floor(i/provPerRow)*34;return `<text x="${x}" y="${y}" font-family="PingFang SC,Microsoft YaHei,Arial" font-size="13" fill="#b45309">${escapeXml(s)}</text>`;}).join('');
// 足迹明细起始 y
const itemsTop=footTop+40+provRows*34+20;

// 足迹列表（两列）
const itemRows=items.map((it,i)=>{const col=i%2,row=Math.floor(i/2);const x=marge+14+col*lineW;const y=itemsTop+28+row*lineH;const c=it.type==='城市'?'#e5484d':'#2f80ed';return `<circle cx="${x}" cy="${y-4}" r="3.5" fill="${c}"/><text x="${x+11}" y="${y}" font-family="PingFang SC,Microsoft YaHei,Arial" font-size="13" fill="#33465c">${escapeXml(it.name)}${it.short?' · '+escapeXml(it.short):''}${it.date?'  '+it.date:''}</text>`;}).join('');

// 卡片总高（含足迹明细）
const finalCardH=itemsTop+28+rows*lineH+40;

return `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${finalCardH}" viewBox="0 0 ${cardW} ${finalCardH}"><rect width="${cardW}" height="${finalCardH}" fill="#ffffff"/>
<text x="${marge}" y="44" font-family="PingFang SC,Microsoft YaHei,Arial" font-size="28" font-weight="800" fill="#15253b">我的中国足迹</text>
<text x="${marge}" y="70" font-family="PingFang SC,Microsoft YaHei,Arial" font-size="13" fill="#718096">一路走来，点亮每一寸热爱</text>
${stat(provList.length,'省份',statCX[0],'#e5484d')}${stat(cities.length,'城市',statCX[1],'#f2994a')}${stat(places.length,'足迹',statCX[2],'#2f80ed')}
<g>${provPaths}${jdPath}</g><g>${dots}${spotDots}</g>
<line x1="${marge}" y1="${footTop}" x2="${cardW-marge}" y2="${footTop}" stroke="#eef2f6" stroke-width="2"/>
<text x="${marge}" y="${footTop+24}" font-family="PingFang SC,Microsoft YaHei,Arial" font-size="14" font-weight="700" fill="#15253b">已点亮省份</text>
${chips}
<text x="${marge}" y="${itemsTop}" font-family="PingFang SC,Microsoft YaHei,Arial" font-size="14" font-weight="700" fill="#15253b">足迹明细</text>
${itemRows}
<text x="${cardW-marge}" y="${finalCardH-18}" font-family="PingFang SC,Microsoft YaHei,Arial" font-size="11" fill="#c2ccd6" text-anchor="end">行迹 · ${new Date().getFullYear()}</text></svg>`;}

function downloadPNG(svg,w,h){return new Promise((resolve,reject)=>{const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const ctx=c.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);URL.revokeObjectURL(url);c.toBlob(b=>{if(b)resolve(b);else reject(new Error('导出失败'));},'image/png');};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('图片加载失败'));};img.src=url;});}

document.getElementById('shareBtn').onclick=async()=>{try{const svg=buildShareSVG();const w=parseInt(svg.match(/width="(\d+)"/)[1]);const h=parseInt(svg.match(/height="(\d+)"/)[1]);const blob=await downloadPNG(svg,w,h);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='我的中国足迹.png';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}catch(e){alert('生成失败：'+e.message);}};
initMap();
