/* GramSeva Portal – Village Complaint Redressal System */
const STORE_KEY = 'gramseva_v4';
const YEAR = new Date().getFullYear();
const STATUSES = ['Open','In Progress','Resolved','Rejected'];
const DAY = 86400000;
const CATS = {
  Road:{icon:'ti-road',bg:'#FAECE7',color:'#D85A30'},
  Streetlight:{icon:'ti-bulb',bg:'#FAEEDA',color:'#BA7517'},
  Drainage:{icon:'ti-droplet',bg:'#E6F1FB',color:'#185FA5'},
  'Water Supply':{icon:'ti-wave-square',bg:'#E1F5EE',color:'#0F6E56'},
  Sanitation:{icon:'ti-trash',bg:'#FBEAF0',color:'#993556'},
  Other:{icon:'ti-dots',bg:'#F1EFE8',color:'#5F5E5A'}
};
const BADGE = {Open:'badge-open','In Progress':'badge-prog',Resolved:'badge-done',Rejected:'badge-rej'};
const EV = {
  filed:['Complaint filed','Received and logged'],
  assigned:['Assigned to department','Forwarded to the concerned department'],
  work:['Work in progress','Work has started on site'],
  resolved:['Resolved','Issue fixed and verified'],
  rejected:['Rejected','Reviewed – not under village jurisdiction, redirected to district office'],
  reopened:['Reopened','Complaint reopened by admin']
};
const PATH = {Open:['filed'],'In Progress':['filed','assigned','work'],Resolved:['filed','assigned','work','resolved'],Rejected:['filed','rejected']};
const PENDING = {Open:['assigned','work','resolved'],'In Progress':['resolved'],Resolved:[],Rejected:[]};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function catStyle(c){return CATS[c]||CATS.Other}
function LOCALE(){return window.LANG==='te'?'te-IN':'en-IN';}
function fmtDate(ts){return new Date(ts).toLocaleDateString(LOCALE(),{day:'2-digit',month:'short',year:'numeric'});}
function fmtDT(ts){return fmtDate(ts)+', '+new Date(ts).toLocaleTimeString(LOCALE(),{hour:'2-digit',minute:'2-digit'});}

