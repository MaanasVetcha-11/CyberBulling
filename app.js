/* ============================================================
   SafeSocial – app.js
   All application logic: detection, pre-post, report/block,
   evidence, dashboard, activity log, localStorage helpers.
   ============================================================ */

'use strict';

/* ── LocalStorage Keys ──────────────────────────────────── */
const LS = {
  STATS:    'ss_stats',
  REPORTS:  'ss_reports',
  BLOCKED:  'ss_blocked',
  EVIDENCE: 'ss_evidence',
  ACTIVITY: 'ss_activity',
  POSTS:    'ss_posts',
};

/* ── Default Stats ──────────────────────────────────────── */
const defaultStats = {
  analyzed: 0,
  safe: 0,
  harmful: 0,
  reports: 0,
  blocked: 0,
  evidence: 0,
};

/* ── Helpers ────────────────────────────────────────────── */
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function getStats()   { return load(LS.STATS, { ...defaultStats }); }
function saveStats(s) { save(LS.STATS, s); }

function getReports()   { return load(LS.REPORTS,  []); }
function getBlocked()   { return load(LS.BLOCKED,   []); }
function getEvidence()  { return load(LS.EVIDENCE,  []); }
function getActivity()  { return load(LS.ACTIVITY,  []); }
function getPosts()     { return load(LS.POSTS,      []); }

function fmt(d) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
    ', ' + new Date(d).toLocaleDateString([], { day:'2-digit', month:'short' });
}

/* ── Toast ──────────────────────────────────────────────── */
let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.className = 'toast' + (type ? ' toast-' + type : '');
  el.innerHTML = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

/* ── Navigation ─────────────────────────────────────────── */
function goTo(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) { target.classList.add('active'); window.scrollTo(0, 0); }

  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active-link', a.dataset.section === id);
  });

  // close hamburger
  document.getElementById('navLinks').classList.remove('open');

  // refresh dashboard on visit
  if (id === 'dashboard') refreshDashboard();
}

/* ── Hamburger ──────────────────────────────────────────── */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

/* ── Nav items ──────────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    goTo(a.dataset.section);
  });
});

/* ══════════════════════════════════════════════════════════
   B. AI-Based Cyberbullying Detection
   ══════════════════════════════════════════════════════════ */

