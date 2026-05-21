// ===== State =====
var state = { baziGender: 1, fsGender: 1, selectedZodiac: 0, selectedSpread: 0, currentPage: 'home', currentUser: null };

// ===== Init =====
document.addEventListener('DOMContentLoaded', function() {
  Cloud.init();
  // 检查密码重置回调
  var hash = window.location.hash;
  if (hash.indexOf('type=recovery') > -1) {
    var params = {};
    hash.substring(1).split('&').forEach(function(p) {
      var kv = p.split('=');
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    window.location.hash = '';
    if (params.access_token) {
      showResetPasswordPage(params.access_token);
      return;
    }
  }
  // 检查自定义重置 token (?reset=xxx)
  var urlParams = new URLSearchParams(window.location.search);
  var resetToken = urlParams.get('reset');
  if (resetToken) {
    window.history.replaceState(null, '', window.location.pathname);
    showResetPasswordPage(null, resetToken);
    return;
  }
  // 先检查是否有 OAuth 回调
  Cloud.handleOAuthCallback(function(err, user) {
    if (user) {
      state.currentUser = user;
      updateUI();
      _startRealtime(user);
      showToast('欢迎，' + (user.nick || user.username) + '！');
    } else {
      restoreSession();
    }
    renderDaily();
    renderTarotSpreads();
    renderZodiacGrid();
    renderZodiacInfo();
    renderKnowledgeList();
    initBottomBar();
    initFabTop();
    restoreBg();
  });
});

// ===== Page Navigation =====
function goPage(name) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.remove('active');
  }
  var target = document.getElementById('page-' + name);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }
  state.currentPage = name;

  // Update bottom bar
  var tabs = document.querySelectorAll('#bottomBar .tab-item');
  for (var j = 0; j < tabs.length; j++) {
    tabs[j].classList.remove('active');
    if (tabs[j].getAttribute('data-page') === name) {
      tabs[j].classList.add('active');
    }
  }

  // Lazy init
  if (name === 'daily' && !state._dailyInit) { renderDaily(); state._dailyInit = true; }
  if (name === 'profile') { if (state.currentUser) renderProfile(); initBgSettings(); }
}

function scrollPageTop() {
  var active = document.querySelector('.page.active');
  if (active) active.scrollTop = 0;
}

// ===== Bottom Bar =====
function initBottomBar() {
  var bar = document.getElementById('bottomBar');
  if (!bar) return;
  var tabs = bar.querySelectorAll('.tab-item');
  for (var i = 0; i < tabs.length; i++) {
    (function(tab) {
      var touched = false;
      tab.addEventListener('touchstart', function() { touched = true; }, { passive: true });
      tab.addEventListener('touchend', function(e) {
        e.preventDefault();
        var page = tab.getAttribute('data-page');
        if (page) goPage(page);
      }, { passive: false });
      tab.addEventListener('click', function(e) {
        if (touched) { touched = false; return; }
        var page = tab.getAttribute('data-page');
        if (page) goPage(page);
      });
    })(tabs[i]);
  }
}

// ===== FAB =====
function initFabTop() {
  var fab = document.getElementById('fabTop');
  if (!fab) return;
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) {
    (function(page) {
      page.addEventListener('scroll', function() {
        if (page.scrollTop > 300) fab.classList.add('visible');
        else fab.classList.remove('visible');
      }, { passive: true });
    })(pages[i]);
  }
}