/* ---------- data ---------- */
function seed(cat,title,desc,village,daysAgo,status,step){
  const created = Date.now()-daysAgo*DAY;
  const events = PATH[status].map((k,i)=>({title:EV[k][0],desc:EV[k][1],ts:created+i*(step||1.5)*DAY}));
  return {cat,title,desc,village,created,status,events};
}
function seedData(){
  const list = [
    seed('Road','Pothole on main road near school','Large pothole causing accidents. Three vehicles damaged this week.','Ward 1, Rampur',12,'Resolved',1.5),
    seed('Streetlight','3 streetlights non-functional','Dark stretch from post office to temple, safety risk at night.','Ward 3, Sundarnagar',9,'In Progress',2),
    seed('Drainage','Blocked drainage causing flooding','Drainage clogged near market area. Flooding after every rain.','Ward 2, Krishnanagar',6,'Open'),
    seed('Water Supply','No water supply for 5 days','Pipeline burst near old well. Entire street without water.','Ward 5, Ambavadi',5,'In Progress',1),
    seed('Sanitation','Garbage not collected for 2 weeks','Waste piling up at community bin. Health hazard.','Ward 4, Ramnagar',4,'Open'),
    seed('Road','Speed bumps needed near school','Vehicles over-speeding in school zone. Children at risk.','Ward 2, Krishnanagar',3,'Rejected',1)
  ];
  // extra sample records so the dashboard looks lived-in (46 resolved in total)
  const T = [
    ['Road','Broken road near bus stand','Road surface broken and uneven, bikes skid during rain.'],
    ['Road','Missing manhole cover on street','Open manhole is dangerous for children and cattle.'],
    ['Streetlight','Streetlight on all night','Light stays on during the day and wastes power.'],
    ['Streetlight','New streetlight needed at lane end','Lane is completely dark after sunset.'],
    ['Drainage','Overflowing drain near houses','Dirty water flows onto the road and enters homes.'],
    ['Drainage','Drain needs cleaning before monsoon','Silt and plastic waste are blocking the drain.'],
    ['Water Supply','Tap water is muddy','Supply water looks dirty and is unsafe to drink.'],
    ['Water Supply','Handpump not working','Common handpump has been broken for a week.'],
    ['Sanitation','Garbage burning near houses','Smoke from burning waste is affecting residents.'],
    ['Sanitation','Public toilet not cleaned','Community toilet is in poor condition.'],
    ['Other','Stray dogs near school','Pack of stray dogs scares children on the way to school.'],
    ['Other','Leaning electric pole','Pole is tilted and wires hang low near the lane.']
  ];
  const V = ['Rampur','Sundarnagar','Krishnanagar','Ambavadi','Ramnagar'];
  const plan = [].concat(Array(45).fill('Resolved'),Array(8).fill('In Progress'),Array(6).fill('Open'),['Rejected']);
  plan.sort((a,b)=>0); // keep order, spread below
  const order = plan.map((st,i)=>[(i*37)%plan.length,st]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  order.forEach((st,i)=>{
    const t = T[i%T.length], v = V[(i*3)%V.length];
    const ago = st==='Resolved' ? 8+((i*7)%80) : st==='In Progress' ? 2+((i*5)%9) : st==='Open' ? 1+(i%6) : 5+(i%8);
    list.push(seed(t[0],t[1],t[2],'Ward '+((i%5)+1)+', '+v,ago,st,1+(i%3)*0.7));
  });
  list.sort((a,b)=>a.created-b.created);
  list.forEach((c,i)=>c.id='GS-'+YEAR+'-'+String(i+1).padStart(4,'0'));
  return list;
}
let complaints = load();
function load(){
  try{const raw=localStorage.getItem(STORE_KEY); if(raw){const d=JSON.parse(raw); if(Array.isArray(d)&&d.length) return d;}}catch(e){}
  return seedData();
}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(complaints));}catch(e){}}
/* save one complaint: cloud (Firebase) if configured, else browser storage */
function persist(c){
  if(window.cloud){ window.cloud.save(c).catch(e=>{console.error(e);toast('Could not save to cloud','warn');}); }
  else save();
}
/* called by cloud.js whenever the shared database changes */
window.onCloudData = function(list){ complaints = list; rerender(); };
function rerender(){
  const act = document.querySelector('.page.active'); if(!act) return;
  const page = act.id.replace('page-','');
  nav(page,true);
  if(page==='track' && document.getElementById('track-result').style.display==='block') doTrack();
}
function mapUrl(c){
  if(c.lat==null||c.lng==null) return '';
  const la=Number(c.lat), ln=Number(c.lng);
  return (isFinite(la)&&isFinite(ln)) ? 'https://www.google.com/maps?q='+la+','+ln : '';
}
function nextId(){
  const nums = complaints.map(c=>parseInt(String(c.id).split('-')[2],10)||0);
  return 'GS-'+YEAR+'-'+String(Math.max(0,...nums)+1).padStart(4,'0');
}

/* ---------- navigation ---------- */
let listFilter = {cat:'',status:''};
function nav(page, keep){
  if(!keep) listFilter = {cat:'',status:''};
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.toggle('active', l.dataset.page===page));
  document.getElementById('page-'+page).classList.add('active');
  if(page==='home') renderHome();
  if(page==='track') renderList();
  if(page==='admin') renderAdmin();
}
function openList(f){ listFilter = Object.assign({cat:'',status:''},f); nav('track',true); window.scrollTo(0,0); }
function filterAndGo(cat){ openList({cat}); }