const KEYWORDS = {
  severe: [
    // Direct threats & violence
    'kill', 'kill you', 'kill yourself', 'kill urself', 'kys',
    'murder', 'murder you', 'i will murder',
    'die', 'go die', 'drop dead', 'i hope you die', 'wish you were dead',
    'suicide', 'end your life', 'end yourself', 'end it all',
    'stab', 'i will stab', 'slash',
    'shoot', 'i will shoot', 'gun to your head',
    'bomb', 'blow up', 'explode',
    'rape', 'assault you',
    'destroy you', 'destroy your life',
    'attack you', 'come for you',
    'weapon', 'knife', 'blade',
    'hurt you', 'hurt yourself', 'harm yourself',
    'end you', 'end your existence',
    'i will find you', 'i know where you live', 'coming for you',
    'you will pay', 'you will regret', 'you will suffer',
    'make you suffer', 'make you bleed', 'make you pay',
    'cut you', 'cut yourself',
    'torture', 'i will torture',
    'burn in hell', 'burn you',
    'exterminate', 'annihilate', 'lynch', 'hang yourself', 'hang you',
    'bury you', 'bury alive',
    'strangle', 'choke you', 'suffocate',
    'poison you', 'drug you',
    'bash your head', 'break your bones', 'break your neck',
    'slit your wrist', 'slit your throat',
    'jump off a bridge', 'in front of a bus',
    'nobody would miss you', 'world is better without you',
    'do everyone a favor and die',
  ],

  mild: [
    // ── Profanity & swear words ──────────────────────────
    'fuck', 'fucker', 'fucking', 'fuk', 'fck', 'f u c k', 'wtf', 'stfu',
    'shit', 'shitty', 'bullshit', 'full of shit', 'piece of shit', 'pos',
    'bitch', 'bitches', 'son of a bitch', 'sob',
    'bastard', 'you bastard',
    'asshole', 'ass hole', 'jackass', 'smartass', 'dumbass', 'fatass',
    'crap', 'crappy', 'holy crap',
    'damn', 'dammit', 'goddamn', 'god damn',
    'hell', 'go to hell', 'what the hell',
    'cunt', 'slut', 'whore', 'skank',
    'prick', 'dick', 'dickhead', 'cock', 'screw you',
    'piss off', 'piss on you', 'pissed',
    'twat', 'wanker', 'tosser', 'git',
    'arse', 'arsehole',
    'bloody hell', 'bloody idiot',
    'sob', 'gtfo', 'kma', 'kmsl',
    'motherf', 'mf', 'm0ther',
    'a$$', 'sh!t', 'b!tch', 'f@ck', 'fvck', 's h i t',

    // ── Slurs & derogatory terms ─────────────────────────
    'retard', 'retarded', 'spastic',
    'faggot', 'fag', 'homo',
    'nigger', 'nigga', 'n1gga',
    'cracker', 'chink', 'spic', 'wetback', 'kike', 'gook',
    'tranny', 'freak of nature',

    // ── Classic insults ───────────────────────────────────
    'idiot', 'you idiot', 'stupid idiot',
    'stupid', 'you are stupid', 'ur stupid', 'so stupid',
    'dumb', 'dumber', 'dumbass', 'dumb ass',
    'loser', 'big loser', 'total loser', 'such a loser',
    'ugly', 'so ugly', 'ugly face', 'ugly af',
    'fat', 'fat pig', 'fat cow', 'fatso', 'obese',
    'pathetic', 'so pathetic', 'you are pathetic',
    'moron', 'you moron', 'absolute moron',
    'trash', 'you are trash', 'piece of trash', 'human trash',
    'worthless', 'you are worthless', 'completely worthless',
    'freak', 'you freak', 'weirdo', 'you weirdo',
    'nobody likes you', 'nobody loves you', 'no one likes you', 'no one cares about you',
    'go away', 'get away from me',
    'shut up', 'shut your mouth', 'shut your face',
    'disgusting', 'you are disgusting',
    'i hate you', 'we all hate you', 'everyone hates you',
    'disgrace', 'you are a disgrace',
    'creep', 'such a creep',
    'dummy', 'you dummy',
    'pig', 'you pig', 'filthy pig',
    'nobody cares', 'nobody cares about you', 'no one cares',
    'failure', 'complete failure', 'you are a failure',
    'useless', 'completely useless', 'you are useless',
    'clown', 'you clown',
    'cringe', 'so cringe',
    'lame', 'you are lame', 'so lame',
    'jerk', 'you jerk', 'total jerk',
    'brainless', 'brain dead',
    'coward', 'you coward',
    'wimp', 'you wimp', 'crybaby', 'cry baby',
    'hate your guts',
    'get lost', 'get out of my life',
    'you suck', 'you suck so much',
    'you stink', 'you smell bad',
    'scum', 'scumbag', 'scum of the earth',
    'lowlife', 'you lowlife',
    'good for nothing',
    'waste of space', 'waste of oxygen',
    'rotten', 'you are rotten',
    'filth', 'filthy', 'filthy animal',
    'psycho', 'you psycho',
    'mental case',
    'you make me sick',
    'gross', 'you are gross',
    'nobody wants you',
    'leave this world',
    'you are cancer', 'you are a disease',
    'monster', 'you monster',
    'demon', 'you demon',
    'nerd', 'dork', 'such a dork',
    'coward', 'such a coward',
    'annoying', 'so annoying', 'you are annoying',
  ],
};