// ===== Gender =====
function setGender(type, val, btn) {
  if (type === 'bazi') state.baziGender = val;
  else state.fsGender = val;
  var btns = btn.parentElement.querySelectorAll('.gender-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  btn.classList.add('active');
}

// ===== Daily Fortune =====
function renderDaily() {
  var f = getDailyFortune();
  var dateLabel = document.getElementById('daily-date-label');
  if (dateLabel) dateLabel.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center">' + f.date + ' 运势概览</p>';
  var bars = [
    { icon: '💕', label: '爱情', val: f.love, color: '#fd79a8' },
    { icon: '💼', label: '事业', val: f.career, color: '#a29bfe' },
    { icon: '💰', label: '财运', val: f.wealth, color: '#fdcb6e' },
    { icon: '🏃', label: '健康', val: f.health, color: '#00b894' }
  ];
  var el = document.getElementById('daily-result');
  if (!el) return;
  el.innerHTML = '<div class="fortune-grid">' +
    '<div class="card fortune-score">' +
      '<div class="score-number">' + f.overall + '</div>' +
      '<div class="score-label">综合运势评分</div>' +
      '<div class="score-summary">' + f.summary + '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="bar-group">' +
        bars.map(function(b) {
          return '<div class="bar-item"><span class="bar-icon">' + b.icon + '</span><span class="bar-label">' + b.label + '</span><div class="bar-track"><div class="bar-fill" style="width:' + b.val + '%;background:' + b.color + '"></div></div><span class="bar-value">' + b.val + '</span></div>';
        }).join('') +
      '</div>' +
      '<div class="yi-ji">' +
        '<div class="yj-col"><div class="yj-title yi">宜</div><div class="yj-tags">' + f.yi.map(function(t){return '<span class="yj-tag yi">'+t+'</span>';}).join('') + '</div></div>' +
        '<div class="yj-col"><div class="yj-title ji">忌</div><div class="yj-tags">' + f.ji.map(function(t){return '<span class="yj-tag ji">'+t+'</span>';}).join('') + '</div></div>' +
      '</div>' +
      '<div class="lucky-row">' +
        '<div class="lucky-item"><span class="lucky-icon">🎨</span><span class="lucky-label">幸运色</span><span class="lucky-value">' + f.luckyColor + '</span></div>' +
        '<div class="lucky-item"><span class="lucky-icon">🔢</span><span class="lucky-label">幸运数</span><span class="lucky-value">' + f.luckyNumber + '</span></div>' +
        '<div class="lucky-item"><span class="lucky-icon">🧭</span><span class="lucky-label">幸运方位</span><span class="lucky-value">' + f.luckyDirection + '</span></div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="reading-block"><div class="reading-title">💡 今日建议</div><div class="reading-text">' + f.advice + '</div></div>' +
    '</div>' +
  '</div>';
}

// ===== Bazi =====
function doBazi() {
  var y = +document.getElementById('bazi-year').value;
  var m = +document.getElementById('bazi-month').value;
  var d = +document.getElementById('bazi-day').value;
  var h = +document.getElementById('bazi-hour').value;
  if (!y || !m || !d) return alert('请填写完整的出生信息');
  var bazi = calcBazi(y, m, d, h, state.baziGender);
  var reading = baziReading(bazi);
  addHistory('bazi', y + '年' + m + '月' + d + '日 · ' + bazi.dayMaster + bazi.dayMasterWuxing + '命');
  var wxColors = {'金':'#FFD700','木':'#4CAF50','水':'#2196F3','火':'#F44336','土':'#CD853F'};
  var maxWx = Math.max(Object.values(bazi.stats).reduce(function(a,b){return Math.max(a,b);},0));
  document.getElementById('bazi-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">四柱八字</h3>' +
        '<div class="pillars-grid">' +
          bazi.pillars.map(function(p){return '<div class="pillar-card"><div class="pillar-label">'+p.label+'</div><div class="pillar-stem">'+p.stem+'</div><div class="pillar-branch">'+p.branch+'</div><div class="pillar-wx">'+GAN_WX[p.stem]+' · '+ZHI_WX[p.branch]+'</div></div>';}).join('') +
        '</div>' +
        '<div class="info-grid">' +
          '<div class="info-item"><div class="info-label">日主</div><div class="info-value gold">'+bazi.dayMaster+'（'+bazi.dayMasterWuxing+'）</div></div>' +
          '<div class="info-item"><div class="info-label">生肖</div><div class="info-value">'+bazi.zodiac+'</div></div>' +
          '<div class="info-item"><div class="info-label">纳音</div><div class="info-value">'+bazi.nayin+'</div></div>' +
          '<div class="info-item"><div class="info-label">性别</div><div class="info-value">'+(bazi.gender)+'</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:12px;font-family:serif;font-size:16px">五行统计</h3>' +
        '<div class="wuxing-bars">' +
          Object.entries(bazi.stats).map(function(e){return '<div class="wx-item"><span class="wx-name wx-'+e[0]+'">'+e[0]+'</span><div class="bar-track"><div class="bar-fill" style="width:'+(e[1]/maxWx*100)+'%;background:'+wxColors[e[0]]+'"></div></div><span style="width:20px;text-align:right;font-size:13px;color:var(--text-secondary)">'+e[1]+'</span></div>';}).join('') +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:12px;font-family:serif;font-size:16px">命理解读</h3>' +
        '<div class="reading-block"><div class="reading-title">🎭 性格</div><div class="reading-text">'+reading.personality+'</div></div>' +
        '<div class="reading-block"><div class="reading-title">💼 事业</div><div class="reading-text">'+reading.career+'</div></div>' +
        '<div class="reading-block"><div class="reading-title">💕 感情</div><div class="reading-text">'+reading.love+'</div></div>' +
        '<div class="reading-block"><div class="reading-title">🏥 健康</div><div class="reading-text">'+reading.health+'</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:12px;font-family:serif;font-size:16px">大运</h3>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
          bazi.dayun.map(function(dy){return '<div class="info-item" style="flex:1;min-width:100px;text-align:center"><div class="info-label">'+dy.startAge+'-'+dy.endAge+'岁</div><div class="info-value gold">'+dy.stem+dy.branch+'</div></div>';}).join('') +
        '</div>' +
      '</div>' +
    '</div>';
}

// ===== Zhouyi =====
function doZhouyi() {
  var btn = document.getElementById('zhouyi-btn');
  btn.disabled = true; btn.textContent = '☯ 正在起卦...';
  document.getElementById('zhouyi-result').innerHTML = '<div class="loading"><div class="loading-emoji">☯</div><div class="loading-text">正在起卦...</div></div>';
  setTimeout(function() {
    var result = coinDivination();
    var o = result.original;
    addHistory('zhouyi', o.full + ' · ' + o.kw.join(' '));
    var html = '<div class="result-area"><div class="card"><div class="gua-display"><div class="gua-name">'+o.full+'</div><div class="gua-ci">「'+o.ci+'」</div><div class="divider"></div><div class="gua-interp">'+o.interp+'</div><div class="gua-tags">'+o.kw.map(function(k){return '<span class="gua-tag">'+k+'</span>';}).join('')+'</div></div></div>';
    if (result.changed) {
      var c = result.changed;
      html += '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:10px;font-family:serif;font-size:16px">变卦</h3><div class="gua-display"><div class="gua-name">'+c.full+'</div><div class="gua-ci">「'+c.ci+'」</div><div class="divider"></div><div class="gua-interp">'+c.interp+'</div></div></div>';
    }
    html += '</div>';
    document.getElementById('zhouyi-result').innerHTML = html;
    btn.disabled = false; btn.textContent = '☯ 重新起卦';
  }, 1500);
}

// ===== Tarot =====
function renderTarotSpreads() {
  var el = document.getElementById('tarot-spreads');
  if (!el) return;
  el.innerHTML = TAROT_SPREADS.map(function(s, i) {
    return '<button class="spread-btn ' + (i===0?'active':'') + '" onclick="selectSpread(' + i + ',this)">' + s.name + '（' + s.count + '张）</button>';
  }).join('');
}
function selectSpread(idx, btn) {
  state.selectedSpread = idx;
  var btns = btn.parentElement.querySelectorAll('.spread-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  btn.classList.add('active');
}
function doTarot() {
  var btn = document.getElementById('tarot-btn');
  var spread = TAROT_SPREADS[state.selectedSpread];
  btn.disabled = true; btn.textContent = '🃏 洗牌抽牌中...';
  document.getElementById('tarot-result').innerHTML = '<div class="loading"><div class="loading-emoji">🃏</div><div class="loading-text">正在洗牌抽牌...</div></div>';
  setTimeout(function() {
    var cards = drawTarotCards(spread);
    addHistory('tarot', spread.name + ' · ' + cards.map(function(c){return c.card.name;}).join(' / '));
    document.getElementById('tarot-result').innerHTML =
      '<div class="result-area"><div class="card"><h3 style="color:var(--gold);margin-bottom:16px;font-family:serif;font-size:16px">'+spread.name+'解读</h3>' +
        '<div class="tarot-cards">' +
          cards.map(function(c) {
            return '<div class="tarot-card '+(c.isReversed?'reversed':'')+'"><div class="tarot-card-inner"><div class="tarot-position">'+c.position+'</div><div class="tarot-name">'+c.card.name+'</div><span class="tarot-dir '+(c.isReversed?'rev':'up')+'">'+(c.isReversed?'逆位':'正位')+'</span><div class="tarot-meaning">'+(c.isReversed?c.card.rev:c.card.up)+'</div></div></div>';
          }).join('') +
        '</div></div></div>';
    btn.disabled = false; btn.textContent = '🃏 重新抽牌（' + spread.count + '张）';
  }, 1200);
}

// ===== Zodiac =====
function renderZodiacGrid() {
  var el = document.getElementById('zodiac-grid');
  if (!el) return;
  el.innerHTML = ZODIAC_SIGNS.map(function(s, i) {
    return '<div class="zodiac-chip '+(i===0?'active':'')+'" onclick="selectZodiac('+i+',this)"><span class="zodiac-sym">'+s.sym+'</span><span class="zodiac-nm">'+s.name+'</span></div>';
  }).join('');
}
function selectZodiac(idx, el) {
  state.selectedZodiac = idx;
  var chips = el.parentElement.querySelectorAll('.zodiac-chip');
  for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
  el.classList.add('active');
  renderZodiacInfo();
}
function renderZodiacInfo() {
  var s = ZODIAC_SIGNS[state.selectedZodiac];
  var el = document.getElementById('zodiac-info');
  if (!el) return;
  el.innerHTML = '<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px"><span style="font-size:42px">'+s.sym+'</span><div><div style="font-size:18px;font-weight:700">'+s.name+'</div><div style="font-size:12px;color:var(--text-muted)">'+s.dr+'</div></div></div><div class="traits">'+s.traits.map(function(t){return '<span class="trait-tag">'+t+'</span>';}).join('')+'</div>';
}
function doZodiac() {
  var s = ZODIAC_SIGNS[state.selectedZodiac];
  var f = zodiacDaily(s.id);
  addHistory('zodiac', s.name + ' · 综合运势' + f.overall + '分');
  var bars = [
    { icon: '💕', label: '爱情', val: f.love, color: '#fd79a8' },
    { icon: '💼', label: '事业', val: f.career, color: '#a29bfe' },
    { icon: '💰', label: '财运', val: f.wealth, color: '#fdcb6e' },
    { icon: '🏃', label: '健康', val: f.health, color: '#00b894' }
  ];
  var today = new Date();
  var dateStr = today.getFullYear() + '年' + (today.getMonth()+1) + '月' + today.getDate() + '日';
  document.getElementById('zodiac-result').innerHTML =
    '<div class="result-area"><div class="card"><h3 style="color:var(--gold);margin-bottom:4px;font-family:serif;font-size:16px">' + s.sym + ' ' + s.name + '今日运势</h3>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:16px">' + dateStr + ' · 守护元素：' + s.el + '</div>' +
      '<div style="text-align:center;margin-bottom:20px"><span style="font-size:56px;font-weight:900;color:var(--gold);font-family:serif">' + f.overall + '</span><span style="font-size:14px;color:var(--text-muted)">/100</span></div>' +
      '<div class="bar-group">' + bars.map(function(b){return '<div class="bar-item"><span class="bar-icon">' + b.icon + '</span><span class="bar-label">' + b.label + '</span><div class="bar-track"><div class="bar-fill" style="width:' + b.val + '%;background:' + b.color + '"></div></div><span class="bar-value">' + b.val + '</span></div>';}).join('') + '</div>' +
      '<div class="divider"></div>' +
      '<div class="reading-block"><div class="reading-title">📊 运势概述</div><div class="reading-text">' + f.summary + '</div></div>' +
      '<div class="reading-block"><div class="reading-title">💕 爱情运势</div><div class="reading-text">' + f.loveDetail + '</div></div>' +
      '<div class="reading-block"><div class="reading-title">💼 事业运势</div><div class="reading-text">' + f.careerDetail + '</div></div>' +
      '<div class="reading-block"><div class="reading-title">💰 财运分析</div><div class="reading-text">' + f.wealthDetail + '</div></div>' +
      '<div class="reading-block"><div class="reading-title">🏃 健康提醒</div><div class="reading-text">' + f.healthDetail + '</div></div>' +
      '<div class="divider"></div>' +
      '<div class="reading-block"><div class="reading-title">💡 今日建议</div><div class="reading-text">' + f.advice + '</div></div>' +
    '</div>' +
    '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:12px;font-family:serif;font-size:16px">🍀 今日开运</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">幸运颜色</div><div style="font-size:14px;font-weight:600;color:var(--gold)">' + f.luckyColor + '</div></div>' +
        '<div style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">幸运方位</div><div style="font-size:14px;font-weight:600;color:var(--gold)">' + f.luckyDir + '</div></div>' +
        '<div style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">幸运数字</div><div style="font-size:14px;font-weight:600;color:var(--gold)">' + f.luckyNum + '</div></div>' +
        '<div style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-sm);text-align:center"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">开运食物</div><div style="font-size:14px;font-weight:600;color:var(--gold)">' + f.luckyFood + '</div></div>' +
      '</div>' +
    '</div></div>';
}

// ===== Name =====
function doName() {
  var name = document.getElementById('name-input').value.trim();
  if (!name || name.length < 2) return alert('请输入至少两个字的姓名');
  var surname = name[0], given = name.slice(1);
  var result = calcName(surname, given);
  addHistory('name', name + ' · 评分' + result.score + '分');
  var ges = [
    { label: '天格（祖上）', ge: result.tianGe },
    { label: '人格（主运）', ge: result.renGe },
    { label: '地格（前运）', ge: result.diGe },
    { label: '外格（社交）', ge: result.waiGe },
    { label: '总格（后运）', ge: result.zongGe }
  ];
  document.getElementById('name-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card" style="text-align:center"><div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">姓名评分</div><div style="font-size:64px;font-weight:900;color:var(--gold);font-family:serif">'+result.score+'</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">满分 99</div></div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:10px;font-family:serif;font-size:16px">五格分析</h3>' +
        '<table class="ge-table"><thead><tr><th>格局</th><th>数理</th><th>五行</th><th>吉凶</th></tr></thead><tbody>' +
          ges.map(function(g){return '<tr><td>'+g.label+'</td><td class="ge-num">'+g.ge.num+'</td><td>'+g.ge.wx+'</td><td><span class="ge-luck '+(g.ge.luck==='大吉'||g.ge.luck==='吉'?'good':'bad')+'">'+g.ge.luck+'</span></td></tr>';}).join('') +
        '</tbody></table></div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:8px;font-family:serif;font-size:16px">解读</h3><div class="reading-text">' +
        (result.score>=90?'此名五格配置极佳。':result.score>=80?'此名五格配置良好。':result.score>=70?'此名格局尚可。':'此名五格配置一般。') +
        ' 人格（'+result.renGe.num+'）五行属'+result.renGe.wx+'，'+(result.renGe.luck==='大吉'?'大吉大利。':result.renGe.luck==='吉'?'吉利。':'需注意。') +
        ' 总格（'+result.zongGe.num+'）五行属'+result.zongGe.wx+'，'+(result.zongGe.luck==='大吉'?'主晚年亨通。':result.zongGe.luck==='吉'?'主中晚年安稳。':'需多加注意。') +
      '</div></div></div>';
}

// ===== Fengshui =====
function doFengShui() {
  var year = +document.getElementById('fs-year').value;
  if (!year) return alert('请输入出生年份');
  var result = calcFengShui(year, state.fsGender);
  addHistory('fengshui', result.kua + '卦 · ' + result.group + ' · 生气方' + result.sq);
  document.getElementById('fs-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card"><h3 style="color:var(--gold);margin-bottom:12px;font-family:serif;font-size:16px">命卦信息</h3><div class="info-grid"><div class="info-item"><div class="info-label">命卦数</div><div class="info-value gold">'+result.kua+'</div></div><div class="info-item"><div class="info-label">命属</div><div class="info-value">'+result.group+'</div></div></div></div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--accent-green);margin-bottom:10px;font-family:serif;font-size:16px">✨ 吉方</h3><div class="dir-grid">' +
        '<div class="dir-card good"><div class="dir-name">生气方</div><div class="dir-val">'+result.sq+'</div><div class="dir-desc">最吉利，利事业财运</div></div>' +
        '<div class="dir-card good"><div class="dir-name">天医方</div><div class="dir-val">'+result.ty+'</div><div class="dir-desc">利健康</div></div>' +
        '<div class="dir-card good"><div class="dir-name">延年方</div><div class="dir-val">'+result.yn+'</div><div class="dir-desc">利感情婚姻</div></div>' +
      '</div></div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--accent-red);margin-bottom:10px;font-family:serif;font-size:16px">⚠️ 凶方</h3><div class="dir-grid">' +
        '<div class="dir-card bad"><div class="dir-name">祸害方</div><div class="dir-val">'+result.hh+'</div></div>' +
        '<div class="dir-card bad"><div class="dir-name">六煞方</div><div class="dir-val">'+result.ls+'</div></div>' +
        '<div class="dir-card bad"><div class="dir-name">五鬼方</div><div class="dir-val">'+result.wg+'</div></div>' +
        '<div class="dir-card bad"><div class="dir-name">绝命方</div><div class="dir-val">'+result.jm+'</div></div>' +
      '</div></div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:8px;font-family:serif;font-size:16px">🏠 布局建议</h3><div class="reading-text">' +
        '你属于<strong style="color:var(--gold)">'+result.group+'</strong>。<br><br>🛏️ 卧室宜朝向生气方（'+result.sq+'）或延年方（'+result.yn+'）。<br>📖 书房宜在生气方（'+result.sq+'）。<br>🍳 厨房宜在天医方（'+result.ty+'）。<br>🚿 卫生间宜在绝命方（'+result.jm+'）。<br>🚪 大门宜朝向生气方（'+result.sq+'）。' +
      '</div></div></div>';
}

// ===== Numerology =====
function doLifePath() {
  var val = document.getElementById('num-birth').value;
  if (!val) return alert('请选择出生日期');
  var parts = val.split('-').map(Number);
  var result = lifePath(parts[0], parts[1], parts[2]);
  addHistory('numerology', '生命灵数 ' + result.num);
  document.getElementById('num-result').innerHTML =
    '<div class="result-area"><div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">你的生命灵数</h3>' +
      '<div class="life-path-display"><div class="life-num">'+result.num+'</div><div><div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">生命灵数</div><div style="font-size:16px;font-weight:600">'+(result.num<=9?(['','领导','调解','创造','建设','冒险','照顾','思考','商业','理想'][result.num]||'大师'):result.num===11?'灵性导师':result.num===22?'建造大师':'治愈大师')+'</div></div></div>' +
      '<div class="reading-block"><div class="reading-title">📖 灵数含义</div><div class="reading-text">'+result.meaning+'</div></div></div></div>';
}
function doNumberAnalysis() {
  var num = document.getElementById('num-phone').value.replace(/\D/g, '');
  if (num.length < 4) return alert('请输入至少4位数字');
  var digits = num.split('').map(Number);
  var sum = digits.reduce(function(a,b){return a+b;},0);
  var main = sum; while(main>9) main = String(main).split('').reduce(function(a,b){return a+parseInt(b);},0);
  var wxMap = {1:'木',2:'土',3:'火',4:'木',5:'土',6:'金',7:'金',8:'土',9:'火'};
  var score = 60 + ([1,3,6,8].indexOf(main)>=0?15:5);
  var hasRepeat = digits.some(function(d,i){return digits.indexOf(d)!==i;});
  if (!hasRepeat) score += 10;
  score = Math.min(99, score);
  addHistory('numerology', '号码分析 · 主数' + main);
  document.getElementById('num-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card" style="text-align:center"><div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">号码能量评分</div><div style="font-size:64px;font-weight:900;color:var(--gold);font-family:serif">'+score+'</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">五行属'+(wxMap[main]||'土')+' · 主数'+main+'</div></div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:8px;font-family:serif;font-size:16px">分析详情</h3><div class="reading-text">' +
        (score>=85?'此号码能量极强。':score>=75?'此号码能量较好。':score>=65?'此号码能量一般。':'此号码能量偏弱。') +
        '<br><br>📊 数字总和：'+sum+'<br>🔢 主数：'+main+'（五行'+(wxMap[main]||'土')+'）<br>' +
        (!hasRepeat?'✅ 号码无重复数字，能量纯粹。':'⚠️ 号码存在重复数字。') +
      '</div></div></div>';
}

// ===== Realtime 实时同步 =====
function _startRealtime(user) {
  if (!user || !user.userId) return;
  Cloud.startRealtime(user.userId, {
    onHistoryChange: function(type, record, oldRecord) {
      if (!state.currentUser) return;
      var h = state.currentUser.history || [];
      if (type === 'INSERT' && record) {
        var exists = h.some(function(x) { return x.time === record.created_at; });
        if (!exists) {
          h.push({ type: record.type, detail: record.detail, time: record.created_at });
          state.currentUser.history = h;
        }
      } else if (type === 'DELETE' && oldRecord) {
        state.currentUser.history = h.filter(function(x) { return x.time !== oldRecord.created_at; });
      } else if (type === 'UPDATE') {
        Cloud.loadHistory(function() {});
      }
      if (state.currentPage === 'profile') renderProfile();
    }
  });
}

// ============================================
// ============================================
// AUTH MODULE (uses Cloud module)
// ============================================
function restoreSession(){
  Cloud.getCurrentUser(function(err, user) {
    if (user) { state.currentUser = user; _startRealtime(user); }
    updateUI();
  });
}
function updateUI(){
  var avatar=document.getElementById('navAvatar');
  if(state.currentUser){
    var u=state.currentUser;var initial=(u.nick||u.username)[0].toUpperCase();
    avatar.textContent=initial;avatar.classList.add('logged');
  }else{avatar.textContent='👤';avatar.classList.remove('logged');}
}
function handleUserClick(){
  if(state.currentUser)goPage('profile');else openAuth();
}
function openAuth(){
  document.getElementById('authOverlay').classList.add('open');
  showLogin();
  _fillRememberedAccount();
}
function closeAuth(){document.getElementById('authOverlay').classList.remove('open');document.getElementById('loginError').textContent='';document.getElementById('regError').textContent='';}
function closeAuthIfBg(e){if(e.target===e.currentTarget)closeAuth();}
function showLogin(){document.getElementById('loginPanel').style.display='';document.getElementById('registerPanel').style.display='none';document.getElementById('forgotPanel').style.display='none';document.getElementById('regError').textContent='';document.getElementById('forgotError').textContent='';document.getElementById('authTitle').textContent='登录';}
function showRegister(){document.getElementById('loginPanel').style.display='none';document.getElementById('registerPanel').style.display='';document.getElementById('forgotPanel').style.display='none';document.getElementById('loginError').textContent='';document.getElementById('authTitle').textContent='注册';}
function showForgotPassword(){
  document.getElementById('loginPanel').style.display='none';
  document.getElementById('registerPanel').style.display='none';
  document.getElementById('forgotPanel').style.display='';
  document.getElementById('loginError').textContent='';
  document.getElementById('authTitle').textContent='忘记密码';
  // 恢复原始表单（发送成功后innerHTML会被替换）
  var fp=document.getElementById('forgotPanel');
  if(!document.getElementById('forgotEmail')){
    fp.innerHTML='<p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;line-height:1.6">输入注册时使用的<strong>用户名或邮箱</strong>，我们将发送密码重置链接。<br><span style="font-size:11px;opacity:0.7">（用户名注册的账号需已绑定邮箱）</span></p><input class="auth-input" id="forgotEmail" placeholder="用户名或邮箱" autocomplete="email" type="text"><div class="auth-error" id="forgotError"></div><button class="btn-primary" style="width:100%" onclick="doResetPassword()">发送重置链接</button><div class="auth-switch"><a href="javascript:void(0)" onclick="showLogin()">← 返回登录</a></div>';
  }
  _updateResetCooldown();
}
var _resetCooldownTimer = null;
function _getResetRemain() {
  var end = parseInt(localStorage.getItem('tianji_reset_cd') || '0', 10);
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
}
function _updateResetCooldown() {
  if (_resetCooldownTimer) { clearInterval(_resetCooldownTimer); _resetCooldownTimer = null; }
  var btn = document.querySelector('#forgotPanel .btn-primary');
  if (!btn) return;
  function tick() {
    var remain = _getResetRemain();
    var cdEl = document.getElementById('resetCooldown');
    if (remain > 0) {
      btn.disabled = true;
      if (cdEl) {
        cdEl.textContent = '操作过于频繁，请 ' + remain + ' 秒后重试';
        cdEl.style.display = '';
      } else {
        var sp = document.createElement('div');
        sp.id = 'resetCooldown';
        sp.style.cssText = 'font-size:12px;color:#e85d5d;text-align:center;margin-top:8px';
        sp.textContent = '操作过于频繁，请 ' + remain + ' 秒后重试';
        btn.parentNode.insertBefore(sp, btn.nextSibling);
      }
    } else {
      btn.disabled = false;
      var el = document.getElementById('resetCooldown');
      if (el) el.remove();
      if (_resetCooldownTimer) { clearInterval(_resetCooldownTimer); _resetCooldownTimer = null; }
      localStorage.removeItem('tianji_reset_cd');
    }
  }
  tick();
  if (_getResetRemain() > 0) _resetCooldownTimer = setInterval(tick, 1000);
}
function doResetPassword(){
  var errEl=document.getElementById('forgotError');
  errEl.textContent='';
  // 冷却检查
  var remain = _getResetRemain();
  if (remain > 0) {
    errEl.textContent = '操作过于频繁，请 ' + remain + ' 秒后重试';
    _updateResetCooldown();
    return;
  }
  var account=document.getElementById('forgotEmail').value.trim();
  if(!account){errEl.textContent='请输入用户名或邮箱地址';return;}
  var btn=document.querySelector('#forgotPanel .btn-primary');
  btn.textContent='发送中...';btn.disabled=true;
  Cloud.resetPassword(account,function(err){
    if(err){btn.textContent='发送重置链接';btn.disabled=false;errEl.textContent=err;return;}
    localStorage.setItem('tianji_reset_cd', String(Date.now() + 60 * 1000));
    document.getElementById('forgotPanel').innerHTML='<div style="text-align:center;padding:20px 0"><div style="font-size:40px;margin-bottom:12px">📧</div><div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--gold)">重置链接已发送</div><div style="font-size:13px;color:var(--text-muted);line-height:1.6">请检查你的邮箱（包括垃圾邮件），<br>点击链接即可重置密码。</div><div class="auth-switch" style="margin-top:16px"><a href="javascript:void(0)" onclick="showLogin()">← 返回登录</a></div></div>';
  });
}
function showResetPasswordPage(accessToken, customToken){
  var overlay=document.getElementById('authOverlay');
  overlay.classList.add('open');
  document.getElementById('loginPanel').style.display='none';
  document.getElementById('registerPanel').style.display='none';
  document.getElementById('forgotPanel').style.display='';
  document.getElementById('authTitle').textContent='设置新密码';
  var panel=document.getElementById('forgotPanel');
  panel.innerHTML='<p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">请输入你的新密码</p><input class="auth-input" id="newPassInput" type="password" placeholder="新密码（至少6位）" autocomplete="new-password"><input class="auth-input" id="newPassInput2" type="password" placeholder="确认新密码" autocomplete="new-password" style="margin-top:10px"><div class="auth-error" id="resetError"></div><button class="btn-primary" style="width:100%" onclick="doSetNewPassword()">确认重置</button><div class="auth-switch"><a href="javascript:void(0)" onclick="closeAuth()">取消</a></div>';
  window._resetAccessToken=accessToken;
  window._resetCustomToken=customToken;
}
function doSetNewPassword(){
  var errEl=document.getElementById('resetError');
  errEl.textContent='';
  var pass=document.getElementById('newPassInput').value;
  var pass2=document.getElementById('newPassInput2').value;
  if(!pass||pass.length<6){errEl.textContent='密码至少6位';return;}
  if(pass!==pass2){errEl.textContent='两次密码不一致';return;}
  var btn=document.querySelector('#forgotPanel .btn-primary');
  btn.textContent='重置中...';btn.disabled=true;
  var done=function(err){
    btn.textContent='确认重置';btn.disabled=false;
    if(err){errEl.textContent=err;return;}
    document.getElementById('forgotPanel').innerHTML='<div style="text-align:center;padding:20px 0"><div style="font-size:40px;margin-bottom:12px">✅</div><div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--gold)">密码重置成功</div><div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">请使用新密码登录</div><div class="auth-switch"><a href="javascript:void(0)" onclick="showLogin()">← 去登录</a></div></div>';
  };
  if(window._resetCustomToken){
    Cloud.resetPasswordWithToken(window._resetCustomToken,pass,done);
  } else {
    Cloud.updatePasswordWithToken(window._resetAccessToken,pass,done);
  }
}

// ===== 账号记忆 =====
function _saveRememberedAccount(type, account) {
  try {
    localStorage.setItem('tianji_remember', JSON.stringify({ type: type, account: account }));
  } catch(e) {}
}
function _fillRememberedAccount() {
  try {
    var saved = JSON.parse(localStorage.getItem('tianji_remember') || '{}');
    if (saved.type === 'email' && saved.account) {
      switchLoginTab('email');
      document.getElementById('loginEmail').value = saved.account;
      document.getElementById('loginEmailPass').focus();
    } else if (saved.type === 'username' && saved.account) {
      switchLoginTab('username');
      document.getElementById('loginUser').value = saved.account;
      document.getElementById('loginPass').focus();
    }
  } catch(e) {}
}

// Tab switching
var _loginTab = 'username';
var _regTab = 'username';
function switchLoginTab(tab) {
  _loginTab = tab;
  var tabs = document.querySelectorAll('#loginPanel .auth-tab');
  var contents = document.querySelectorAll('#loginPanel .auth-tab-content');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].textContent.indexOf(tab === 'username' ? '用户名' : '邮箱') >= 0);
  }
  for (var j = 0; j < contents.length; j++) {
    contents[j].classList.toggle('active', contents[j].id === 'loginTab-' + tab);
  }
}
function switchRegTab(tab) {
  _regTab = tab;
  var tabs = document.querySelectorAll('#registerPanel .auth-tab');
  var contents = document.querySelectorAll('#registerPanel .auth-tab-content');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].textContent.indexOf(tab === 'username' ? '用户名' : '邮箱') >= 0);
  }
  for (var j = 0; j < contents.length; j++) {
    contents[j].classList.toggle('active', contents[j].id === 'regTab-' + tab);
  }
}

