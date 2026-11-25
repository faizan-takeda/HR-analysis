/* Takeda 2030: presentation shell.
   Chapter navigation, header state, contents / talk track / sources drawer,
   motion and full-screen controls, and the entrance choreography. */
(function () {
  'use strict';
  const TK = window.TK;
  const $ = function (s, p) { return (p || document).querySelector(s); };
  const $$ = function (s, p) { return Array.prototype.slice.call((p || document).querySelectorAll(s)); };
  const chapters = $$('.chapter');
  let current = 0;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- navigation ---------- */
  const dots = $('#dots');
  dots.innerHTML = chapters.map(function (c, i) { return '<button type="button" aria-label="Chapter ' + (i + 1) + ': ' + esc(c.dataset.title) + '"></button>'; }).join('');
  const dotBtns = $$('button', dots);
  dotBtns.forEach(function (b, i) { b.addEventListener('click', function () { go(i); }); });

  function go(i) {
    i = Math.max(0, Math.min(chapters.length - 1, i));
    const smooth = !(TK.Stage && !TK.Stage.motion);
    chapters[i].scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  }
  function setCurrent(i) {
    if (i === current && dotBtns[i].classList.contains('on')) return;
    current = i;
    dotBtns.forEach(function (b, k) { b.classList.toggle('on', k === i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    $('#nowNum').textContent = (i + 1) + ' of ' + chapters.length;
    $('#nowTitle').textContent = chapters[i].dataset.title;
    $('#progressBar').style.width = ((i + 1) / chapters.length * 100) + '%';
    $('#prevBtn').disabled = i === 0;
    $('#nextBtn').disabled = i === chapters.length - 1;
    if ($('#drawer').open && $('#drawer').dataset.kind === 'notes') openNotes();
  }
  const seen = new Map();
  const io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { seen.set(e.target, e.intersectionRatio); });
    let best = 0, br = -1;
    chapters.forEach(function (c, i) { const r = seen.get(c) || 0; if (r > br) { br = r; best = i; } });
    setCurrent(best);
  }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
  chapters.forEach(function (c) { io.observe(c); });
  $('#prevBtn').addEventListener('click', function () { go(current - 1); });
  $('#nextBtn').addEventListener('click', function () { go(current + 1); });
  $$('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(chapters.indexOf(document.getElementById(b.dataset.go))); }); });

  document.addEventListener('keydown', function (e) {
    if ($('#drawer').open) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.closest('.stage-view')) return;
    if (e.key === 'PageDown' || (e.key === 'ArrowRight' && !e.altKey) ) { e.preventDefault(); go(current + 1); }
    else if (e.key === 'PageUp' || (e.key === 'ArrowLeft' && !e.altKey)) { e.preventDefault(); go(current - 1); }
    else if (e.key === 'Home' && !tag.match(/button/)) { go(0); }
    else if (e.key === 'End' && !tag.match(/button/)) { go(chapters.length - 1); }
  });
  function fromHash() {
    const id = (location.hash || '').slice(1);
    const el = id && document.getElementById(id);
    if (el && el.classList.contains('chapter')) el.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', fromHash);

  /* ---------- drawer ---------- */
  const drawer = $('#drawer'), body = $('#drawerBody'), title = $('#drawerTitle');
  function openDrawer(kind, heading, html) {
    drawer.dataset.kind = kind;
    title.textContent = heading;
    body.innerHTML = html;
    if (!drawer.open) drawer.showModal();
    body.scrollTop = 0;
  }
  function refHtml(n) {
    const r = TK.REFS[n]; if (!r) return '';
    return '<article class="ref"><span class="ref-n">' + n + '</span><div><h3>' + esc(r[0]) + '</h3><p class="ref-pub">' + esc(r[1]) + ' · ' + (TK.CHECKED_REFS.includes(n)?'Primary source checked':'Inherited reference · verify before external use') + '</p><p><b>Supports:</b> ' + esc(r[2]) + '</p><p class="ref-lim"><b>Limitation:</b> ' + esc(r[3]) + '</p><a href="' + esc(r[4]) + '" target="_blank" rel="noopener noreferrer">Open the source</a></div></article>';
  }
  function openSources(list) {
    const all = !list;
    const ids = all ? Array.from(new Set(chapters.flatMap(c=>c.dataset.refs.split(',').map(Number)))).sort((a,b)=>a-b) : list;
    const intro = all
      ? '<p class="drawer-intro">Every external claim in this proposal, with what it supports and where it stops. Company practices are cited as mechanisms to adapt, not policies to copy. Please verify each source before external use.</p>'
      : '<p class="drawer-intro">Sources for chapter ' + (current + 1) + ': ' + esc(chapters[current].dataset.title) + '. <button type="button" class="linkish" id="allSources">See all sources</button></p>';
    openDrawer('sources', all ? 'All sources' : 'Sources for this chapter', intro + ids.map(refHtml).join(''));
    const b = $('#allSources'); if (b) b.addEventListener('click', function () { openSources(null); });
  }
  function openNotes() {
    const n = TK.NOTES[current];
    openDrawer('notes', 'Talk track: chapter ' + (current + 1),
      '<p class="drawer-intro">' + esc(chapters[current].dataset.title) + '</p>' +
      '<section class="note-block"><h3>What to say</h3><p>' + esc(n.say) + '</p></section>' +
      '<section class="note-block q"><h3>Likely challenge</h3><p>“' + esc(n.q) + '”</p></section>' +
      '<section class="note-block a"><h3>Our answer</h3><p>' + esc(n.a) + '</p></section>' +
      '<p class="drawer-foot">The talk track follows you: move to another chapter and it updates.</p>');
  }
  function openContents() {
    openDrawer('contents', 'Contents', '<ol class="toc">' + chapters.map(function (c, i) {
      const h = c.querySelector('h1, h2');
      return '<li><button type="button" data-i="' + i + '"' + (i === current ? ' aria-current="true"' : '') + '><span>' + (i + 1) + '</span><b>' + esc(c.dataset.title) + '</b><em>' + esc(h ? h.textContent : '') + '</em></button></li>';
    }).join('') + '</ol>');
    $$('.toc button').forEach(function (b) { b.addEventListener('click', function () { drawer.close(); go(+b.dataset.i); }); });
  }
  $('#btnContents').addEventListener('click', openContents);
  $('#btnNotes').addEventListener('click', openNotes);
  $('#btnSources').addEventListener('click', function () { openSources(null); });
  $$('.src-btn').forEach(function (b) {
    const ids = b.dataset.refs.split(',').map(Number);
    b.textContent = 'Sources (' + ids.length + ')';
    b.addEventListener('click', function () { setCurrent(chapters.indexOf(b.closest('.chapter'))); openSources(ids); });
  });
  $('#drawerClose').addEventListener('click', function () { drawer.close(); });
  drawer.addEventListener('click', function (e) { if (e.target === drawer) drawer.close(); });

  /* ---------- motion and full screen ---------- */
  const motionBtn = $('#btnMotion');
  function setMotion(on) {
    if (TK.Stage) TK.Stage.setMotion(on);
    document.documentElement.classList.toggle('still', !on);
    motionBtn.setAttribute('aria-pressed', String(on));
    motionBtn.textContent = on ? 'Motion on' : 'Motion off';
  }
  motionBtn.addEventListener('click', function () { setMotion(motionBtn.getAttribute('aria-pressed') !== 'true'); });
  $('#btnFull').addEventListener('click', function () {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    else if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
  });

  /* ---------- entrance choreography ---------- */
  function choreograph() { /* Do not hide any executive content during presentation. */ }
  $$('[data-detail]').forEach(function(b){b.addEventListener('click',function(){const i=Number(b.dataset.detail);openDrawer('detail',chapters[i-1].dataset.title,document.getElementById('detail'+i).innerHTML);});});
  /* ---------- start ---------- */
  function start() {
    if (TK.Stage) TK.Stage.init();
    if (TK.Exercises) TK.Exercises.init();
    setCurrent(0);
    choreograph();
    fromHash();
    if (TK.Stage && !TK.Stage.motion) setMotion(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
