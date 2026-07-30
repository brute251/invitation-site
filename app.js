/* ══════════════════════════════════════════════
   TheSlap · Hollywood Arts · logique du parcours
   ══════════════════════════════════════════════ */

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ─────────── suivi ─────────── */
const LOG = 'ha_log';
function track(event, extra){
  const row = { event, extra: extra ?? null, t: Date.now() };
  try{
    const l = JSON.parse(localStorage.getItem(LOG) || '[]');
    l.push(row); localStorage.setItem(LOG, JSON.stringify(l));
  }catch(e){}
  console.log('[track]', event, extra ?? '');
  try{
    fetch('/api/track', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(row), keepalive:true
    }).catch(()=>{});
  }catch(e){}
}

/* ─────────── navigation ─────────── */
let current = 's1';
function go(id){
  const from = $('#'+current); if(from) from.classList.remove('is-active');
  $('#'+id).classList.add('is-active');
  current = id;
  const n = { s1:1, s2:2, s3:3 }[id];
  if(n){
    [1,2,3].forEach(i => {
      const el = $('#nav-'+i);
      el.classList.toggle('is-on', i === n);
      el.classList.toggle('is-done', i < n);
    });
  }
  window.scrollTo({top:0, behavior:'instant'});
}

/* ─────────── son ─────────── */
const SFX = {
  jingle:'assets/audio/jingle.m4a',
  ok:'assets/audio/ok.m4a',
  no:'assets/audio/no.m4a',
  clap:'assets/audio/applause.m4a'
};
let soundOn = false;
function play(k){
  if(!soundOn) return;
  const el = $('#sfx-'+k);
  if(!el || !el.getAttribute('src')) return;
  try{ el.currentTime = 0; el.play().catch(()=>{}); }catch(e){}
}
const VOLUME = 0.5;              // moitié moins fort
function armSound(){
  soundOn = true;
  for(const [k,src] of Object.entries(SFX)){
    const el = $('#sfx-'+k);
    if(el){ el.setAttribute('src', src); el.volume = VOLUME; }
  }
}

/* ═══════════ 0 · RIDEAU ═══════════ */
$('#btn-start').addEventListener('click', () => {
  armSound(); play('jingle');
  $('#s0').classList.add('curtains-open');
  track('rideau_ouvert');
  setTimeout(() => {
    $('#s0').classList.remove('is-active');
    $('#page').hidden = false;
    go('s1');
  }, 1150);
});

/* ═══════════ 1 · DOSSIER ═══════════ */
const NOM  = 'Maud « Patatecos » Soulard';
const fNom = $('#f-nom'), fJob = $('#f-job'), fTal = $('#f-talent');

function lockNom(){
  if(fNom.value !== NOM){
    fNom.value = NOM;
    fNom.classList.remove('shake'); void fNom.offsetWidth; fNom.classList.add('shake');
    $('#hint-nom').textContent = 'Ce champ a été vérifié par l\'administration.';
    track('essai_changement_nom');
  }
}
fNom.addEventListener('input', lockNom);
fNom.addEventListener('paste', () => setTimeout(lockNom, 0));

function wireSelect(sel, hintId){
  sel.addEventListener('change', () => {
    const raw = sel.value;
    const [kind, msg] = raw.split('|');
    const hint = $(hintId);
    if(kind === 'no'){
      hint.textContent = msg || 'Refusé.';
      hint.classList.remove('ok');
      sel.value = '';
      sel.classList.remove('shake'); void sel.offsetWidth; sel.classList.add('shake');
    }else if(kind === 'ok'){
      hint.textContent = msg || '';
      hint.classList.add('ok');
    }else{
      hint.textContent = ''; hint.classList.remove('ok');
    }
    checkForm();
  });
}
wireSelect(fJob, '#hint-job');
wireSelect(fTal, '#hint-talent');

function checkForm(){
  const ok = v => v.startsWith('ok');
  $('#btn-submit').disabled = !(ok(fJob.value) && ok(fTal.value));
}

$('#btn-submit').addEventListener('click', () => {
  track('dossier_depose');
  play('ok');
  go('s2'); renderQuiz();
});