// Social login
function doSocialLogin(platform) {
  var labels = { wechat: '微信', qq: 'QQ', apple: 'Apple' };
  var btns = document.querySelectorAll('.social-btn.' + platform);
  for (var i = 0; i < btns.length; i++) {
    btns[i].textContent = '⏳ 连接中...';
    btns[i].style.pointerEvents = 'none';
  }

  Cloud.socialLogin(platform, function(err, user) {
    setTimeout(function() {
      var allBtns = document.querySelectorAll('.social-btn.' + platform);
      for (var i = 0; i < allBtns.length; i++) {
        var icon = platform === 'wechat' ? '💬' : platform === 'qq' ? '🐧' : '🍎';
        var label = labels[platform] || platform;
        allBtns[i].innerHTML = '<span class="social-icon">' + icon + '</span> ' + label;
        allBtns[i].style.pointerEvents = '';
      }
    }, 300);

    if (err) { showToast(err); return; }
    state.currentUser = user;
    updateUI(); closeAuth();
    showToast('欢迎，' + (user.nick || user.username) + '！');
  });
}

// Guest login
function doGuestLogin() {
  Cloud.guestLogin(function(err, user) {
    if (err) { showToast(err); return; }
    state.currentUser = user;
    updateUI(); closeAuth();
    showToast('游客模式' + (Cloud.isCloud() ? '（数据已云端同步）' : '（数据仅保存在本设备）'));
  });
}