/* ---------- home ---------- */
function renderHome(){
  const total = complaints.length;
  const prog = complaints.filter(c=>c.status==='In Progress').length;
  const res = complaints.filter(c=>c.status==='Resolved');
  const week = complaints.filter(c=>Date.now()-c.created<=7*DAY).length;
  const times = res.map(c=>(c.events[c.events.length-1].ts-c.created)/DAY);
  const avg = times.length ? (times.reduce((a,b)=>a+b,0)/times.length).toFixed(1)+'d' : '—';
  const set=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
  set('stat-total',total); set('stat-total-sub','↑ '+week+' this week');
  set('stat-prog',prog);
  set('stat-res',res.length); set('stat-res-sub', total? Math.round(res.length/total*100)+'% resolution rate':'—');
  set('stat-avg',avg); set('hero-resolved',res.length);
  const names={Roads:'Road',Streetlights:'Streetlight',Drainage:'Drainage','Water Supply':'Water Supply',Sanitation:'Sanitation',Other:'Other'};
  document.querySelectorAll('.cat-card').forEach(card=>{
    const cat = names[card.querySelector('.cat-name').textContent.trim()];
    const n = complaints.filter(c=>c.cat===cat).length;
    card.querySelector('.cat-count').textContent = n+(n===1?' complaint':' complaints');
  });
  document.getElementById('recent-feed').innerHTML = complaints.slice().sort((a,b)=>b.created-a.created).slice(0,4).map(c=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md)">
      <div style="width:32px;height:32px;border-radius:8px;background:${catStyle(c.cat).bg};display:flex;align-items:center;justify-content:center">
        <i class="ti ${catStyle(c.cat).icon}" aria-hidden="true" style="font-size:16px;color:${catStyle(c.cat).color}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:500;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.title)}</div>
        <div style="font-size:11px;color:var(--color-text-secondary)">${esc(c.id)}</div>
      </div>
      <span class="badge ${BADGE[c.status]}" style="font-size:10px">${esc(c.status)}</span>
    </div>`).join('');
}

/* ---------- track ---------- */
function renderList(){
  const {cat,status} = listFilter;
  const data = complaints.filter(c=>(!cat||c.cat===cat)&&(!status||c.status===status)).sort((a,b)=>b.created-a.created);
  const t = document.getElementById('browse-title');
  t.textContent = (cat||status) ? [status,cat].filter(Boolean).join(' · ')+' complaints' : 'Or browse your complaints';
  document.getElementById('complaints-list').innerHTML = data.length ? data.map(c=>`
    <div class="complaint-card" onclick="quickTrack('${esc(c.id)}')">
      <div class="c-thumb" style="background:${catStyle(c.cat).bg}">
        <i class="ti ${catStyle(c.cat).icon}" aria-hidden="true" style="font-size:22px;color:${catStyle(c.cat).color}"></i>
      </div>
      <div class="c-body">
        <div class="c-top"><span class="c-title">${esc(c.title)}</span><span class="badge ${BADGE[c.status]}">${esc(c.status)}</span></div>
        <div class="c-meta">
          <span><i class="ti ti-map-pin" aria-hidden="true" style="font-size:12px"></i> ${esc(c.village)}</span>
          <span><i class="ti ti-calendar" aria-hidden="true" style="font-size:12px"></i> ${fmtDate(c.created)}</span>
          <span><i class="ti ti-tag" aria-hidden="true" style="font-size:12px"></i> ${esc(c.cat)}</span>
        </div>
      </div>
      <div class="c-right"><div class="c-id">${esc(c.id)}</div><div class="c-date" style="margin-top:6px;color:#1D9E75;font-size:11px">View →</div></div>
    </div>`).join('') : '<div style="padding:24px;text-align:center;color:var(--color-text-secondary)">No complaints found.</div>';
}
function doTrack(){
  const val = document.getElementById('track-id').value.trim().toUpperCase();
  const c = complaints.find(x=>x.id===val);
  document.getElementById('track-result').style.display = c ? 'block' : 'none';
  document.getElementById('track-none').style.display = c ? 'none' : 'block';
  if(c) populateTrack(c);
}
function quickTrack(id){
  nav('track',true);
  document.getElementById('track-id').value = id;
  doTrack();
  window.scrollTo(0,0);
}
function populateTrack(c){
  const st = catStyle(c.cat);
  const icon=document.getElementById('tr-icon');
  icon.innerHTML = `<i class="ti ${st.icon}" aria-hidden="true" style="font-size:22px;color:${st.color}"></i>`;
  icon.style.background = st.bg;
  document.getElementById('tr-title').textContent = c.title;
  const b=document.getElementById('tr-badge'); b.className='badge '+BADGE[c.status]; b.textContent=c.status;
  document.getElementById('tr-desc').textContent = c.desc;
  const mu = mapUrl(c);
  document.getElementById('tr-village').innerHTML = `<i class="ti ti-map-pin" aria-hidden="true" style="font-size:12px"></i> ${esc(c.village)}`+(mu?` · <a href="${mu}" target="_blank" rel="noopener" style="color:#1D9E75">View on map</a>`:'');
  document.getElementById('tr-date').innerHTML = `<i class="ti ti-calendar" aria-hidden="true" style="font-size:12px"></i> Filed: ${fmtDate(c.created)}`;
  document.getElementById('tr-id').textContent = c.id;
  const last = c.events.length-1;
  // green = done, amber = current step, red = rejected, hollow = pending
  const done = c.events.map((t,i)=>{
    const cls = (c.status==='Rejected'&&i===last) ? 'rej' : (i===last&&c.status!=='Resolved') ? 'cur' : 'done';
    return `<div class="tl-item"><div class="tl-dot ${cls}"></div><div class="tl-title">${esc(t.title)}</div><div class="tl-date">${fmtDT(t.ts)}</div><div class="tl-desc">${esc(t.desc)}</div></div>`;
  }).join('');
  const pend = PENDING[c.status].map(k=>`<div class="tl-item"><div class="tl-dot"></div><div class="tl-title" style="color:var(--color-text-tertiary)">${esc(EV[k][0])}</div><div class="tl-date">-</div><div class="tl-desc">Pending</div></div>`).join('');
  document.getElementById('track-timeline').innerHTML = done+pend;
}

/* ---------- admin ---------- */
function renderAdmin(){
  const fc = document.getElementById('filter-cat').value;
  const fs = document.getElementById('filter-status').value;
  const data = complaints.filter(c=>(!fc||c.cat===fc)&&(!fs||c.status===fs)).sort((a,b)=>b.created-a.created);
  document.getElementById('admin-tbody').innerHTML = data.map(c=>`
    <tr>
      <td style="font-size:12px;font-family:var(--font-mono)">${esc(c.id)}</td>
      <td><span style="display:flex;align-items:center;gap:6px"><i class="ti ${catStyle(c.cat).icon}" aria-hidden="true" style="font-size:14px;color:${catStyle(c.cat).color}"></i>${esc(c.cat)}</span></td>
      <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.title)}</td>
      <td>${esc(c.village)}${mapUrl(c)?` <a href="${mapUrl(c)}" target="_blank" rel="noopener" title="Map"><i class="ti ti-map-pin" aria-hidden="true" style="color:#1D9E75"></i></a>`:''}</td>
      <td>${fmtDate(c.created)}</td>
      <td><select class="status-sel" onchange="updateStatus('${esc(c.id)}',this.value)">
        ${STATUSES.map(s=>`<option value="${s}" ${c.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
    </tr>`).join('');
}
function updateStatus(id,status){
  const c = complaints.find(x=>x.id===id);
  if(!c||c.status===status) return;
  const prev = c.status; c.status = status;
  const add = k=>c.events.push({title:EV[k][0],desc:EV[k][1],ts:Date.now()});
  if(status==='Open') add('reopened');
  else if(status==='In Progress'){ if(prev==='Open') add('assigned'); add('work'); }
  else if(status==='Resolved'){ if(prev==='Open'){add('assigned');add('work');} add('resolved'); }
  else add('rejected');
  persist(c);
  toast('Status updated to "'+status+'" for '+id);
}

