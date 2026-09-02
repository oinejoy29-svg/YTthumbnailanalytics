const START_DATE = "2026-04-03";
const MEMBERS = [
  "逢田珠里依","天野香乃愛","市原愛弓","江角怜音","大信田美月","大西葵",
  "小澤愛実","髙橋舞","藤沢莉子","村山結香","山田杏佳","山野愛月"
];

let DATA = {subscribers:[], videos:[], updatedAt:null};
let subsChart, newSubsChart;
let rangeDays = 30;
let rangeOffset = 0;

const $ = id => document.getElementById(id);
const fmt = n => Number(n ?? 0).toLocaleString("ja-JP");
const dateObj = s => new Date(`${s}T00:00:00+09:00`);
const ymd = d => {
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const jpDate = s => s ? s.replaceAll("-","/") : "—";

function daysSinceStart(){
  const a=dateObj(START_DATE), b=new Date();
  const todayJST = new Date(b.toLocaleString("en-US",{timeZone:"Asia/Tokyo"}));
  return Math.max(0,Math.floor((todayJST-a)/86400000));
}
function todayJST(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function updateHeader(){
  const t=todayJST();
  $("periodText").textContent=`${jpDate(START_DATE)} 〜 ${t.replaceAll("-","/")}`;
  $("dayCount").textContent=`（${daysSinceStart()}日）`;
  if(DATA.updatedAt){
    $("updatedAt").textContent=new Intl.DateTimeFormat("ja-JP",{timeZone:"Asia/Tokyo",dateStyle:"short",timeStyle:"short"}).format(new Date(DATA.updatedAt));
  }
}
function detectTags(video){
  return MEMBERS.filter(m => `${video.title||""} ${video.description||""}`.includes(m));
}
function normalizeVideos(){
  DATA.videos=(DATA.videos||[]).map(v=>({...v,tags:v.tags?.length?v.tags:detectTags(v)}));
}
function latestRecord(){
  const a=[...(DATA.subscribers||[])].sort((x,y)=>x.date.localeCompare(y.date));
  return a[a.length-1];
}
function previousRecord(date){
  const a=[...(DATA.subscribers||[])].filter(x=>x.date<date).sort((x,y)=>y.date.localeCompare(x.date));
  return a[0];
}
function renderSummary(){
  const latest=latestRecord();
  const current=DATA.currentSubscriberCount ?? latest?.count ?? 0;
  $("currentSubs").textContent=`${fmt(current)}人`;
  if(latest){
    const prev=previousRecord(latest.date);
    const diff=prev ? latest.count-prev.count : 0;
    $("latestNew").textContent=`${diff>=0?"+":""}${fmt(diff)}人`;
    $("latestDate").textContent=`最新日：${jpDate(latest.date)}`;
  }
  const diffs=[];
  const sorted=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  for(let i=1;i<sorted.length;i++) diffs.push(sorted[i].count-sorted[i-1].count);
  $("avgNew").textContent=diffs.length?(diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(1):"0.0";
  $("videoCount").textContent=`${fmt(DATA.videos.length)}本`;
}
function buildRolling(){
  const videos=[...DATA.videos];
  if(!videos.length){
    [0,1,2].forEach(i=>$(`lane${i}`).innerHTML="");
    return;
  }
  const shuffled=videos.sort(()=>Math.random()-.5);
  const lanes=[[],[],[]];
  // A thumbnail is assigned to one lane only, so the three visible streams do not share the same item.
  shuffled.forEach((v,i)=>lanes[i%3].push(v));
  lanes.forEach((arr,i)=>{
    const twice=[...arr,...arr];
    $(`lane${i}`).innerHTML=twice.map(v=>`<img class="thumb-roll" src="${v.thumbnail}" alt="" loading="lazy">`).join("");
  });
}
function renderTags(){
  $("tagSelect").innerHTML='<option value="">すべてのメンバー</option>'+MEMBERS.map(m=>`<option>${m}</option>`).join("");
}
function durationNum(v){return Number(v.durationSeconds||0)}
function renderVideos(){
  const sort=$("sortSelect").value, tag=$("tagSelect").value;
  let list=DATA.videos.filter(v=>!tag || (v.tags||detectTags(v)).includes(tag));
  list.sort((a,b)=>{
    if(sort==="popular") return Number(b.viewCount||0)-Number(a.viewCount||0);
    if(sort==="newest") return String(b.date).localeCompare(String(a.date));
    if(sort==="oldest") return String(a.date).localeCompare(String(b.date));
    if(sort==="longest") return durationNum(b)-durationNum(a);
    return durationNum(a)-durationNum(b);
  });
  $("videoGrid").innerHTML=list.map(v=>`
    <article class="video-card">
      <img src="${v.thumbnail}" alt="" loading="lazy">
      <div class="video-info">
        <div class="video-title">${escapeHtml(v.title||"")}</div>
        <div class="video-meta">${fmt(v.viewCount)}回　・　${jpDate(v.date)}　・　${v.duration||""}</div>
        <div class="tags">${(v.tags||detectTags(v)).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      </div>
    </article>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

function getChartRows(){
  const rows=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(rangeDays==="all") return rows;
  const latest=rows[rows.length-1]?.date || START_DATE;
  const end=new Date(`${latest}T00:00:00+09:00`);
  end.setDate(end.getDate()+rangeOffset*Number(rangeDays));
  const start=new Date(end); start.setDate(start.getDate()-Number(rangeDays)+1);
  return rows.filter(r=>dateObj(r.date)>=start && dateObj(r.date)<=end);
}
function chartVideoTitles(date){
  return DATA.videos.filter(v=>v.date===date).map(v=>v.title);
}
function renderCharts(){
  const rows=getChartRows();
  if(!rows.length)return;
  const all=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  const fixedMin=Math.floor(Math.min(...all.map(r=>r.count))/10)*10;
  const fixedMax=Math.ceil(Math.max(...all.map(r=>r.count))/10)*10+10;
  const labels=rows.map(r=>jpDate(r.date));
  const pointColors=rows.map(r=>chartVideoTitles(r.date).length?"#FF3030":"#FFF36A");
  const borderColors=rows.map(r=>chartVideoTitles(r.date).length?"#FF3030":"#111");
  const common={responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{display:false},tooltip:{
    callbacks:{label:(ctx)=>{
      const r=rows[ctx.dataIndex], titles=chartVideoTitles(r.date);
      let text=` 登録者数：${fmt(r.count)}人`;
      if(titles.length) text+=`\n🎬 ${titles.join("\n🎬 ")}`;
      return text;
    }}
  }},scales:{x:{ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:10},grid:{display:false}},y:{min:fixedMin,max:fixedMax,ticks:{callback:v=>fmt(v)}}}};
  if(subsChart)subsChart.destroy();
  subsChart=new Chart($("subsChart"),{type:"line",data:{labels,datasets:[{data:rows.map(r=>r.count),borderColor:"#111",backgroundColor:"#111",pointBackgroundColor:pointColors,pointBorderColor:borderColors,pointRadius:5,pointHoverRadius:7,tension:.28,borderWidth:2}]},options:common});
  if(newSubsChart)newSubsChart.destroy();
  const newVals=rows.map(r=>{const p=previousRecord(r.date);return p?r.count-p.count:0});
  newSubsChart=new Chart($("newSubsChart"),{type:"bar",data:{labels,datasets:[{data:newVals,backgroundColor:rows.map(r=>chartVideoTitles(r.date).length?"#FF3030":"#FFF36A"),borderColor:"#111",borderWidth:1}]},options:{...common,plugins:{...common.plugins,tooltip:{callbacks:{label:(ctx)=>` 新規登録者数：${ctx.raw>=0?"+":""}${fmt(ctx.raw)}人`,afterBody:(items)=>{const r=rows[items[0].dataIndex];const titles=chartVideoTitles(r.date);return titles.length?titles.map(t=>`🎬 ${t}`):[]}}}}}});
  const validNewVals=newVals.slice(1);
  const periodTotal=validNewVals.reduce((a,b)=>a+b,0);
  const periodAverage=validNewVals.length?periodTotal/validNewVals.length:0;
  $("periodAverage").textContent=`平均：${periodAverage.toFixed(1)}人/日`;
  $("periodTotal").textContent=`累計：${periodTotal>=0?"+":""}${fmt(periodTotal)}人`;
  const first=rows[0].date,last=rows[rows.length-1].date;
  $("rangeLabel").textContent=`${jpDate(first)} – ${jpDate(last)}`;
}
function getHistoricalAverage(){
  const rows=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(rows.length<2) return 0;
  const first=dateObj(rows[0].date), last=dateObj(rows[rows.length-1].date);
  const days=Math.max(1,Math.round((last-first)/86400000));
  return (rows[rows.length-1].count-rows[0].count)/days;
}
function getWindowStats(n,endIndex=null){
  const rows=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(!rows.length) return null;
  const end=endIndex==null?rows.length:endIndex;
  const arr=rows.slice(Math.max(0,end-n),end);
  if(!arr.length) return null;
  const startIndex=Math.max(0,end-n);
  const startCount=startIndex>0?rows[startIndex-1].count:arr[0].count;
  const total=arr[arr.length-1].count-startCount;
  return {n:arr.length,total,avg:total/Math.max(1,arr.length),start:arr[0].date,end:arr[arr.length-1].date};
}
function compareWindow(n){
  const rows=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  const end=rows.length;
  const recent=getWindowStats(n,end);
  const previous=getWindowStats(n,Math.max(0,end-n));
  if(!recent||!previous||previous.total===0) return null;
  return {recent,previous,rate:(recent.total-previous.total)/Math.abs(previous.total)*100};
}
function bestWindow(n){
  const rows=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(rows.length<n) return null;
  let best=null;
  for(let end=n;end<=rows.length;end++){
    const w=getWindowStats(n,end);
    if(!best||w.total>best.total) best=w;
  }
  return best;
}
function getLatestVideo(){
  if(!DATA.videos?.length) return null;
  return [...DATA.videos].sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
}
function getIncreaseAfterVideo(date,n){
  const rows=[...(DATA.subscribers||[])].sort((a,b)=>a.date.localeCompare(b.date));
  const start=dateObj(date), end=new Date(start);
  end.setDate(end.getDate()+n);
  const before=rows.filter(x=>dateObj(x.date)<start).at(-1);
  const after=rows.filter(x=>dateObj(x.date)<=end).at(-1);
  if(!before||!after) return null;
  return after.count-before.count;
}
function generateTrendAnalysis(){
  const len=DATA.subscribers?.length||0;
  if(len<2) return '登録者データがまだ少ないため、今後データが増えるとチャンネルの傾向を自動分析します。';
  const w7=getWindowStats(Math.min(7,len));
  const hist=getHistoricalAverage();
  const c7=compareWindow(Math.min(7,Math.floor(len/2)));
  let text='';
  if(w7&&w7.avg>hist*1.5&&w7.avg>2) text='🚀 最近は登録者の伸びが大きく加速しています。';
  else if(w7&&w7.avg>hist*1.15) text='📈 最近は歴代平均を上回るペースで登録者が増えています。';
  else if(w7&&w7.avg<hist*.65&&hist>1) text='📉 最近は登録者の増加ペースがやや落ち着いています。';
  else text='➡️ 最近は大きな変動なく、比較的安定したペースで登録者が増えています。';
  if(c7){
    if(c7.rate>=50) text+=` 直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日で、前の${c7.previous.n}日間より${Math.abs(c7.rate).toFixed(0)}%増加しています。`;
    else if(c7.rate<=-30) text+=` 直近${w7.n}日間の平均は＋${w7.avg.toFixed(1)}人/日で、前の${c7.previous.n}日間から${Math.abs(c7.rate).toFixed(0)}%減少しています。`;
    else text+=` 直近${w7.n}日間は平均＋${w7.avg.toFixed(1)}人/日のペースです。`;
  }
  const best=bestWindow(7);
  if(best&&w7&&best.total===w7.total&&best.total>0) text+=' 過去の7日間と比べても最高ペースです。';
  const latestVideo=getLatestVideo();
  if(latestVideo){
    const after=getIncreaseAfterVideo(latestVideo.date,7);
    if(after!==null&&after>0) text+=` 🎬 ${jpDate(latestVideo.date)}の動画投稿後7日間で＋${fmt(after)}人増加しています。`;
  }
  return text;
}
function renderTrendAnalysis(){
  const el=$("trendAnalysis");
  if(el) el.textContent=generateTrendAnalysis();
}
function openCollage(){
  $("collageModal").classList.add("open");
  $("collageModal").setAttribute("aria-hidden","false");
  buildCollagePages();
}
function closeCollage(){
  $("collageModal").classList.remove("open");
  $("collageModal").setAttribute("aria-hidden","true");
}
function buildCollagePages(){
  const pages=Math.max(1,Math.ceil(DATA.videos.length/100));
  $("collagePages").innerHTML=Array.from({length:pages},(_,i)=>`<button class="page-btn ${i===0?"active":""}" data-page="${i}">${i*100+1}〜${Math.min((i+1)*100,DATA.videos.length)}</button>`).join("");
  document.querySelectorAll(".page-btn").forEach(b=>b.onclick=()=>renderCollage(Number(b.dataset.page)));
  renderCollage(0);
}
function renderCollage(page){
  document.querySelectorAll(".page-btn").forEach(b=>b.classList.toggle("active",Number(b.dataset.page)===page));
  const list=DATA.videos.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(page*100,page*100+100);
  $("collageGrid").innerHTML=Array.from({length:100},(_,i)=>list[i]?`<img src="${list[i].thumbnail}" alt="" crossorigin="anonymous">`:"<div style='aspect-ratio:16/9;background:#fff'></div>").join("");
  $("downloadCollage").dataset.page=page;
}
async function downloadCollage(){
  const page=Number($("downloadCollage").dataset.page||0);
  const list=DATA.videos.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(page*100,page*100+100);
  const cellW=320,cellH=180,canvas=document.createElement("canvas");
  canvas.width=cellW*10;canvas.height=cellH*10;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<list.length;i++){
    try{
      const img=await loadImage(list[i].thumbnail);
      ctx.drawImage(img,(i%10)*cellW,Math.floor(i/10)*cellH,cellW,cellH);
    }catch(e){ console.warn("thumbnail skipped",list[i].thumbnail); }
  }
  canvas.toBlob(blob=>{
    if(!blob)return;
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`thumbnail-collection-${page*100+1}-${Math.min(page*100+100,DATA.videos.length)}.png`;a.click();URL.revokeObjectURL(a.href);
  },"image/png");
}
function loadImage(src){
  return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
}
function setupRange(){
  document.querySelectorAll(".preset-group button").forEach(b=>b.onclick=()=>{
    const v=b.dataset.range;rangeDays=v==="all"?"all":Number(v);rangeOffset=0;
    document.querySelectorAll(".preset-group button").forEach(x=>x.classList.toggle("selected",x===b));
    renderCharts();
  });
  $("prevRange").onclick=()=>{if(rangeDays!=="all"){rangeOffset--;renderCharts()}};
  $("nextRange").onclick=()=>{if(rangeDays!=="all"&&rangeOffset<0){rangeOffset++;renderCharts()}};
}
function setupNav(){
  document.querySelectorAll(".switch-btn").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".switch-btn").forEach(x=>x.classList.toggle("active",x===b));
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    $(`${b.dataset.page==="videos"?"videos":"analytics"}Page`).classList.add("active");
    if(b.dataset.page==="analytics")renderCharts();
  });
}
async function init(){
  try{
    const r=await fetch("data.json?ts="+Date.now(),{cache:"no-store"});
    DATA=await r.json();
  }catch(e){console.error(e);return}
  normalizeVideos();updateHeader();renderSummary();renderTags();renderVideos();buildRolling();renderTrendAnalysis();setupRange();setupNav();
  $("sortSelect").onchange=renderVideos;$("tagSelect").onchange=renderVideos;
  $("openCollage").onclick=openCollage;$("closeCollage").onclick=closeCollage;$("downloadCollage").onclick=downloadCollage;
  $("collageModal").onclick=e=>{if(e.target.id==="collageModal")closeCollage()};
}
init();