// Register
function doRegister() {
  var errEl = document.getElementById('regError');
  errEl.textContent = '';

  if (_regTab === 'username') {
    var username = document.getElementById('regUser').value.trim();
    var nick = document.getElementById('regNick').value.trim();
    var pass = document.getElementById('regPass').value;
    var pass2 = document.getElementById('regPass2').value;
    if (!username || username.length < 2 || username.length > 16) { errEl.textContent = '用户名需2-16个字符'; return; }
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5_]+$/.test(username)) { errEl.textContent = '用户名仅支持中英文、数字和下划线'; return; }
    if (pass.length < 6) { errEl.textContent = '密码至少6位'; return; }
    if (pass !== pass2) { errEl.textContent = '两次密码不一致'; return; }
    Cloud.signUp(username, pass, { nick: nick }, function(err, user) {
      if (err) { errEl.textContent = err; return; }
      state.currentUser = user; updateUI(); closeAuth();
      showToast('注册成功，欢迎 ' + (user.nick || user.username) + '！');
    });

  } else if (_regTab === 'email') {
    var email = document.getElementById('regEmail').value.trim();
    var pass = document.getElementById('regEmailPass').value;
    var pass2 = document.getElementById('regEmailPass2').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = '请输入正确的邮箱'; return; }
    if (pass.length < 6) { errEl.textContent = '密码至少6位'; return; }
    if (pass !== pass2) { errEl.textContent = '两次密码不一致'; return; }
    Cloud.signUp(email, pass, { nick: email.split('@')[0] }, function(err, user) {
      if (err) { errEl.textContent = err; return; }
      state.currentUser = user; updateUI(); closeAuth();
      showToast('注册成功，欢迎！');
    });
  }
}

// Login
function doLogin() {
  var errEl = document.getElementById('loginError');
  errEl.textContent = '';

  if (_loginTab === 'username') {
    var username = document.getElementById('loginUser').value.trim();
    var pass = document.getElementById('loginPass').value;
    if (!username) { errEl.textContent = '请输入用户名'; return; }
    if (!pass) { errEl.textContent = '请输入密码'; return; }
    Cloud.logIn(username, pass, function(err, user) {
      if (err) { errEl.textContent = err; return; }
      _saveRememberedAccount('username', username);
      state.currentUser = user; updateUI(); closeAuth();
      showToast('欢迎回来，' + (user.nick || user.username) + '！');
    });

  } else if (_loginTab === 'email') {
    var email = document.getElementById('loginEmail').value.trim();
    var pass = document.getElementById('loginEmailPass').value;
    if (!email) { errEl.textContent = '请输入邮箱'; return; }
    if (!pass) { errEl.textContent = '请输入密码'; return; }
    Cloud.logInByEmail(email, pass, function(err, user) {
      if (err) { errEl.textContent = err; return; }
      _saveRememberedAccount('email', email);
      state.currentUser = user; updateUI(); closeAuth();
      showToast('欢迎回来！');
    });
  }
}

function doLogout(){
  Cloud.stopRealtime();
  Cloud.logOut(function() {
    state.currentUser = null; updateUI(); goPage('home');
    localStorage.removeItem('tianji_remember');
    showToast('已退出登录');
  });
}

function showToast(msg){
  var t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;top:70px;left:50%;transform:translateX(-50%) translateY(-16px);z-index:300;padding:8px 20px;border-radius:10px;background:rgba(26,26,62,0.95);border:1px solid rgba(201,169,110,0.3);color:#e8d5a8;font-size:13px;opacity:0;transition:all 0.3s;pointer-events:none;white-space:nowrap;font-family:"PingFang SC",sans-serif;';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(t._timer);t._timer=setTimeout(function(){t.style.opacity='0';t.style.transform='translateX(-50%) translateY(-16px)';},2000);
}

