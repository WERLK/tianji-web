// ===== State =====
var state = { baziGender: 1, fsGender: 1, selectedZodiac: 0, selectedSpread: 0, currentPage: 'home', currentUser: null };

// ===== Init =====
document.addEventListener('DOMContentLoaded', function() {
  // 先检查是否有 OAuth 回调
  Cloud.handleOAuthCallback(function(err, user) {
    if (user) {
      state.currentUser = user;
      updateUI();
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
  if (name === 'profile' && state.currentUser) { renderProfile(); initBgSettings(); }
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
  document.getElementById('zodiac-result').innerHTML =
    '<div class="result-area"><div class="card"><h3 style="color:var(--gold);margin-bottom:16px;font-family:serif;font-size:16px">'+s.name+'今日运势</h3>' +
      '<div style="text-align:center;margin-bottom:20px"><span style="font-size:56px;font-weight:900;color:var(--gold);font-family:serif">'+f.overall+'</span><span style="font-size:14px;color:var(--text-muted)">/100</span></div>' +
      '<div class="bar-group">' + bars.map(function(b){return '<div class="bar-item"><span class="bar-icon">'+b.icon+'</span><span class="bar-label">'+b.label+'</span><div class="bar-track"><div class="bar-fill" style="width:'+b.val+'%;background:'+b.color+'"></div></div><span class="bar-value">'+b.val+'</span></div>';}).join('') + '</div>' +
      '<div class="divider"></div>' +
      '<div class="reading-block"><div class="reading-title">📊 运势概述</div><div class="reading-text">'+f.summary+'</div></div>' +
      '<div class="reading-block"><div class="reading-title">💡 今日建议</div><div class="reading-text">'+f.advice+'</div></div>' +
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
      '<div class="life-path-display"><div class="life-num">'+result.num+'</div><div><div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">生命灵数</div><div style="font-size:16px;font-weight:600">'+result.num<=9?(['','领导','调解','创造','建设','冒险','照顾','思考','商业','理想'][result.num]||'大师'):result.num===11?'灵性导师':result.num===22?'建造大师':'治愈大师'+'</div></div></div>' +
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

// ============================================
// ============================================
// AUTH MODULE (uses Cloud module)
// ============================================
function restoreSession(){
  Cloud.getCurrentUser(function(err, user) {
    if (user) { state.currentUser = user; }
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
function showLogin(){document.getElementById('loginPanel').style.display='';document.getElementById('registerPanel').style.display='none';document.getElementById('regError').textContent='';document.getElementById('authTitle').textContent='登录';}
function showRegister(){document.getElementById('loginPanel').style.display='none';document.getElementById('registerPanel').style.display='';document.getElementById('loginError').textContent='';document.getElementById('authTitle').textContent='注册';}

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

// ===== Divination: Xiangxue =====
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