/* ---------- submit ---------- */
function handleFile(input){
  if(input.files[0]) document.getElementById('upload-label').textContent='📷 '+input.files[0].name;
}
let loc = null;
function getLocation(){
  const st = document.getElementById('loc-status');
  if(!navigator.geolocation){ st.textContent='Location not supported'; return; }
  st.textContent='Getting location…';
  navigator.geolocation.getCurrentPosition(
    p=>{ loc={lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6)}; st.textContent='Location added ✓'; },
    ()=>{ loc=null; st.textContent='Location blocked – please allow location access'; },
    {enableHighAccuracy:true,timeout:10000});
}
async function submitComplaint(){
  const name = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const cat = document.getElementById('f-cat').value;
  const desc = document.getElementById('f-desc').value.trim();
  const village = document.getElementById('f-village').value.trim();
  if(!name||!cat||!desc||!village){toast('Please fill all required fields','warn');return;}
  if(!/^\d{10}$/.test(phone)){toast('Enter a valid 10-digit mobile number','warn');return;}
  let id;
  try{ id = window.cloud ? await window.cloud.newId() : nextId(); }
  catch(e){ console.error(e); toast('Could not save to cloud','warn'); return; }
  const now = Date.now();
  const c = {id,cat,title:desc.slice(0,50)+(desc.length>50?'...':''),desc,village,name,phone,created:now,status:'Open',
    events:[{title:EV.filed[0],desc:EV.filed[1],ts:now}]};
  if(loc){ c.lat=loc.lat; c.lng=loc.lng; }
  complaints.push(c);
  persist(c);
  ['f-name','f-phone','f-village','f-desc'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('f-cat').value='';
  document.getElementById('file-in').value='';
  document.getElementById('upload-label').textContent='Click to upload photo evidence';
  loc=null; document.getElementById('loc-status').textContent='';
  toast('Complaint filed! Your ID: '+id);
  setTimeout(()=>quickTrack(id),1200);
}

let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent=msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3000);
}