function renderProfile(){
  var u=state.currentUser;if(!u)return;
  // Load history from cloud if available
  Cloud.loadHistory(function(err, history) {
    if (!err && history) {
      state.currentUser.history = history;
      u = state.currentUser;
    }
    var h = u.history || [];
    var joined=u.joined?new Date(u.joined).toLocaleDateString('zh-CN'):'未知';
    var initial=(u.nick||u.username)[0].toUpperCase();
    var cloudBadge = Cloud.isCloud() ? ' <span style="font-size:10px;color:var(--accent-green)">☁ 已同步</span>' : '';
    document.getElementById('profileCard').innerHTML=
      '<div class="profile-header"><div class="profile-avatar">'+initial+'</div><div><div class="profile-name">'+(u.nick||u.username)+cloudBadge+'</div><div class="profile-joined">@'+u.username+' · 加入于 '+joined+'</div></div></div>'+
      '<div class="profile-stats"><div class="profile-stat"><div class="profile-stat-num">'+h.length+'</div><div class="profile-stat-label">测算次数</div></div><div class="profile-stat"><div class="profile-stat-num">'+countType(h,'bazi')+'</div><div class="profile-stat-label">八字排盘</div></div><div class="profile-stat"><div class="profile-stat-num">'+countType(h,'tarot')+'</div><div class="profile-stat-label">塔罗占卜</div></div></div>'+
      '<div class="profile-actions"><button class="btn-outline" onclick="clearHistory()">🗑 清空记录</button><button class="btn-outline danger" onclick="doLogout()">退出登录</button></div>';
    var listEl=document.getElementById('historyList');
    if(h.length===0){listEl.innerHTML='<div class="history-empty"><div class="history-empty-icon">📋</div>暂无测算记录</div>';}
    else{
      var icons={bazi:'🔮',zhouyi:'☯',tarot:'🃏',zodiac:'♈',name:'✍',fengshui:'🧭',numerology:'🔢'};
      var names={bazi:'八字排盘',zhouyi:'周易占卜',tarot:'塔罗牌',zodiac:'星座运势',name:'姓名测算',fengshui:'风水罗盘',numerology:'数字能量'};
      listEl.innerHTML='<h3 style="color:var(--gold);margin-bottom:10px;font-family:serif;font-size:16px">测算记录</h3>'+
        h.slice().reverse().map(function(item){
          var time=new Date(item.time).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
          return '<div class="history-item"><div class="history-icon">'+(icons[item.type]||'🔮')+'</div><div class="history-info"><div class="history-title">'+(names[item.type]||item.type)+'</div><div class="history-detail">'+(item.detail||'')+'</div></div><div class="history-time">'+time+'</div></div>';
        }).join('');
    }
  });
}
function countType(h,t){return h.filter(function(x){return x.type===t;}).length;}
function addHistory(type,detail){
  if(!state.currentUser)return;
  Cloud.saveHistory(type, detail, function(err) {
    if (!err && state.currentUser.history) {
      state.currentUser.history.push({type:type,detail:detail,time:new Date().toISOString()});
    }
  });
}
function clearHistory(){
  if(!state.currentUser)return;
  Cloud.clearHistory(function(err) {
    if (!err) {
      state.currentUser.history = [];
      renderProfile();
      showToast('记录已清空');
    }
  });
}

// ===== Custom Background =====
var BG_PRESETS = [
  { id: 'default', label: '默认', bg: '#080810' },
  { id: 'ink',     label: '水墨', bg: 'linear-gradient(135deg,#0a0a12 0%,#1a1a2e 50%,#0a0a12 100%)' },
  { id: 'night',   label: '星夜', bg: 'linear-gradient(180deg,#020024 0%,#090979 50%,#020024 100%)' },
  { id: 'sunset',  label: '暮霞', bg: 'linear-gradient(135deg,#1a0a0a 0%,#2d1b2e 50%,#1a0a0a 100%)' },
  { id: 'forest',  label: '幽林', bg: 'linear-gradient(135deg,#0a120a 0%,#1a2e1a 50%,#0a120a 100%)' },
  { id: 'ocean',   label: '深海', bg: 'linear-gradient(135deg,#0a0e14 0%,#0e1a2e 50%,#0a0e14 100%)' },
  { id: 'wine',    label: '酒红', bg: 'linear-gradient(135deg,#140a0a 0%,#2e1414 50%,#140a0a 100%)' },
  { id: 'purple',  label: '紫韵', bg: 'linear-gradient(135deg,#0e0a14 0%,#1e142e 50%,#0e0a14 100%)' },
  { id: 'warm',    label: '暖金', bg: 'linear-gradient(135deg,#14100a 0%,#2e2414 50%,#14100a 100%)' },
  { id: 'snow',    label: '霜白', bg: 'linear-gradient(135deg,#e8e4dc 0%,#d4d0c8 50%,#e8e4dc 100%)' }
];

function initBgSettings() {
  var container = document.getElementById('bgPresets');
  if (!container) return;
  var current = getBgSetting();
  container.innerHTML = BG_PRESETS.map(function(p) {
    var active = current.type === 'preset' && current.value === p.id;
    return '<div onclick="applyBgPreset(\'' + p.id + '\')" style="cursor:pointer;text-align:center">' +
      '<div style="width:100%;aspect-ratio:1;border-radius:10px;background:' + p.bg + ';border:2px solid ' + (active ? 'var(--gold)' : 'var(--border)') + ';transition:border 0.2s"></div>' +
      '<div style="font-size:10px;color:' + (active ? 'var(--gold)' : 'var(--text-muted)') + ';margin-top:4px">' + p.label + '</div>' +
    '</div>';
  }).join('');
}

function getBgSetting() {
  try { return JSON.parse(localStorage.getItem('tianji_bg') || '{}'); } catch(e) { return {}; }
}

function applyBgSetting(type, value) {
  localStorage.setItem('tianji_bg', JSON.stringify({ type: type, value: value }));
  applyBgToPage(type, value);
  initBgSettings();
}

function applyBgToPage(type, value) {
  var el = document.getElementById('customBgLayer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'customBgLayer';
    el.style.cssText = 'position:fixed;inset:0;z-index:-1;background-size:cover;background-position:center;transition:opacity 0.3s';
    document.body.prepend(el);
  }
  // 霜白主题切换为亮色模式
  var isLight = type === 'preset' && value === 'snow';
  document.documentElement.style.setProperty('--bg-primary', isLight ? '#e8e4dc' : '');
  document.documentElement.style.setProperty('--bg-secondary', isLight ? '#d4d0c8' : '');
  document.documentElement.style.setProperty('--bg-card', isLight ? '#f0ece4' : '');
  document.documentElement.style.setProperty('--bg-card-hover', isLight ? '#e4e0d8' : '');
  document.documentElement.style.setProperty('--text-primary', isLight ? '#1a1a2e' : '');
  document.documentElement.style.setProperty('--text-secondary', isLight ? '#4a4a5e' : '');
  document.documentElement.style.setProperty('--text-muted', isLight ? '#8a8a9e' : '');
  document.documentElement.style.setProperty('--border', isLight ? 'rgba(0,0,0,0.08)' : '');
  document.documentElement.style.setProperty('--border-light', isLight ? 'rgba(0,0,0,0.04)' : '');

  if (type === 'preset') {
    var preset = BG_PRESETS.find(function(p) { return p.id === value; });
    if (preset) {
      el.style.background = preset.bg;
      el.style.backgroundSize = preset.bg.indexOf('gradient') >= 0 ? '' : 'cover';
    }
  } else if (type === 'image') {
    el.style.background = 'url(' + value + ') center/cover no-repeat';
  } else {
    el.style.background = '';
    // 恢复默认暗色
    document.documentElement.style.setProperty('--bg-primary', '#080810');
    document.documentElement.style.setProperty('--bg-secondary', '#0e0e1a');
    document.documentElement.style.setProperty('--bg-card', '#141428');
    document.documentElement.style.setProperty('--bg-card-hover', '#1a1a36');
    document.documentElement.style.setProperty('--text-primary', '#eee8d5');
    document.documentElement.style.setProperty('--text-secondary', '#9e9eb8');
    document.documentElement.style.setProperty('--text-muted', '#5e5e78');
    document.documentElement.style.setProperty('--border', 'rgba(212,168,83,0.1)');
    document.documentElement.style.setProperty('--border-light', 'rgba(255,255,255,0.06)');
  }
}

function applyBgPreset(id) {
  applyBgSetting('preset', id);
}