function detectHarm(text) {
  // 1. Lowercase
  let lower = text.toLowerCase();

  // 2. Normalize leet-speak / symbol substitutions
  lower = lower
    .replace(/\$/g,  's')
    .replace(/@/g,   'a')
    .replace(/!/g,   'i')
    .replace(/1/g,   'i')
    .replace(/3/g,   'e')
    .replace(/0/g,   'o')
    .replace(/\|/g,  'i')
    .replace(/\+/g,  't')
    .replace(/ph/g,  'f')
    .replace(/[^a-z\s]/g, ' ');  // strip remaining symbols / punctuation

  const words = lower.split(/\s+/);

  function matchesKeyword(keyword) {
    const kWords = keyword.trim().split(/\s+/);
    if (kWords.length === 1) {
      // single word → exact word-boundary match
      return words.includes(kWords[0]);
    }
    // multi-word phrase → substring on the full normalized text
    return lower.includes(keyword);
  }

  const foundSevere = KEYWORDS.severe.filter(matchesKeyword);
  const foundMild   = KEYWORDS.mild.filter(matchesKeyword);

  let level = 'safe';
  let found = [];

  if (foundSevere.length) { level = 'severe'; found = foundSevere; }
  else if (foundMild.length) { level = 'mild';   found = foundMild; }

  return { level, found };
}

function loadSample(type) {
  const samples = {
    safe:   "Hey! Great job on the project today. You worked really hard and I'm proud of you! 🌟",
    mild:   "You are such a loser and a total failure. Nobody likes you, you are ugly, fat and dumb. Go away you worthless creep!",
    severe: "I know where you live. I will hurt you if you don't stop. You better watch out or I will kill you and make you suffer.",
  };
  document.getElementById('detectInput').value = samples[type];
}

function analyzeMessage() {
  const text = document.getElementById('detectInput').value.trim();
  if (!text) { toast('<i class="fa-solid fa-circle-exclamation"></i> Please enter a message first.', 'warn'); return; }

  const { level, found } = detectHarm(text);
  const resultEl = document.getElementById('detectResult');
  const detailsCard = document.getElementById('analysisDetailsCard');
  const detailsEl = document.getElementById('analysisDetails');

  // Build result HTML
  let html = '';
  if (level === 'safe') {
    html = `
      <div class="result-icon">✅</div>
      <div>
        <div class="result-title">Safe Message</div>
        <div class="result-desc">No harmful words detected. This message appears safe to share.</div>
        <div class="result-score">Harm Score: 0% — Kindness level: High 💙</div>
      </div>`;
    resultEl.className = 'detect-result result-safe';
  } else if (level === 'mild') {
    html = `
      <div class="result-icon">⚠️</div>
      <div>
        <div class="result-title">Potentially Harmful</div>
        <div class="result-desc">
          Some offensive words detected. This message may hurt someone's feelings.
          Please consider editing it before sharing.
        </div>
        <div class="result-score">Flagged words: ${found.map(w => `<span class="harm-tag">${w}</span>`).join('')}</div>
      </div>`;
    resultEl.className = 'detect-result result-mild';
  } else {
    html = `
      <div class="result-icon">🚨</div>
      <div>
        <div class="result-title">Highly Harmful — Threatening Language Detected!</div>
        <div class="result-desc">
          This message contains threatening or abusive language. Sending it may be illegal and extremely harmful.
          <strong>Please do not post this message.</strong>
        </div>
        <div class="result-score">Flagged words: ${found.map(w => `<span class="harm-tag">${w}</span>`).join('')}</div>
      </div>`;
    resultEl.className = 'detect-result result-severe';
  }

  resultEl.innerHTML = html;
  resultEl.classList.remove('hidden');

  // Build analysis detail bars
  const totalWords = text.split(/\s+/).length;
  const harmPct = Math.min(100, Math.round((found.length / Math.max(1, totalWords)) * 100 * 3));
  const safePct = 100 - harmPct;

  detailsEl.innerHTML = `
    <div class="detail-row">
      <span style="min-width:130px; font-weight:600;">Words Analyzed</span>
      <span>${totalWords}</span>
    </div>
    <div class="detail-row">
      <span style="min-width:130px; font-weight:600;">Harmful Terms</span>
      <span>${found.length}</span>
    </div>
    <div class="detail-row">
      <span style="min-width:130px; font-weight:600;">Safety Rating</span>
      <div class="detail-bar-wrap"><div class="detail-bar bar-safe" style="width:${safePct}%"></div></div>
      <span>${safePct}%</span>
    </div>
    <div class="detail-row">
      <span style="min-width:130px; font-weight:600;">Harm Rating</span>
      <div class="detail-bar-wrap"><div class="detail-bar bar-${level}" style="width:${harmPct}%"></div></div>
      <span>${harmPct}%</span>
    </div>
  `;
  detailsCard.style.display = 'block';

  // Update stats
  const stats = getStats();
  stats.analyzed++;
  if (level === 'safe') stats.safe++;
  else stats.harmful++;
  saveStats(stats);

  // Activity log
  addActivity(
    level === 'safe'
      ? { icon: 'dot-green', text: 'Message analyzed — result: Safe', time: Date.now() }
      : { icon: 'dot-red',   text: `Message analyzed — result: ${level === 'mild' ? 'Potentially Harmful' : 'Highly Harmful'}`, time: Date.now() }
  );

  refreshDashboard();
}