renderHome();

/* ================= English / తెలుగు toggle ================= */
/* English / తెలుగు toggle – translates the page without touching the HTML */
window.LANG = localStorage.getItem('gs_lang') || 'en';

const D = {
  'GramSeva Portal':'గ్రామసేవ పోర్టల్',
  'Village Complaint Redressal System — citizen portal for reporting and tracking local infrastructure issues':'గ్రామ ఫిర్యాదుల పరిష్కార వ్యవస్థ — స్థానిక మౌలిక సదుపాయాల సమస్యలపై ఫిర్యాదు చేసి ట్రాక్ చేసే పౌర పోర్టల్',
  'Home':'హోమ్','File Complaint':'ఫిర్యాదు చేయండి','Track':'ట్రాక్','Admin':'అడ్మిన్','New Complaint':'కొత్త ఫిర్యాదు',
  'Report. Track. Resolve.':'ఫిర్యాదు చేయండి. ట్రాక్ చేయండి. పరిష్కరించండి.',
  'Raise infrastructure complaints for your village — roads, drainage, streetlights and more. Track progress in real time.':'మీ గ్రామంలోని రోడ్లు, డ్రైనేజీ, వీధి దీపాలు మొదలైన మౌలిక సదుపాయాల సమస్యలపై ఫిర్యాదు చేయండి. పురోగతిని ప్రత్యక్షంగా ట్రాక్ చేయండి.',
  'File a Complaint':'ఫిర్యాదు చేయండి','Track Status':'స్థితిని చూడండి','Issues resolved':'పరిష్కరించిన సమస్యలు',
  'Total Complaints':'మొత్తం ఫిర్యాదులు','In Progress':'పురోగతిలో ఉంది','Active work orders':'కొనసాగుతున్న పనులు',
  'Resolved':'పరిష్కరించబడింది','Avg. Resolution':'సగటు పరిష్కార సమయం','Days per issue':'ఒక్కో సమస్యకు రోజులు',
  'Issue Categories':'సమస్యల విభాగాలు','Roads':'రోడ్లు','Streetlights':'వీధి దీపాలు','Drainage':'డ్రైనేజీ',
  'Water Supply':'నీటి సరఫరా','Sanitation':'పారిశుద్ధ్యం','Other':'ఇతర','Recent Activity':'ఇటీవలి కార్యకలాపాలు',
  'File a new complaint':'కొత్త ఫిర్యాదు నమోదు చేయండి',
  "Fill in the details below. You'll receive a complaint ID to track progress.":'కింద వివరాలు నింపండి. పురోగతిని ట్రాక్ చేయడానికి మీకు ఫిర్యాదు ID వస్తుంది.',
  'Full name':'పూర్తి పేరు','Mobile number':'మొబైల్ నంబర్','Village / Ward':'గ్రామం / వార్డు','Issue category':'సమస్య విభాగం',
  'Select category':'విభాగాన్ని ఎంచుకోండి','Road':'రోడ్డు','Streetlight':'వీధి దీపం','Complaint description':'ఫిర్యాదు వివరణ',
  'Use my location':'నా లొకేషన్ ఉపయోగించండి','Upload photo':'ఫోటో అప్‌లోడ్',
  'Click to upload photo evidence':'ఫోటో ఆధారం అప్‌లోడ్ చేయడానికి క్లిక్ చేయండి','JPG, PNG up to 5 MB':'JPG, PNG గరిష్టంగా 5 MB',
  'Submit Complaint':'ఫిర్యాదు సమర్పించండి','Track your complaint':'మీ ఫిర్యాదును ట్రాక్ చేయండి',
  'Enter your complaint ID to view real-time status and updates.':'ప్రస్తుత స్థితి, అప్‌డేట్లు చూడటానికి మీ ఫిర్యాదు ID నమోదు చేయండి.',
  'Progress timeline':'పురోగతి టైమ్‌లైన్',
  'No complaint found with that ID. Please check and try again.':'ఆ ID తో ఫిర్యాదు కనబడలేదు. దయచేసి సరిచూసి మళ్లీ ప్రయత్నించండి.',
  'Or browse your complaints':'లేదా ఫిర్యాదుల జాబితా చూడండి',
  'Admin dashboard':'అడ్మిన్ డాష్‌బోర్డ్','Manage and update complaint statuses':'ఫిర్యాదుల స్థితిని నిర్వహించండి, అప్‌డేట్ చేయండి',
  'All categories':'అన్ని విభాగాలు','All statuses':'అన్ని స్థితులు','Open':'తెరిచి ఉంది','Rejected':'తిరస్కరించబడింది',
  'Category':'విభాగం','Description':'వివరణ','Village':'గ్రామం','Filed':'నమోదైన తేదీ','Status':'స్థితి',
  /* timeline */
  'Complaint filed':'ఫిర్యాదు నమోదైంది','Received and logged':'స్వీకరించి నమోదు చేశాం',
  'Assigned to department':'విభాగానికి కేటాయించబడింది','Forwarded to the concerned department':'సంబంధిత విభాగానికి పంపబడింది',
  'Work in progress':'పని జరుగుతోంది','Work has started on site':'స్థలంలో పని ప్రారంభమైంది',
  'Issue fixed and verified':'సమస్య పరిష్కరించి ధృవీకరించబడింది',
  'Reviewed – not under village jurisdiction, redirected to district office':'పరిశీలించాం – గ్రామ పరిధిలో లేదు, జిల్లా కార్యాలయానికి పంపబడింది',
  'Reopened':'మళ్లీ తెరవబడింది','Complaint reopened by admin':'అడ్మిన్ ఫిర్యాదును మళ్లీ తెరిచారు','Pending':'పెండింగ్',
  /* misc dynamic */
  'View →':'చూడండి →','No complaints found.':'ఫిర్యాదులు కనబడలేదు.','View on map':'మ్యాప్‌లో చూడండి',
  'Getting location…':'లొకేషన్ తీసుకుంటున్నాం…','Location added ✓':'లొకేషన్ జోడించబడింది ✓',
  'Location blocked – please allow location access':'లొకేషన్ అనుమతించలేదు – దయచేసి అనుమతి ఇవ్వండి',
  'Location not supported':'ఈ పరికరంలో లొకేషన్ సపోర్ట్ లేదు',
  'Please fill all required fields':'దయచేసి అన్ని వివరాలు నింపండి',
  'Enter a valid 10-digit mobile number':'సరైన 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి',
  'Could not save to cloud':'క్లౌడ్‌లో సేవ్ చేయలేకపోయాం',
  /* sample complaints */
  'Pothole on main road near school':'పాఠశాల దగ్గర ప్రధాన రోడ్డుపై గుంత',
  'Large pothole causing accidents. Three vehicles damaged this week.':'పెద్ద గుంత వల్ల ప్రమాదాలు జరుగుతున్నాయి. ఈ వారం మూడు వాహనాలు దెబ్బతిన్నాయి.',
  '3 streetlights non-functional':'3 వీధి దీపాలు పనిచేయడం లేదు',
  'Dark stretch from post office to temple, safety risk at night.':'పోస్టాఫీసు నుండి గుడి వరకు చీకటిగా ఉంది, రాత్రిపూట భద్రతకు ప్రమాదం.',
  'Blocked drainage causing flooding':'డ్రైనేజీ మూసుకుపోయి నీరు నిలుస్తోంది',
  'Drainage clogged near market area. Flooding after every rain.':'మార్కెట్ ప్రాంతం దగ్గర డ్రైనేజీ మూసుకుపోయింది. ప్రతి వర్షానికి నీరు నిలుస్తోంది.',
  'No water supply for 5 days':'5 రోజులుగా నీటి సరఫరా లేదు',
  'Pipeline burst near old well. Entire street without water.':'పాత బావి దగ్గర పైపులైన్ పగిలింది. వీధి మొత్తానికి నీరు లేదు.',
  'Garbage not collected for 2 weeks':'2 వారాలుగా చెత్త తీసుకెళ్లడం లేదు',
  'Waste piling up at community bin. Health hazard.':'సామూహిక చెత్త డబ్బా దగ్గర వ్యర్థాలు పేరుకుపోతున్నాయి. ఆరోగ్యానికి హానికరం.',
  'Broken road near bus stand':'బస్టాండ్ దగ్గర రోడ్డు పగిలిపోయింది','Road surface broken and uneven, bikes skid during rain.':'రోడ్డు ఉపరితలం పగిలి ఎగుడుదిగుడుగా ఉంది, వర్షంలో బైకులు జారుతున్నాయి.',
  'Missing manhole cover on street':'వీధిలో మ్యాన్‌హోల్ మూత లేదు','Open manhole is dangerous for children and cattle.':'తెరిచి ఉన్న మ్యాన్‌హోల్ పిల్లలకు, పశువులకు ప్రమాదకరం.',
  'Streetlight on all night':'వీధి దీపం రోజంతా వెలుగుతోంది','Light stays on during the day and wastes power.':'పగలు కూడా దీపం వెలుగుతూ కరెంటు వృథా అవుతోంది.',
  'New streetlight needed at lane end':'వీధి చివర కొత్త దీపం కావాలి','Lane is completely dark after sunset.':'సూర్యాస్తమయం తర్వాత వీధి పూర్తిగా చీకటిగా ఉంటుంది.',
  'Overflowing drain near houses':'ఇళ్ల దగ్గర డ్రైనేజీ పొంగిపొర్లుతోంది','Dirty water flows onto the road and enters homes.':'మురుగునీరు రోడ్డుపైకి వచ్చి ఇళ్లలోకి చేరుతోంది.',
  'Drain needs cleaning before monsoon':'వర్షాకాలానికి ముందు డ్రైనేజీ శుభ్రం చేయాలి','Silt and plastic waste are blocking the drain.':'మట్టి, ప్లాస్టిక్ వ్యర్థాలు డ్రైనేజీని మూసివేశాయి.',
  'Tap water is muddy':'కుళాయి నీరు బురదగా వస్తోంది','Supply water looks dirty and is unsafe to drink.':'సరఫరా నీరు మురికిగా ఉంది, తాగడానికి సురక్షితం కాదు.',
  'Handpump not working':'చేతిపంపు పనిచేయడం లేదు','Common handpump has been broken for a week.':'సామూహిక చేతిపంపు వారం రోజులుగా పాడైపోయింది.',
  'Garbage burning near houses':'ఇళ్ల దగ్గర చెత్త కాలుస్తున్నారు','Smoke from burning waste is affecting residents.':'చెత్త కాల్చడం వల్ల వచ్చే పొగ ప్రజలకు ఇబ్బంది కలిగిస్తోంది.',
  'Public toilet not cleaned':'ప్రజా మరుగుదొడ్డి శుభ్రం చేయడం లేదు','Community toilet is in poor condition.':'సామూహిక మరుగుదొడ్డి దారుణ స్థితిలో ఉంది.',
  'Stray dogs near school':'పాఠశాల దగ్గర వీధి కుక్కలు','Pack of stray dogs scares children on the way to school.':'వీధి కుక్కల గుంపు పాఠశాలకు వెళ్లే పిల్లలను భయపెడుతోంది.',
  'Leaning electric pole':'ఒరిగిపోయిన విద్యుత్ స్తంభం','Pole is tilted and wires hang low near the lane.':'స్తంభం ఒరిగిపోయి వీధి దగ్గర తీగలు కిందకు వేలాడుతున్నాయి.',
  'Speed bumps needed near school':'పాఠశాల దగ్గర స్పీడ్ బ్రేకర్లు కావాలి',
  'Vehicles over-speeding in school zone. Children at risk.':'పాఠశాల ప్రాంతంలో వాహనాలు అతివేగంగా వెళ్తున్నాయి. పిల్లలకు ప్రమాదం.'
};
const PH = {
  'e.g. Ramesh Kumar':'ఉదా. రమేష్ కుమార్','10-digit number':'10 అంకెల నంబర్','e.g. Ward 4, Rampur':'ఉదా. వార్డు 4, రాంపూర్',
  "Describe the issue in detail — location, severity, how long it's been present...":'సమస్యను వివరంగా రాయండి — ఎక్కడ, ఎంత తీవ్రం, ఎంతకాలంగా ఉంది...',
  'e.g. GS-2026-0002':'ఉదా. GS-2026-0002'
};
const VILLAGE = {Rampur:'రాంపూర్',Sundarnagar:'సుందర్‌నగర్',Krishnanagar:'కృష్ణానగర్',Ambavadi:'అంబావాడి',Ramnagar:'రామ్‌నగర్'};
const RULES = [
  [/^(\d+) complaints?$/, m=>m[1]+' ఫిర్యాదులు'],
  [/^↑ (\d+) this week$/, m=>'↑ ఈ వారం '+m[1]],
  [/^(\d+)% resolution rate$/, m=>m[1]+'% పరిష్కార రేటు'],
  [/^Filed: (.*)$/, m=>'నమోదైన తేదీ: '+m[1]],
  [/^Ward (\d+), (.+)$/, m=>'వార్డు '+m[1]+', '+(VILLAGE[m[2]]||m[2])],
  [/^Complaint filed! Your ID: (.*)$/, m=>'ఫిర్యాదు నమోదైంది! మీ ID: '+m[1]],
  [/^Status updated to "(.*)" for (.*)$/, m=>m[2]+' స్థితి "'+tr(m[1])+'" కు మార్చబడింది'],
  [/^(.+) complaints$/, m=>m[1].split(' · ').map(tr).join(' · ')+' ఫిర్యాదులు']
];
function tr(s){
  if(D[s]) return D[s];
  for(const [re,fn] of RULES){ const m=s.match(re); if(m) return fn(m); }
  return s;
}