/* ═══════════ 2 · TEST D'ADMISSION ═══════════ */
const QUIZ = [
  {
    q:'De quelle couleur sont les cheveux de Cat Valentine ?',
    opts:[
      {t:'Rouge',  ok:true,  v:'Évidemment. Question offerte.'},
      {t:'Blonde', ok:false, v:'Non. Elle le répète à peu près toutes les cinq minutes.'},
      {t:'Brune',  ok:false, v:'Non. Elle le répète à peu près toutes les cinq minutes.'},
      {t:'Bleue',  ok:false, v:'Non. Et arrête de tenter ta chance.'}
    ]
  },
  {
    q:'Quelle est la meilleure ligne de RER d\'Île-de-France ?',
    opts:[
      {t:'La A', ok:false, v:'Non. C\'est la B. Tout le monde le sait.'},
      {t:'La B', ok:true,  v:'ÉVIDEMMENT. La pire. Bonne réponse.'},
      {t:'La C', ok:false, v:'Non. C\'est la B. Tout le monde le sait.'},
      {t:'La D', ok:false, v:'La D. Sérieusement. Réfléchis encore.'}
    ]
  },
  {
    q:'Maud Soulard est originaire de…',
    opts:[
      {t:'Bretagne',         ok:true,  v:'Correct. Le dossier est validé.'},
      {t:'Vendée',           ok:false, v:'REFUSÉ par l\'administration. Réponse retenue : Bretagne.'},
      {t:'Nantes',           ok:false, v:'Nantes est en Bretagne. Donc : Bretagne.'},
      {t:'Pays de la Loire', ok:false, v:'Invention administrative. Réponse retenue : Bretagne.'}
    ]
  }
];

let qi = 0, solved = false;

function renderQuiz(){
  solved = false;
  const item = QUIZ[qi];
  $('#quiz-count').textContent  = `question ${qi+1} sur ${QUIZ.length}`;
  $('#quiz-q').textContent      = item.q;
  $('#quiz-verdict').textContent = '';
  $('#quiz-verdict').className   = 'verdict';
  $('#btn-next').hidden = true;

  const box = $('#quiz-opts'); box.innerHTML = '';
  item.opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'btn'; b.type = 'button'; b.textContent = o.t;
    b.addEventListener('click', () => answer(b, o));
    box.appendChild(b);
  });
}

function answer(btn, o){
  if(solved) return;                       // une fois trouvé, on fige
  const v = $('#quiz-verdict');
  v.textContent = o.v;
  v.className = 'verdict ' + (o.ok ? 'good' : 'bad');
  track('quiz_q'+(qi+1), o.t + (o.ok ? ' ✓' : ' ✗'));

  if(o.ok){
    solved = true; play('ok');
    $$('#quiz-opts .btn').forEach(b => { if(b !== btn) b.classList.add('is-bad'); });
    btn.classList.add('is-good');
    $('#btn-next').hidden = false;         // elle avance quand elle veut
  }else{
    play('no');
    btn.classList.add('is-bad');
    btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
  }
}

$('#btn-next').addEventListener('click', () => {
  qi++;
  if(qi < QUIZ.length){ renderQuiz(); window.scrollTo({top:0,behavior:'smooth'}); }
  else{
    track('quiz_fini');
    go('s3'); renderFeed(); burst();
    track('profil_vu');
  }
});

/* ═══════════ 3 · THESLAP ═══════════ */
const FEED = [
  { who:'Cat',   emoji:'🍰', color:'#e6007e', when:'il y a 2 h',
    txt:'j\'ai dit à mon frère que tu venais dimanche, il a demandé s\'il pouvait apporter son seau. j\'ai dit non. il a pleuré. BREF BISOUS 💕' },
  { who:'Trina', emoji:'🎤', color:'#f7941e', when:'il y a 1 h',
    txt:'SALUT !! j\'ai vu qu\'il y avait un truc dimanche. je suis dispo. je peux chanter. je ramène mon micro. RÉPONDS-MOI.' },
  { who:'Jade',  emoji:'✂️', color:'#2b2b3d', when:'il y a 44 min',
    txt:'Un dimanche. À Saint-Ouen. Sans canapé et sans clim. Amuse-toi bien.' },
  { who:'Rex',   emoji:'🪆', color:'#36c7b8', when:'il y a 12 min',
    txt:'attends tu vois un PILOTE ? t\'as pas trouvé mieux ? … bon, si. t\'as pas trouvé mieux. c\'est moi le mieux.' }
];

function renderFeed(){
  const box = $('#feed'); box.innerHTML = '';
  FEED.forEach(p => {
    const el = document.createElement('article');
    el.className = 'box box--blue';
    el.innerHTML = `
      <div class="box-b">
        <div class="post-head">
          <span class="post-av" style="background:${p.color}">${p.emoji}</span>
          <span>
            <span class="post-who">${p.who}</span><br>
            <span class="post-when">${p.when}</span>
          </span>
        </div>
        <p class="post-body">${p.txt}</p>
      </div>`;
    box.appendChild(el);
  });
}

/* ─── le bouton « non » ───────────────────────────────
   Souris : il fuit par proximité, avant même le clic.
   Tactile : pas de survol, donc il saute AU CONTACT.
   On ne bloque jamais le scroll (écouteurs passifs) :
   c'est le clic qu'on neutralise, pas le geste.
   ──────────────────────────────────────────────────── */
const noZone = $('#no-zone'), btnNo = $('#btn-no');
const MAX_DODGE = 6;
let nx = 0, ny = 0, dodges = 0, dead = false;