/* ══════════════════════════════════════════════════════════
   C. Pre-Posting Warning System
   ══════════════════════════════════════════════════════════ */

// track char count
document.getElementById('postInput').addEventListener('input', function () {
  document.getElementById('charCount').textContent = this.value.length;
});

function prePostCheck() {
  const text = document.getElementById('postInput').value.trim();
  if (!text) { toast('<i class="fa-solid fa-circle-exclamation"></i> Please write a message first.', 'warn'); return; }

  const { level, found } = detectHarm(text);

  if (level === 'safe') {
    postAnyway();
    return;
  }

  // Show warning modal
  const modal = document.getElementById('postWarningModal');
  const warnText = document.getElementById('postWarningText');
  const harmWordsEl = document.getElementById('harmWords');

  if (level === 'severe') {
    warnText.textContent = '🚨 This message contains threatening or abusive language that could be harmful or illegal. We strongly urge you not to post it.';
  } else {
    warnText.textContent = '⚠️ This message may hurt someone. Some words could be considered offensive. Do you want to reconsider?';
  }
  harmWordsEl.innerHTML = found.map(w => `<span class="harm-tag">${w}</span>`).join('');
  modal.classList.remove('hidden');
}

function reconsiderPost() {
  document.getElementById('postWarningModal').classList.add('hidden');
  toast('<i class="fa-solid fa-pen"></i> Great choice! Take a moment to revise your message.', 'success');
}