function handleBgUpload(e) {
  var file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('图片不能超过2MB'); return; }
  var reader = new FileReader();
  reader.onload = function(ev) {
    // 压缩图片
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW = 800, maxH = 1200;
      var w = img.width, h = img.height;
      if (w > maxW) { h = h * maxW / w; w = maxW; }
      if (h > maxH) { w = w * maxH / h; h = maxH; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      applyBgSetting('image', dataUrl);
      showToast('背景已更新');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function resetBg() {
  localStorage.removeItem('tianji_bg');
  var el = document.getElementById('customBgLayer');
  if (el) el.remove();
  initBgSettings();
  showToast('已恢复默认背景');
}

function restoreBg() {
  var setting = getBgSetting();
  if (setting.type) applyBgToPage(setting.type, setting.value);
}

// ===== Knowledge =====
var knowledgeDescs = {
  basics: '阴阳五行 · 天干地支 · 八卦河洛',
  bazi: '排盘方法 · 十神体系 · 旺衰格局 · 大运流年',
  ziwei: '十二宫位 · 主星辅星 · 四化飞星 · 格局',
  liuyao: '起卦成卦 · 装卦六亲 · 取用神 · 断卦精要',
  xiangxue: '面相三停五官 · 手相三大主线',
  sanshi: '奇门遁甲 · 大六壬 · 太乙神数',
  books: '入门基础 · 八字 · 六爻 · 紫微斗数 · 面相'
};

function renderKnowledgeList() {
  var el = document.getElementById('knowledge-grid');
  if (!el || typeof KNOWLEDGE === 'undefined') return;
  var keys = Object.keys(KNOWLEDGE);
  el.innerHTML = keys.map(function(key) {
    var k = KNOWLEDGE[key];
    return '<div class="module-card" onclick="showKnowledge(\'' + key + '\')">' +
      '<div class="module-icon">' + k.icon + '</div>' +
      '<div class="module-name">' + k.title + '</div>' +
      '<div class="module-desc">' + (knowledgeDescs[key] || '') + '</div>' +
    '</div>';
  }).join('');
}

function showKnowledge(key) {
  if (typeof KNOWLEDGE === 'undefined') return;
  var k = KNOWLEDGE[key];
  if (!k) return;
  document.getElementById('knowledge-detail-title').textContent = k.icon + ' ' + k.title;
  var content = k.sections.map(function(sec) {
    return '<div class="knowledge-section">' +
      '<div class="knowledge-section-title">' + sec.title + '</div>' +
      sec.items.map(function(item) {
        return '<div class="knowledge-item">' + item + '</div>';
      }).join('') +
    '</div>';
  }).join('');
  if (key === 'books') {
    content += '<div class="card" style="margin-top:20px;padding:16px">' +
      '<div style="font-size:13px;color:var(--text-muted);line-height:1.8">' +
        '上述皆为古代先贤用以观察世界、解释人生的一套符号推演模型，深刻融合了古典哲学与宇宙观，是中国传统文化独特的一部分。<br><br>' +
        '但请务必理解：命盘、卦象展现的是先天趋势与可能性，而非绝对的宿命。所谓"一命二运三风水，四积阴德五读书"，后天的选择、努力、修为，其权重远大于纸面的预判。学习这一切最大的价值，在于获得一套审视自我、洞明关系的智慧，以及"知天命而用之"的积极心态，而非陷入命中注定的消极等待。' +
      '</div>' +
    '</div>';
  }
  document.getElementById('knowledge-detail-content').innerHTML = content;
  goPage('knowledge-detail');
}

// ===== Divination: Ziwei Doushu =====
function doZiwei() {
  var y = +document.getElementById('ziwei-year').value;
  var m = +document.getElementById('ziwei-month').value;
  var d = +document.getElementById('ziwei-day').value;
  var h = +document.getElementById('ziwei-hour').value;
  if (!y || !m || !d) return alert('请填写完整的出生信息');
  var result = Divination.calcZiwei(y, m, d, h, state.ziweiGender !== undefined ? state.ziweiGender : 1);
  addHistory('ziwei', '紫微斗数 · ' + result.dayMaster + result.dayMasterWuxing + '命');
  var rd = result.readings;
  document.getElementById('ziwei-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">⭐ 紫微斗数命盘</h3>' +
        '<div class="info-grid">' +
          '<div class="info-item"><div class="info-label">日主</div><div class="info-value gold">' + result.dayMaster + '（' + result.dayMasterWuxing + '）</div></div>' +
          '<div class="info-item"><div class="info-label">命宫主星</div><div class="info-value gold">' + (result.palaces[0].mainStar || '无主星') + '</div></div>' +
        '</div>' +
        '<div style="margin-top:12px;font-size:12px;color:var(--text-muted)">四化：' +
          result.sihua.map(function(s) { return s.star + s.type; }).join(' · ') +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:12px;font-family:serif;font-size:16px">命盘解读</h3>' +
        '<div class="reading-block"><div class="reading-title">🎭 性格</div><div class="reading-text">' + rd.personality + '</div></div>' +
        '<div class="reading-block"><div class="reading-title">💼 事业</div><div class="reading-text">' + rd.career + '</div></div>' +
        '<div class="reading-block"><div class="reading-title">💕 感情</div><div class="reading-text">' + rd.love + '</div></div>' +
        '<div class="reading-block"><div class="reading-title">💰 财运</div><div class="reading-text">' + rd.wealth + '</div></div>' +
        '<div class="reading-block"><div class="reading-title">🏥 健康</div><div class="reading-text">' + rd.health + '</div></div>' +
      '</div>' +
    '</div>';
}

// ===== Divination: Liuyao =====
function tossLiuyaoCoin() { Divination.tossLiuyaoCoin(); }
function resetLiuyao() { Divination.resetLiuyao(); }
function doLiuyaoResult() { Divination.doLiuyaoResult(); }

// ===== Face Upload & AI Analysis =====
var _faceBase64 = '';

function handleFaceUpload(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var errEl = document.getElementById('face-upload-error');
  errEl.style.display = 'none';
  if (file.size > 10 * 1024 * 1024) {
    errEl.textContent = '图片不能超过 10MB';
    errEl.style.display = 'block';
    return;
  }
  if (!file.type.match(/^image\//)) {
    errEl.textContent = '请选择图片文件';
    errEl.style.display = 'block';
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    _faceBase64 = e.target.result;
    var preview = document.getElementById('face-upload-preview');
    preview.src = _faceBase64;
    preview.style.display = 'block';
    document.getElementById('face-upload-placeholder').style.display = 'none';
    document.getElementById('face-upload-area').classList.add('has-image');
    document.getElementById('face-upload-actions').style.display = 'flex';
    // 上传后点击预览图不再触发文件选择
    document.getElementById('face-upload-area').onclick = function(ev) {
      ev.stopPropagation();
      document.getElementById('face-file-input').click();
    };
  };
  reader.readAsDataURL(file);
}

function clearFaceUpload() {
  _faceBase64 = '';
  document.getElementById('face-file-input').value = '';
  document.getElementById('face-upload-preview').style.display = 'none';
  document.getElementById('face-upload-preview').src = '';
  document.getElementById('face-upload-placeholder').style.display = '';
  document.getElementById('face-upload-area').classList.remove('has-image');
  document.getElementById('face-upload-actions').style.display = 'none';
  document.getElementById('face-upload-error').style.display = 'none';
  // 恢复原始点击行为
  document.getElementById('face-upload-area').onclick = function() {
    document.getElementById('face-file-input').click();
  };
}

function analyzeFaceImage() {
  if (!_faceBase64) return;
  var errEl = document.getElementById('face-upload-error');
  errEl.style.display = 'none';
  var resultEl = document.getElementById('xiangxue-result');
  resultEl.innerHTML = '<div class="loading"><div class="loading-emoji">🔍</div><div class="loading-text">AI 大数据正在分析面部特征...</div></div>';

  // 纯前端图像分析：通过 Canvas 读取像素数据
  var img = new Image();
  img.onload = function() {
    try {
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      // 缩放到 100x100 加速分析
      var size = 100;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      var data = ctx.getImageData(0, 0, size, size).data;

      // 提取特征
      var features = _extractFaceFeatures(data, size, size);
      var result = _generateFaceAnalysis(features);
      renderFaceAIResult(result);
      addHistory('xiangxue', 'AI 面相分析');
    } catch(e) {
      errEl.textContent = '图片分析失败，请尝试其他照片';
      errEl.style.display = 'block';
      resultEl.innerHTML = '';
    }
  };
  img.onerror = function() {
    errEl.textContent = '图片加载失败，请重新选择';
    errEl.style.display = 'block';
    resultEl.innerHTML = '';
  };
  img.src = _faceBase64;
}

// 从像素数据中提取面部特征
function _extractFaceFeatures(data, w, h) {
  var totalR = 0, totalG = 0, totalB = 0, count = 0;
  var brightness = [];
  var skinPixels = 0;
  var topBrightness = 0, topCount = 0;
  var midBrightness = 0, midCount = 0;
  var botBrightness = 0, botCount = 0;
  var leftBrightness = 0, leftCount = 0;
  var rightBrightness = 0, rightCount = 0;
  var centerBrightness = 0, centerCount = 0;
  var edgeSharpness = 0, edgeCount = 0;
  var warmth = 0;

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4;
      var r = data[i], g = data[i+1], b = data[i+2];
      var bright = (r * 299 + g * 587 + b * 114) / 1000;
      totalR += r; totalG += g; totalB += b;
      count++;
      brightness.push(bright);

      // 肤色检测（简单 HSV 模型）
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var sat = max === 0 ? 0 : (max - min) / max;
      var val = max / 255;
      if (sat < 0.6 && sat > 0.05 && val > 0.2 && val < 0.95 && r > 60 && g > 40 && b > 20 && r > b) {
        skinPixels++;
      }

      // 区域亮度
      if (y < h * 0.33) { topBrightness += bright; topCount++; }
      else if (y < h * 0.66) { midBrightness += bright; midCount++; }
      else { botBrightness += bright; botCount++; }

      if (x < w * 0.5) { leftBrightness += bright; leftCount++; }
      else { rightBrightness += bright; rightCount++; }

      if (x > w * 0.25 && x < w * 0.75 && y > h * 0.25 && y < h * 0.75) {
        centerBrightness += bright; centerCount++;
      }

      // 边缘检测（简化 Sobel）
      if (x > 0 && x < w-1 && y > 0 && y < h-1) {
        var iR = data[((y) * w + x+1) * 4];
        var iL = data[((y) * w + x-1) * 4];
        var iU = data[((y-1) * w + x) * 4];
        var iD = data[((y+1) * w + x) * 4];
        var gx = Math.abs(iR - iL);
        var gy = Math.abs(iD - iU);
        edgeSharpness += Math.sqrt(gx*gx + gy*gy);
        edgeCount++;
      }

      // 色温
      warmth += (r - b);
    }
  }

  // 亮度分布统计
  brightness.sort(function(a,b){return a-b;});
  var median = brightness[Math.floor(brightness.length / 2)];
  var q1 = brightness[Math.floor(brightness.length * 0.25)];
  var q3 = brightness[Math.floor(brightness.length * 0.75)];
  var variance = 0;
  var mean = brightness.reduce(function(a,b){return a+b;},0) / brightness.length;
  for (var k = 0; k < brightness.length; k++) {
    variance += (brightness[k] - mean) * (brightness[k] - mean);
  }
  variance /= brightness.length;

  return {
    avgR: totalR / count,
    avgG: totalG / count,
    avgB: totalB / count,
    meanBright: mean,
    medianBright: median,
    q1: q1,
    q3: q3,
    variance: variance,
    skinRatio: skinPixels / count,
    topBright: topCount ? topBrightness / topCount : 0,
    midBright: midCount ? midBrightness / midCount : 0,
    botBright: botCount ? botBrightness / botCount : 0,
    leftBright: leftCount ? leftBrightness / leftCount : 0,
    rightBright: rightCount ? rightBrightness / rightCount : 0,
    centerBright: centerCount ? centerBrightness / centerCount : 0,
    edgeSharpness: edgeCount ? edgeSharpness / edgeCount : 0,
    warmth: warmth / count,
    contrast: q3 - q1
  };
}

// 根据特征生成面相分析结果
function _generateFaceAnalysis(f) {
  // 基于图像特征的确定性分析
  var seed = Math.floor(f.meanBright * 100 + f.variance * 10 + f.skinRatio * 1000 + f.warmth);
  var s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  var rand = function() { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };

  // 脸型判断（基于宽高比和边缘锐度）
  var faceTypes = ['圆形脸', '方形脸', '鹅蛋脸', '长形脸', '瓜子脸'];
  var faceIdx = f.contrast > 80 ? 1 : f.variance > 2000 ? 3 : f.skinRatio > 0.4 ? 0 : 2;
  if (f.edgeSharpness > 40 && f.contrast < 60) faceIdx = 4;

  // 额头（上1/3亮度）
  var foreheadTypes = ['宽阔饱满', '适中', '略窄'];
  var foreheadIdx = f.topBright > f.midBright * 1.05 ? 0 : f.topBright > f.midBright * 0.95 ? 1 : 2;

  // 眼睛（中部对比度）
  var eyeTypes = ['大而明亮', '细长有神', '圆眼', '丹凤眼'];
  var eyeIdx = f.midBright > 160 ? 0 : f.contrast > 70 ? 1 : f.variance < 1500 ? 2 : 3;

  // 鼻子（中心亮度）
  var noseTypes = ['高挺丰隆', '端正适中', '小巧精致'];
  var noseIdx = f.centerBright > f.meanBright * 1.08 ? 0 : f.centerBright > f.meanBright * 0.95 ? 1 : 2;

  // 嘴巴（下1/3色温）
  var mouthTypes = ['唇红齿白', '嘴角上扬', '樱桃小口', '丰厚饱满'];
  var mouthIdx = f.warmth > 30 ? 0 : f.botBright > f.midBright ? 1 : f.skinRatio > 0.5 ? 3 : 2;

  // 眉毛（上1/3边缘锐度）
  var browTypes = ['浓密顺长', '弯月眉', '剑眉', '淡眉'];
  var browIdx = f.edgeSharpness > 50 ? 0 : f.topBright > 140 ? 1 : f.contrast > 60 ? 2 : 3;

  // 五官对称性
  var symmetry = 1 - Math.abs(f.leftBright - f.rightBright) / 255;
  var symmetryScore = Math.floor(symmetry * 100);

  // 综合评分
  var careerBase = 55 + Math.floor(f.centerBright / 10) + Math.floor(symmetry * 15);
  var wealthBase = 50 + Math.floor(f.skinRatio * 30) + Math.floor(f.warmth / 5);
  var loveBase = 50 + Math.floor(f.contrast / 5) + Math.floor(symmetry * 20);
  var healthBase = 55 + Math.floor(f.meanBright / 8) + Math.floor(f.variance / 100);

  var scores = {
    career: Math.min(98, Math.max(40, careerBase + Math.floor(rand() * 10 - 5))),
    wealth: Math.min(98, Math.max(40, wealthBase + Math.floor(rand() * 10 - 5))),
    love: Math.min(98, Math.max(40, loveBase + Math.floor(rand() * 10 - 5))),
    health: Math.min(98, Math.max(40, healthBase + Math.floor(rand() * 10 - 5)))
  };

  // 标签
  var allTags = ['天庭饱满', '地阁方圆', '五官端正', '眉清目秀', '鼻直口方',
    '面如满月', '天庭开阔', '眼神清澈', '唇红齿白', '耳大有福',
    '颧骨高耸', '下巴圆润', '印堂发亮', '眉尾上扬', '人中深长',
    '法令纹浅', '眼角上翘', '山根高挺', '额角丰隆', '地库饱满'];
  var tags = [];
  if (f.topBright > 140) tags.push('天庭饱满');
  if (f.botBright > 130) tags.push('地阁方圆');
  if (symmetryScore > 85) tags.push('五官端正');
  if (f.midBright > 150) tags.push('眉清目秀');
  if (f.centerBright > f.meanBright * 1.05) tags.push('鼻直口方');
  if (f.skinRatio > 0.45) tags.push('面如满月');
  if (f.contrast > 60) tags.push('眼神清澈');
  if (f.warmth > 25) tags.push('唇红齿白');
  if (f.edgeSharpness > 35) tags.push('颧骨高耸');
  if (f.variance > 1800) tags.push('轮廓分明');
  // 补充到 4-6 个标签
  var extra = allTags.filter(function(t){ return tags.indexOf(t) === -1; });
  while (tags.length < 5 && extra.length > 0) {
    var pick = Math.floor(rand() * extra.length);
    tags.push(extra.splice(pick, 1)[0]);
  }

  // 详细分析
  var faceTexts = [
    '圆形脸：天生亲和力强，人缘极佳，性格温和包容。财运平稳上升，适合从事与人打交道的工作，如销售、公关、教育等。中年运势尤为突出。',
    '方形脸：意志坚定，做事有魄力，天生领导气质。事业心重，执行力强，但需注意人际关系中的沟通方式。财运亨通，适合创业。',
    '鹅蛋脸：五官端正协调，气质出众，聪明伶俐。各方面运势较为均衡，事业与感情双丰收。为人处世圆融，贵人运强。',
    '长形脸：思维敏捷，善于分析判断，逻辑能力强。适合从事技术、研究、金融类工作。需注意劳逸结合，关注身体健康。',
    '瓜子脸：智慧型面相，领悟力超群，审美品味高。异性缘极佳，感情运丰富。事业上有独特的创新思维，适合创意类工作。'
  ];

  var foreheadTexts = [
    '额头宽阔饱满：少年运极佳，聪明早慧，父母缘深厚。学业运强，事业起步顺利。额头光泽明亮者，近期有升迁之喜。',
    '额头适中端正：运势平稳上升，中年后逐渐发力。为人务实稳重，不急不躁。事业在中年达到巅峰。',
    '额头略窄：少年运稍弱，需靠后天努力打拼。但"苦尽甘来"，中年运势渐入佳境，晚年享福。适合技术型职业。'
  ];

  var eyeTexts = [
    '大而明亮的眼睛：心地善良，感情丰富细腻，异性缘极佳。直觉敏锐，善于察言观色。但需注意感情用事，理性决策。',
    '细长有神的眼睛：智慧过人，观察力极强，做事有条不紊。事业运旺盛，适合管理类职位。理财能力出众。',
    '圆眼：性格开朗活泼，人缘极佳，社交能力强。财运有波动但总体向上，适合从事商业活动。贵人运不错。',
    '丹凤眼：气质高雅，心思缜密，善于谋划。事业上有大将之风，适合领导岗位。感情上需多些耐心和包容。'
  ];

  var noseTexts = [
    '高挺丰隆的鼻子：财运亨通，事业有成，自信心强。中年运势极佳，有"偏财运"。善于理财，投资眼光独到。',
    '端正适中的鼻子：为人正直诚实，做事踏实可靠。财运稳健增长，不宜投机但适合长期投资。贵人运不错。',
    '小巧精致的鼻子：心思细腻，审美品味高。财运平稳，适合从事艺术、设计类工作。感情运丰富，异性缘好。'
  ];

  var mouthTexts = [
    '唇红齿白：口福极佳，人缘出众，表达能力出色。利于从事沟通、演讲、媒体类工作。食禄丰厚，一生不愁吃穿。',
    '嘴角上扬：天生乐观派，笑容常在，极具感染力。容易获得他人好感和信任，社交运极佳。事业上有贵人相助。',
    '樱桃小口：气质优雅，言辞谨慎，善于保守秘密。理财能力强，精打细算。感情上专一，适合细水长流的爱情。',
    '丰厚饱满：重情重义，感情丰富真挚。人缘极佳，朋友众多。财运方面适合合伙经营，不宜独断专行。'
  ];

  var browTexts = [
    '浓密顺长的眉毛：兄弟朋友缘极佳，贵人运强。事业上多有助力，团队合作顺利。为人仗义，深得人心。',
    '弯月眉：性格温柔细腻，感情丰富，极具浪漫气质。异性缘极佳，适合从事艺术、文学类工作。审美品味出众。',
    '剑眉：英气十足，做事果断利落，有领导才能。事业心强，目标明确。适合军警、管理、创业等领域。',
    '淡眉：性格内敛沉稳，善于深度思考。学术研究能力强，适合从事科研、分析类工作。需注意拓展社交圈。'
  ];

  var details = [
    { title: '👤 脸型分析 — ' + faceTypes[faceIdx], text: faceTexts[faceIdx] },
    { title: '🧠 额头分析 — ' + foreheadTypes[foreheadIdx], text: foreheadTexts[foreheadIdx] },
    { title: '👁 眼睛分析 — ' + eyeTypes[eyeIdx], text: eyeTexts[eyeIdx] },
    { title: '👃 鼻子分析 — ' + noseTypes[noseIdx], text: noseTexts[noseIdx] },
    { title: '👄 嘴巴分析 — ' + mouthTypes[mouthIdx], text: mouthTexts[mouthIdx] },
    { title: '🤨 眉毛分析 — ' + browTypes[browIdx], text: browTexts[browIdx] },
    { title: '📊 五官对称度 ' + symmetryScore + '分', text: symmetryScore > 85 ? '五官端正对称，面相上佳。对称度高者通常运势较为顺遂，人际关系和谐，事业与感情双丰收。' : symmetryScore > 70 ? '五官较为协调，整体面相不错。略有不对称之处，反而增添了个人特色和辨识度。' : '五官各有特色，不对称之处较多。但"歪瓜裂枣"也有福相，关键在于内在修养和后天努力。' }
  ];

  // 综合总结
  var overall = Math.floor((scores.career + scores.wealth + scores.love + scores.health) / 4);
  var summaryTexts = [
    '综合面相分析显示，您拥有不错的面相基础。五官协调，气质出众，各方面运势呈上升趋势。建议近期把握机遇，积极进取。',
    '面相分析结果显示，您天生具有领导气质和贵人运。事业方面有望取得突破性进展，财运也随之提升。保持积极心态，好运自来。',
    '您的面相显示感情运和人际运极佳。善于与人相处，容易获得他人信任。事业上适合团队合作，不宜独断专行。',
    '面相整体偏吉，但需注意健康方面的调养。建议保持规律作息，适当运动。事业和财运方面稳中有升，不宜冒进。',
    '面相分析显示您智慧过人，领悟力强。适合从事需要深度思考的工作。财运方面有"暗财"之象，可能有意外收获。'
  ];
  details.push({
    title: '🔮 综合点评（' + overall + '分）',
    text: summaryTexts[Math.floor(rand() * summaryTexts.length)]
  });

  return { scores: scores, tags: tags, details: details };
}

function renderFaceAIResult(data) {
  var el = document.getElementById('xiangxue-result');
  var sc = data.scores || {};
  var tags = (data.tags || []).map(function(t) { return '<span class="face-analysis-tag">' + t + '</span>'; }).join('');
  var details = (data.details || []).map(function(d) {
    return '<div class="card" style="margin-top:12px"><div style="font-size:14px;font-weight:600;color:var(--gold);margin-bottom:8px">' + d.title + '</div><div class="reading-text">' + d.text + '</div></div>';
  }).join('');
  el.innerHTML =
    '<div class="result-area">' +
      '<div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">🤖 AI 面相分析报告</h3>' +
        (tags ? '<div style="margin-bottom:12px">' + tags + '</div>' : '') +
        '<div class="bar-group">' +
          '<div class="bar-item"><span class="bar-icon">💼</span><span class="bar-label">事业</span><div class="bar-track"><div class="bar-fill" style="width:' + (sc.career||0) + '%;background:#a29bfe"></div></div><span class="bar-value">' + (sc.career||0) + '</span></div>' +
          '<div class="bar-item"><span class="bar-icon">💰</span><span class="bar-label">财运</span><div class="bar-track"><div class="bar-fill" style="width:' + (sc.wealth||0) + '%;background:#fdcb6e"></div></div><span class="bar-value">' + (sc.wealth||0) + '</span></div>' +
          '<div class="bar-item"><span class="bar-icon">💕</span><span class="bar-label">感情</span><div class="bar-track"><div class="bar-fill" style="width:' + (sc.love||0) + '%;background:#fd79a8"></div></div><span class="bar-value">' + (sc.love||0) + '</span></div>' +
          '<div class="bar-item"><span class="bar-icon">🏃</span><span class="bar-label">健康</span><div class="bar-track"><div class="bar-fill" style="width:' + (sc.health||0) + '%;background:#00b894"></div></div><span class="bar-value">' + (sc.health||0) + '</span></div>' +
        '</div>' +
      '</div>' +
      details +
    '</div>';
}

// ===== Divination: Xiangxue (Manual) =====
function doXiangxue() {
  var faceShape = +document.getElementById('face-shape').value;
  var forehead = +document.getElementById('face-forehead').value;
  var eyes = +document.getElementById('face-eyes').value;
  var nose = +document.getElementById('face-nose').value;
  var mouth = +document.getElementById('face-mouth').value;
  var brow = +document.getElementById('face-brow').value;
  var result = Divination.analyzeXiangxue(faceShape, forehead, eyes, nose, mouth, brow);
  addHistory('xiangxue', '面相手相分析');
  var sc = result.scores;
  document.getElementById('xiangxue-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">👁 面相分析</h3>' +
        '<div class="bar-group">' +
          '<div class="bar-item"><span class="bar-icon">💼</span><span class="bar-label">事业</span><div class="bar-track"><div class="bar-fill" style="width:' + sc.career + '%;background:#a29bfe"></div></div><span class="bar-value">' + sc.career + '</span></div>' +
          '<div class="bar-item"><span class="bar-icon">💰</span><span class="bar-label">财运</span><div class="bar-track"><div class="bar-fill" style="width:' + sc.wealth + '%;background:#fdcb6e"></div></div><span class="bar-value">' + sc.wealth + '</span></div>' +
          '<div class="bar-item"><span class="bar-icon">💕</span><span class="bar-label">感情</span><div class="bar-track"><div class="bar-fill" style="width:' + sc.love + '%;background:#fd79a8"></div></div><span class="bar-value">' + sc.love + '</span></div>' +
          '<div class="bar-item"><span class="bar-icon">🏃</span><span class="bar-label">健康</span><div class="bar-track"><div class="bar-fill" style="width:' + sc.health + '%;background:#00b894"></div></div><span class="bar-value">' + sc.health + '</span></div>' +
        '</div>' +
      '</div>' +
      result.details.map(function(d) {
        return '<div class="card" style="margin-top:12px"><div style="font-size:14px;font-weight:600;color:var(--gold);margin-bottom:8px">' + d.title + '</div><div class="reading-text">' + d.text + '</div></div>';
      }).join('') +
    '</div>';
}

// ===== Divination: Qimen Dunjia =====
function doQimen() {
  var type = +document.getElementById('qimen-type').value;
  var result = Divination.calcQimen(type);
  addHistory('qimen', '奇门遁甲 · ' + result.type);
  var statusColor = result.lucky ? '#00b894' : result.neutral ? '#fdcb6e' : '#F44336';
  var statusText = result.lucky ? '大吉' : result.neutral ? '平' : '凶';
  document.getElementById('qimen-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">🏔 奇门遁甲排盘</h3>' +
        '<div class="info-grid">' +
          '<div class="info-item"><div class="info-label">局数</div><div class="info-value gold">' + result.ju + '局</div></div>' +
          '<div class="info-item"><div class="info-label">值符</div><div class="info-value">' + result.shen + '</div></div>' +
          '<div class="info-item"><div class="info-label">天盘星</div><div class="info-value">' + result.xing + '</div></div>' +
          '<div class="info-item"><div class="info-label">值使门</div><div class="info-value">' + result.shiMen + '</div></div>' +
          '<div class="info-item"><div class="info-label">落宫</div><div class="info-value">' + result.gong + '</div></div>' +
          '<div class="info-item"><div class="info-label">吉凶</div><div class="info-value" style="color:' + statusColor + '">' + statusText + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><div style="font-size:14px;font-weight:600;color:var(--gold);margin-bottom:8px">🔮 ' + result.type + '断局</div><div class="reading-text">' + result.result + '</div></div>' +
    '</div>';
}

// ===== Divination: Meihua Yishu =====
function doMeihua() {
  var upper = +document.getElementById('meihua-upper').value;
  var lower = +document.getElementById('meihua-lower').value;
  var dong = +document.getElementById('meihua-dong').value;
  var result = Divination.calcMeihua(upper || 0, lower || 0, dong || 0);
  addHistory('meihua', '梅花易数 · ' + result.guaName);
  document.getElementById('meihua-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">🌸 梅花易数</h3>' +
        '<div style="text-align:center;margin:16px 0">' +
          '<div style="font-size:36px;letter-spacing:8px">' + result.upper.img + '<br><span style="font-size:14px;color:var(--text-muted)">上卦（' + result.upper.name + '·' + result.upper.attr + '）</span></div>' +
          '<div style="font-size:36px;letter-spacing:8px;margin-top:8px">' + result.lower.img + '<br><span style="font-size:14px;color:var(--text-muted)">下卦（' + result.lower.name + '·' + result.lower.attr + '）</span></div>' +
          '<div style="margin-top:12px;font-size:13px;color:var(--text-muted)">动爻：第' + result.dong + '爻</div>' +
        '</div>' +
        '<div class="info-grid">' +
          '<div class="info-item"><div class="info-label">卦名</div><div class="info-value gold">' + result.guaName + '</div></div>' +
          '<div class="info-item"><div class="info-label">体卦</div><div class="info-value">' + result.ti.name + '（' + result.ti.attr + '）</div></div>' +
          '<div class="info-item"><div class="info-label">用卦</div><div class="info-value">' + result.yong.name + '（' + result.yong.attr + '）</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><div style="font-size:14px;font-weight:600;color:var(--gold);margin-bottom:8px">体用关系</div><div class="reading-text">' + result.wxRelation + '</div></div>' +
      '<div class="card" style="margin-top:14px"><div style="font-size:14px;font-weight:600;color:var(--gold);margin-bottom:8px">卦象解读</div><div class="reading-text">' + result.reading + '</div></div>' +
      '<div class="card" style="margin-top:14px"><div style="font-size:14px;font-weight:600;color:var(--gold);margin-bottom:8px">💡 建议</div><div class="reading-text">' + result.advice + '</div></div>' +
    '</div>';
}

// ===== Divination: Wuxing Mingli =====
function doWuxing() {
  var y = +document.getElementById('wuxing-year').value;
  var m = +document.getElementById('wuxing-month').value;
  var d = +document.getElementById('wuxing-day').value;
  var h = +document.getElementById('wuxing-hour').value;
  if (!y || !m || !d) return alert('请填写完整的出生信息');
  var result = Divination.calcWuxing(y, m, d, h);
  addHistory('wuxing', '五行命理 · ' + result.dayWx + '命');
  var wx = result.wxCount;
  var maxVal = Math.max(wx['金'], wx['木'], wx['水'], wx['火'], wx['土'], 1);
  document.getElementById('wuxing-result').innerHTML =
    '<div class="result-area">' +
      '<div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">☯ 五行命理分析</h3>' +
        '<div class="info-grid">' +
          '<div class="info-item"><div class="info-label">日主五行</div><div class="info-value gold">' + result.dayWx + '</div></div>' +
          '<div class="info-item"><div class="info-label">最旺五行</div><div class="info-value">' + result.maxWx + '</div></div>' +
          '<div class="info-item"><div class="info-label">最弱五行</div><div class="info-value">' + result.minWx + '</div></div>' +
          '<div class="info-item"><div class="info-label">五行平衡</div><div class="info-value" style="color:' + (result.balanced ? '#00b894' : '#fdcb6e') + '">' + (result.balanced ? '均衡' : '偏旺/偏弱') + '</div></div>' +
          '<div class="info-item"><div class="info-label">喜用神</div><div class="info-value" style="color:#00b894">' + result.xiYong + '</div></div>' +
          '<div class="info-item"><div class="info-label">忌神</div><div class="info-value" style="color:#F44336">' + result.jiShen + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:12px;font-family:serif;font-size:16px">五行分布</h3>' +
        '<div class="wuxing-bars">' +
          ['金','木','水','火','土'].map(function(w) {
            return '<div class="wx-item"><span class="wx-name wx-' + w + '">' + result.wxEmojis[w] + ' ' + w + '</span><div class="bar-track"><div class="bar-fill" style="width:' + (wx[w] / maxVal * 100) + '%;background:' + result.wxColors[w] + '"></div></div><span style="width:20px;text-align:right;font-size:13px;color:var(--text-secondary)">' + wx[w] + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:14px"><h3 style="color:var(--gold);margin-bottom:12px;font-family:serif;font-size:16px">开运指南</h3>' +
        '<div class="reading-text">' +
          '🎨 <strong>幸运颜色：</strong>与' + result.xiYong + '对应的颜色<br>' +
          '🧭 <strong>有利方位：</strong>' + result.wxDir[result.xiYong] + '方<br>' +
          '📅 <strong>旺季月份：</strong>' + result.wxSeason[result.xiYong] + '<br>' +
          '🍎 <strong>宜食食物：</strong>' + result.wxFood[result.xiYong] + '<br>' +
          '🔢 <strong>幸运数字：</strong>' + result.wxNum[result.xiYong] +
        '</div>' +
      '</div>' +
    '</div>';
}