const orig = new WeakMap();
function applyLang(){
  const te = window.LANG==='te';
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while((n = w.nextNode())){
    const p = n.parentElement;
    if(!p || p.closest('[data-no-i18n],script,style')) continue;
    if(!orig.has(n)) orig.set(n, n.nodeValue);
    const o = orig.get(n), t = o.trim();
    if(!t) continue;
    const r = te ? tr(t) : t;
    n.nodeValue = o.replace(t, ()=>r);
  }
  document.querySelectorAll('[placeholder]').forEach(el=>{
    if(!el.dataset.enPh) el.dataset.enPh = el.getAttribute('placeholder');
    el.setAttribute('placeholder', te ? (PH[el.dataset.enPh]||el.dataset.enPh) : el.dataset.enPh);
  });
  document.documentElement.lang = te ? 'te' : 'en';
  document.getElementById('lang-btn').textContent = te ? 'English' : 'తెలుగు';
}
let queued = false;
new MutationObserver(()=>{
  if(window.LANG!=='te' || queued) return;
  queued = true;
  requestAnimationFrame(()=>{ queued=false; applyLang(); });
}).observe(document.body,{childList:true,subtree:true});

function toggleLang(){
  window.LANG = window.LANG==='te' ? 'en' : 'te';
  try{ localStorage.setItem('gs_lang', window.LANG); }catch(e){}
  rerender();      // redraw dates/lists in the chosen language
  applyLang();
}
if(window.LANG==='te'){ rerender(); applyLang(); }