function postAnyway() {
  const modal = document.getElementById('postWarningModal');
  const text = document.getElementById('postInput').value.trim();
  modal.classList.add('hidden');

  // Save post
  const posts = getPosts();
  posts.unshift({ text, time: Date.now() });
  if (posts.length > 20) posts.pop();
  save(LS.POSTS, posts);

  document.getElementById('postInput').value = '';
  document.getElementById('charCount').textContent = '0';

  // Show success
  document.getElementById('postSuccessModal').classList.remove('hidden');
  renderPostFeed();

  addActivity({ icon: 'dot-blue', text: `Post published (${text.slice(0, 40)}…)`, time: Date.now() });
  refreshDashboard();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function renderPostFeed() {
  const posts = getPosts();
  const feedCard = document.getElementById('postFeedCard');
  const feedEl = document.getElementById('postFeed');
  if (!posts.length) { feedCard.style.display = 'none'; return; }
  feedCard.style.display = 'block';
  feedEl.innerHTML = posts.map(p => `
    <div class="post-feed-item">
      <div class="feed-avatar"><i class="fa-solid fa-user"></i></div>
      <div>
        <strong>You</strong>
        <div class="feed-time">${fmt(p.time)}</div>
        <p style="font-size:.9rem;margin-top:.3rem;">${escHtml(p.text)}</p>
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════════════════
   D. Report & Block System
   ══════════════════════════════════════════════════════════ */

function reportUser() {
  const username = document.getElementById('reportUsername').value.trim();
  const reason   = document.getElementById('reportReason').value;
  const details  = document.getElementById('reportDetails').value.trim();

  if (!username) { toast('<i class="fa-solid fa-circle-exclamation"></i> Please enter a username.', 'warn'); return; }
  if (!reason)   { toast('<i class="fa-solid fa-circle-exclamation"></i> Please select a reason.', 'warn'); return; }

  const reports = getReports();
  reports.unshift({ username, reason, details, time: Date.now() });
  save(LS.REPORTS, reports);

  document.getElementById('reportUsername').value = '';
  document.getElementById('reportReason').value = '';
  document.getElementById('reportDetails').value = '';

  const stats = getStats();
  stats.reports++;
  saveStats(stats);

  addActivity({ icon: 'dot-red', text: `Reported user: ${username} — ${reason}`, time: Date.now() });

  renderReportedList();
  refreshDashboard();
  toast('<i class="fa-solid fa-circle-check"></i> User reported successfully.', 'success');
}

function blockUser() {
  const username = document.getElementById('blockUsername').value.trim();
  const reason   = document.getElementById('blockReason').value.trim();

  if (!username) { toast('<i class="fa-solid fa-circle-exclamation"></i> Please enter a username to block.', 'warn'); return; }

  const blocked = getBlocked();
  if (blocked.find(b => b.username.toLowerCase() === username.toLowerCase())) {
    toast('<i class="fa-solid fa-circle-exclamation"></i> This user is already blocked.', 'warn'); return;
  }

  blocked.unshift({ username, reason: reason || 'No reason given', time: Date.now() });
  save(LS.BLOCKED, blocked);

  document.getElementById('blockUsername').value = '';
  document.getElementById('blockReason').value = '';

  const stats = getStats();
  stats.blocked++;
  saveStats(stats);

  addActivity({ icon: 'dot-indigo', text: `Blocked user: ${username}`, time: Date.now() });

  renderBlockedList();
  refreshDashboard();
  toast('<i class="fa-solid fa-ban"></i> User blocked successfully.', 'success');
}

function removeReport(idx) {
  const reports = getReports();
  reports.splice(idx, 1);
  save(LS.REPORTS, reports);
  renderReportedList();
  refreshDashboard();
  toast('Report removed.', '');
}

function removeBlocked(idx) {
  const blocked = getBlocked();
  blocked.splice(idx, 1);
  save(LS.BLOCKED, blocked);
  renderBlockedList();
  const stats = getStats();
  stats.blocked = Math.max(0, stats.blocked - 1);
  saveStats(stats);
  refreshDashboard();
  toast('User unblocked.', '');
}

function renderReportedList() {
  const reports = getReports();
  const el = document.getElementById('reportedList');
  document.getElementById('reportCount').textContent = reports.length;
  if (!reports.length) {
    el.innerHTML = '<p class="empty-state"><i class="fa-solid fa-inbox"></i> No reports yet.</p>';
    return;
  }
  el.innerHTML = reports.map((r, i) => `
    <div class="user-item">
      <div class="user-info">
        <strong>${escHtml(r.username)}</strong>
        <span>${escHtml(r.reason)} · ${fmt(r.time)}</span>
        ${r.details ? `<span style="color:var(--text-secondary);font-size:.75rem;">${escHtml(r.details)}</span>` : ''}
      </div>
      <div class="user-actions">
        <button class="del-btn" title="Remove" onclick="removeReport(${i})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>`).join('');
}

function renderBlockedList() {
  const blocked = getBlocked();
  const el = document.getElementById('blockedList');
  document.getElementById('blockCount').textContent = blocked.length;
  if (!blocked.length) {
    el.innerHTML = '<p class="empty-state"><i class="fa-solid fa-inbox"></i> No blocked users.</p>';
    return;
  }
  el.innerHTML = blocked.map((b, i) => `
    <div class="user-item">
      <div class="user-info">
        <strong>${escHtml(b.username)}</strong>
        <span>${escHtml(b.reason)} · ${fmt(b.time)}</span>
      </div>
      <div class="user-actions">
        <button class="del-btn" title="Unblock" onclick="removeBlocked(${i})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   E. Evidence Storage
   ══════════════════════════════════════════════════════════ */

let pendingFiles = []; // files staged before save

function handleFileUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const tooBig = files.filter(f => f.size > 10 * 1024 * 1024);
  if (tooBig.length) {
    toast('<i class="fa-solid fa-circle-exclamation"></i> Some files exceed 10 MB and were skipped.', 'warn');
  }

  pendingFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
  renderUploadPreview();
  event.target.value = '';
}

function renderUploadPreview() {
  const wrap = document.getElementById('uploadPreview');
  if (!pendingFiles.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  wrap.innerHTML = pendingFiles.map((f, i) => `
    <div class="preview-chip">
      <i class="${fileIcon(f.name)}"></i>
      ${escHtml(f.name)}
      <span class="rm" onclick="removePending(${i})">✕</span>
    </div>`).join('');
}

function removePending(i) {
  pendingFiles.splice(i, 1);
  renderUploadPreview();
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'fa-solid fa-image';
  if (['pdf'].includes(ext)) return 'fa-solid fa-file-pdf';
  if (['mp4','avi','mov','mkv'].includes(ext)) return 'fa-solid fa-film';
  return 'fa-solid fa-file';
}

function saveEvidence() {
  const note = document.getElementById('evidenceNote').value.trim();
  if (!pendingFiles.length) {
    toast('<i class="fa-solid fa-circle-exclamation"></i> Please select at least one file.', 'warn');
    return;
  }

  const evidence = getEvidence();
  pendingFiles.forEach(f => {
    evidence.unshift({
      name: f.name,
      size: f.size,
      note: note || 'No description',
      time: Date.now(),
    });
  });
  if (evidence.length > 50) evidence.splice(50);
  save(LS.EVIDENCE, evidence);

  const stats = getStats();
  stats.evidence += pendingFiles.length;
  saveStats(stats);

  addActivity({ icon: 'dot-green', text: `Saved ${pendingFiles.length} evidence file(s)`, time: Date.now() });

  pendingFiles = [];
  document.getElementById('evidenceNote').value = '';
  document.getElementById('uploadPreview').classList.add('hidden');

  renderEvidenceList();
  refreshDashboard();
  toast(`<i class="fa-solid fa-circle-check"></i> ${evidence.length > 0 ? pendingFiles.length || 'Evidence' : 'Evidence'} saved successfully.`, 'success');
}

function removeEvidence(idx) {
  const evidence = getEvidence();
  evidence.splice(idx, 1);
  save(LS.EVIDENCE, evidence);
  const stats = getStats();
  stats.evidence = Math.max(0, stats.evidence - 1);
  saveStats(stats);
  renderEvidenceList();
  refreshDashboard();
  toast('Evidence removed.', '');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderEvidenceList() {
  const evidence = getEvidence();
  const el = document.getElementById('evidenceList');
  document.getElementById('evidenceCount').textContent = evidence.length;
  if (!evidence.length) {
    el.innerHTML = '<p class="empty-state"><i class="fa-solid fa-inbox"></i> No evidence stored yet.</p>';
    return;
  }
  el.innerHTML = evidence.map((e, i) => `
    <div class="evidence-item">
      <i class="${fileIcon(e.name)} evidence-icon"></i>
      <div class="evidence-info" style="flex:1;">
        <strong>${escHtml(e.name)}</strong>
        <span>${escHtml(e.note)} · ${formatSize(e.size)} · ${fmt(e.time)}</span>
      </div>
      <button class="btn btn-sm btn-ghost" onclick="removeEvidence(${i})" title="Remove">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   G. Education Tabs
   ══════════════════════════════════════════════════════════ */

function switchEduTab(btn, panelId) {
  document.querySelectorAll('.edu-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.edu-panel').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  btn.classList.add('active');
  const panel = document.getElementById(panelId);
  panel.style.display = 'block';
  panel.classList.add('active');
}

/* ══════════════════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════════════════ */

function refreshDashboard() {
  const stats = getStats();

  document.getElementById('stat-analyzed').textContent = stats.analyzed;
  document.getElementById('stat-safe').textContent     = stats.safe;
  document.getElementById('stat-harmful').textContent  = stats.harmful;
  document.getElementById('stat-reports').textContent  = stats.reports;
  document.getElementById('stat-blocked').textContent  = stats.blocked;
  document.getElementById('stat-evidence').textContent = stats.evidence;

  // Safety Score
  const totalActions = stats.analyzed + stats.reports + stats.blocked + stats.evidence;
  let score = 0;
  if (totalActions > 0) {
    const harmlessRatio = stats.analyzed > 0 ? stats.safe / stats.analyzed : 1;
    score = Math.min(100, Math.round(
      (harmlessRatio * 50) +
      (Math.min(stats.reports, 10) * 2) +
      (Math.min(stats.blocked, 10) * 1.5) +
      (Math.min(stats.evidence, 10) * 1)
    ));
  }

  const scoreVal = document.getElementById('scoreVal');
  const ringFill = document.getElementById('ringFill');
  const scoreMsg = document.getElementById('scoreMessage');

  if (totalActions === 0) {
    scoreVal.textContent = '—';
    ringFill.style.strokeDashoffset = 314;
  } else {
    scoreVal.textContent = score;
    const offset = 314 - (314 * score / 100);
    ringFill.style.strokeDashoffset = offset;

    if (score >= 80)      { ringFill.style.stroke = 'var(--green)';  scoreMsg.textContent = '🌟 Excellent! You are actively keeping your digital space safe.'; }
    else if (score >= 60) { ringFill.style.stroke = 'var(--blue)';   scoreMsg.textContent = '👍 Good job! Keep using SafeSocial features to improve your score.'; }
    else if (score >= 40) { ringFill.style.stroke = 'var(--orange)'; scoreMsg.textContent = '⚠️ Moderate safety level. Try reporting bullying and saving evidence.'; }
    else                  { ringFill.style.stroke = 'var(--red)';    scoreMsg.textContent = '🔴 Low score. Take active steps to protect yourself and others online.'; }
  }

  renderActivityLog();

  // Keep these report/block counts in sync
  document.getElementById('reportCount').textContent = getReports().length;
  document.getElementById('blockCount').textContent  = getBlocked().length;
  document.getElementById('evidenceCount').textContent = getEvidence().length;
}

/* ── Activity Log ───────────────────────────────────────── */
function addActivity(entry) {
  const log = getActivity();
  log.unshift(entry);
  if (log.length > 30) log.pop();
  save(LS.ACTIVITY, log);
}

function renderActivityLog() {
  const log = getActivity();
  const el = document.getElementById('activityLog');
  const clearBtn = document.getElementById('clearActivityBtn');
  if (!log.length) {
    el.innerHTML = '<p class="empty-state"><i class="fa-solid fa-inbox"></i> No activity yet. Start using SafeSocial!</p>';
    clearBtn.style.display = 'none';
    return;
  }
  clearBtn.style.display = 'inline-flex';
  el.innerHTML = log.map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.icon}"></div>
      <span>${escHtml(a.text)}</span>
      <span class="activity-time">${fmt(a.time)}</span>
    </div>`).join('');
}

function clearActivity() {
  if (!confirm('Clear all activity logs?')) return;
  save(LS.ACTIVITY, []);
  renderActivityLog();
  toast('Activity log cleared.', '');
}

/* ── Reset All ──────────────────────────────────────────── */
function resetAllData() {
  if (!confirm('Are you sure? This will permanently erase all SafeSocial data on this device.')) return;
  [LS.STATS, LS.REPORTS, LS.BLOCKED, LS.EVIDENCE, LS.ACTIVITY, LS.POSTS].forEach(k => localStorage.removeItem(k));
  pendingFiles = [];
  renderReportedList();
  renderBlockedList();
  renderEvidenceList();
  renderPostFeed();
  refreshDashboard();
  toast('<i class="fa-solid fa-rotate-right"></i> All data has been reset.', '');
}

/* ── Escape HTML ────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ── Drag & drop upload ──────────────────────────────────── */
const uploadZone = document.getElementById('uploadZone');
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.background = 'var(--blue-light)'; });
uploadZone.addEventListener('dragleave', () => { uploadZone.style.background = ''; });
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.style.background = '';
  const files = Array.from(e.dataTransfer.files);
  pendingFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
  renderUploadPreview();
});

/* ══════════════════════════════════════════════════════════
   Init
   ══════════════════════════════════════════════════════════ */
(function init() {
  goTo('home');
  renderReportedList();
  renderBlockedList();
  renderEvidenceList();
  renderPostFeed();
  refreshDashboard();
  console.log('SafeSocial v1.0 — Loaded ✅');
})();

