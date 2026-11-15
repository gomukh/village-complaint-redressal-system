/* GramSeva Portal – Village Complaint Redressal System */
const STORE_KEY = 'gramseva_v3';
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
function fmtDate(ts){return new Date(ts).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
function fmtDT(ts){return fmtDate(ts)+', '+new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});}

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
  document.getElementById('tr-village').innerHTML = `<i class="ti ti-map-pin" aria-hidden="true" style="font-size:12px"></i> ${esc(c.village)}`;
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
      <td>${esc(c.village)}</td>
      <td>${fmtDate(c.created)}</td>
      <td><select class="status-sel" onchange="updateStatus('${esc(c.id)}',this.value)">
        ${STATUSES.map(s=>`<option ${c.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
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
  save();
  toast('Status updated to "'+status+'" for '+id);
}

/* ---------- submit ---------- */
function handleFile(input){
  if(input.files[0]) document.getElementById('upload-label').textContent='📷 '+input.files[0].name;
}
function submitComplaint(){
  const name = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const cat = document.getElementById('f-cat').value;
  const desc = document.getElementById('f-desc').value.trim();
  const village = document.getElementById('f-village').value.trim();
  if(!name||!cat||!desc||!village){toast('Please fill all required fields','warn');return;}
  if(!/^\d{10}$/.test(phone)){toast('Enter a valid 10-digit mobile number','warn');return;}
  const id = nextId(); const now = Date.now();
  complaints.push({id,cat,title:desc.slice(0,50)+(desc.length>50?'...':''),desc,village,name,phone,created:now,status:'Open',
    events:[{title:EV.filed[0],desc:EV.filed[1],ts:now}]});
  save();
  ['f-name','f-phone','f-village','f-desc'].forEach(i=>document.getElementById(i).value='');
  document.getElementById('f-cat').value='';
  document.getElementById('file-in').value='';
  document.getElementById('upload-label').textContent='Click to upload photo evidence';
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