/* ================= Optional shared database (Firebase Firestore) =================
   Paste your firebaseConfig values below. If left as PASTE_..., the site works with browser storage only. */
(async function startCloud(){
  const firebaseConfig = {
  apiKey: 'PASTE_API_KEY',
  authDomain: 'PASTE_AUTH_DOMAIN',
  projectId: 'PASTE_PROJECT_ID',
  storageBucket: 'PASTE_STORAGE_BUCKET',
  messagingSenderId: 'PASTE_SENDER_ID',
  appId: 'PASTE_APP_ID'
};
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('PASTE')) { console.info('GramSeva: cloud database OFF – using browser storage'); return; }
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
  const { getFirestore, collection, doc, setDoc, onSnapshot, runTransaction, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
  const db = getFirestore(initializeApp(firebaseConfig));
  // name & phone are not shown anywhere in the app, so they are NOT sent to the shared database
  const clean = c => { const { name, phone, ...rest } = c; return JSON.parse(JSON.stringify(rest)); };

  window.cloud = {
    save: c => setDoc(doc(db, 'complaints', c.id), clean(c)),
    async newId() {
      const ref = doc(db, 'meta', 'counter');
      const n = await runTransaction(db, async tx => {
        const s = await tx.get(ref);
        const next = (s.exists() ? s.data().n : 0) + 1;
        tx.set(ref, { n: next });
        return next;
      });
      return 'GS-' + new Date().getFullYear() + '-' + String(n).padStart(4, '0');
    }
  };

  let seeding = false;
  async function seedCloud() {
    const list = window.seedData();
    const b = writeBatch(db);
    list.forEach(c => b.set(doc(db, 'complaints', c.id), clean(c)));
    b.set(doc(db, 'meta', 'counter'), { n: list.length });
    await b.commit();
  }

  onSnapshot(collection(db, 'complaints'), { includeMetadataChanges: true }, snap => {
    if (snap.empty) {
      if (!snap.metadata.fromCache && !seeding) { seeding = true; seedCloud().catch(console.error); }
      return;
    }
    window.onCloudData(snap.docs.map(d => d.data()));
  }, err => {
    console.error(err);
    delete window.cloud;
    window.toast && window.toast('Could not save to cloud', 'warn');
  });
})().catch(e=>console.error(e));