function limits(){
  const z = noZone.getBoundingClientRect();
  const w = btnNo.offsetWidth, h = btnNo.offsetHeight;
  return [Math.max(0, z.width - w)/2, Math.max(0, z.height - h)/2];
}
function paint(){
  const scale = Math.max(.58, 1 - dodges*.07);   // il rapetisse à chaque échec
  btnNo.style.transform = `translate(${nx}px,${ny}px) rotate(${nx/14}deg) scale(${scale})`;
}
function retire(){
  dead = true;
  btnNo.style.opacity = '0';
  btnNo.style.pointerEvents = 'none';
  noZone.classList.add('is-dead');
  track('rsvp_non_abandonne', dodges + ' tentatives');
}
function countDodge(){
  dodges++;
  if(dodges >= MAX_DODGE){ retire(); return false; }
  return true;
}

/* saut franc, à l'opposé de là où il était : au doigt il faut que ça se voie */
function hop(){
  if(dead) return;
  if(!countDodge()) return;
  const [mx, my] = limits();
  const dir = nx === 0 ? (Math.random() < .5 ? -1 : 1) : -Math.sign(nx);
  nx = dir * mx * (.65 + Math.random()*.35);
  ny = (Math.random()*2 - 1) * my;
  paint();
}

/* fuite douce à la souris, tant que le curseur approche */
function flee(cx, cy){
  if(dead) return;
  const b = btnNo.getBoundingClientRect();
  let dx = b.left + b.width/2 - cx, dy = b.top + b.height/2 - cy;
  const d = Math.hypot(dx, dy);
  if(d > 120) return;
  if(d < 1){ hop(); return; }
  const push = (130 - d) * 1.5;
  const [mx, my] = limits();
  let x = nx + (dx/d)*push, y = ny + (dy/d)*push;
  if(Math.abs(x) >= mx) x = -Math.sign(x) * mx * .85;   // rebond sur les bords
  nx = Math.max(-mx, Math.min(mx, x));
  ny = Math.max(-my, Math.min(my, y));
  if(!countDodge()) return;
  paint();
}

document.addEventListener('mousemove', e => {
  if(current !== 's3' || dead) return;
  flee(e.clientX, e.clientY);
}, {passive:true});

/* tactile : passif, donc le scroll de la page reste intact */
btnNo.addEventListener('touchstart', hop, {passive:true});

/* et surtout : le clic ne vaut jamais un « non » */
btnNo.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); hop(); });

/* ─── RSVP ─── */
$$('#rsvp-opts .btn').forEach(b => {
  b.addEventListener('click', () => {
    const r = b.dataset.r;
    track('rsvp', r);
    play('clap');
    $('#mood-word').textContent = r === 'trina' ? 'je viens (+Trina)' : 'je viens ✨';
    $('#rsvp').hidden = true;
    const d = $('#done'); d.hidden = false;
    $('#done-p').innerHTML = r === 'trina'
      ? 'Trina n\'est pas invitée.<br>Toi si.<br><small>dimanche 2 août, 18h. La Cité (Saint-Ouen).</small>'
      : 'Dimanche 2 août, 18h.<br>La Cité (Saint-Ouen).<br><small>toujours pas de canapé. toujours pas de clim.</small>';
    burst(); setTimeout(burst, 350); setTimeout(burst, 700);
    d.scrollIntoView({behavior:'smooth', block:'center'});
  });
});

/* ═══════════ confettis ═══════════ */
const cv = $('#confetti'), ctx = cv.getContext('2d');
let bits = [];
function sizeCv(){ cv.width = innerWidth; cv.height = innerHeight; }
sizeCv(); addEventListener('resize', sizeCv);

function burst(){
  const cols = ['#c6240d','#36c7b8','#00ddff','#f7941e','#fffd95','#fff'];
  for(let i=0;i<90;i++){
    bits.push({
      x: cv.width/2 + (Math.random()*2-1)*90,
      y: cv.height*0.4,
      vx:(Math.random()*2-1)*7, vy:-(Math.random()*11+5),
      s: Math.random()*7+4, c: cols[(Math.random()*cols.length)|0],
      r: Math.random()*Math.PI, vr:(Math.random()*2-1)*0.24
    });
  }
  requestAnimationFrame(tick);
}
function tick(){
  ctx.clearRect(0,0,cv.width,cv.height);
  bits = bits.filter(b => b.y < cv.height + 40);
  bits.forEach(b => {
    b.vy += 0.32; b.x += b.vx; b.y += b.vy; b.r += b.vr;
    ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.r);
    ctx.fillStyle = b.c; ctx.fillRect(-b.s/2,-b.s/2,b.s,b.s*0.6);
    ctx.restore();
  });
  if(bits.length) requestAnimationFrame(tick);
  else ctx.clearRect(0,0,cv.width,cv.height);
}

/* ═══════════ raccourci de test ═══════════ */
const jump = new URLSearchParams(location.search).get('s');
if(jump){
  armSound();
  $('#s0').classList.remove('is-active');
  $('#page').hidden = false;
  go('s'+jump);
  if(jump === '2') renderQuiz();
  if(jump === '3') renderFeed();
}
