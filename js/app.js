// ===== State =====
const state = { baziGender: 1, fsGender: 1, selectedZodiac: 0, selectedSpread: 0, currentUser: null };

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
  renderDaily();
  renderTarotSpreads();
  renderZodiacGrid();
  renderZodiacInfo();
  initNavHighlight();
  initSmoothScroll();
  initFabTop();
});

// ===== Smooth scroll with offset =====
function scrollTo(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  const navH = document.getElementById('topNav').offsetHeight;
  const barH = window.innerWidth < 900 ? 60 : 0;
  const y = el.getBoundingClientRect().top + window.scrollY - navH - barH - 12;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      scrollTo(a.getAttribute('href'));
    });
  });
}

// ===== Floating Back-to-Top =====
function initFabTop() {
  const fab = document.getElementById('fabTop');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        fab.classList.toggle('visible', window.scrollY > 400);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ===== Bottom Tab =====
function tabGo(el) {
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  scrollTo(el.dataset.target);
}

// ===== Nav highlight =====
function initNavHighlight() {
  const links = document.querySelectorAll('.nav-link');
  const tabs = document.querySelectorAll('.tab-item');
  const ids = ['home','daily','bazi','zhouyi','tarot','zodiac','name','fengshui','numerology'];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.nav-link[href="#${e.target.id}"]`);
        if (link) link.classList.add('active');
        tabs.forEach(t => {
          t.classList.toggle('active', t.dataset.target === '#' + e.target.id);
        });
      }
    });
  }, { threshold: 0.2, rootMargin: '-60px 0px -40% 0px' });
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

// ===== Gender =====
function setGender(type, val, btn) {
  if (type === 'bazi') state.baziGender = val;
  else state.fsGender = val;
  btn.parentElement.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ===== Daily Fortune =====
function renderDaily() {
  const f = getDailyFortune();
  document.getElementById('daily-date').textContent = f.date + ' 运势概览';
  const bars = [
    { icon: '💕', label: '爱情', val: f.love, color: '#fd79a8' },
    { icon: '💼', label: '事业', val: f.career, color: '#a29bfe' },
    { icon: '💰', label: '财运', val: f.wealth, color: '#fdcb6e' },
    { icon: '🏃', label: '健康', val: f.health, color: '#00b894' },
  ];
  document.getElementById('daily-result').innerHTML = `
    <div class="card fortune-score">
      <div class="score-number">${f.overall}</div>
      <div class="score-label">综合运势评分</div>
      <div class="score-summary">${f.summary}</div>
    </div>
    <div class="card">
      <div class="bar-group">
        ${bars.map(b => `
          <div class="bar-item">
            <span class="bar-icon">${b.icon}</span>
            <span class="bar-label">${b.label}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${b.val}%;background:${b.color}"></div></div>
            <span class="bar-value">${b.val}</span>
          </div>
        `).join('')}
      </div>
      <div class="yi-ji">
        <div class="yj-col">
          <div class="yj-title yi">宜</div>
          <div class="yj-tags">${f.yi.map(t => `<span class="yj-tag yi">${t}</span>`).join('')}</div>
        </div>
        <div class="yj-col">
          <div class="yj-title ji">忌</div>
          <div class="yj-tags">${f.ji.map(t => `<span class="yj-tag ji">${t}</span>`).join('')}</div>
        </div>
      </div>
      <div class="lucky-row">
        <div class="lucky-item"><span class="lucky-icon">🎨</span><span class="lucky-label">幸运色</span><span class="lucky-value">${f.luckyColor}</span></div>
        <div class="lucky-item"><span class="lucky-icon">🔢</span><span class="lucky-label">幸运数</span><span class="lucky-value">${f.luckyNumber}</span></div>
        <div class="lucky-item"><span class="lucky-icon">🧭</span><span class="lucky-label">幸运方位</span><span class="lucky-value">${f.luckyDirection}</span></div>
      </div>
      <div class="divider"></div>
      <div class="reading-block">
        <div class="reading-title">💡 今日建议</div>
        <div class="reading-text">${f.advice}</div>
      </div>
    </div>
  `;
}

// ===== Bazi =====
function doBazi() {
  const y = +document.getElementById('bazi-year').value;
  const m = +document.getElementById('bazi-month').value;
  const d = +document.getElementById('bazi-day').value;
  const h = +document.getElementById('bazi-hour').value;
  if (!y || !m || !d) return alert('请填写完整的出生信息');
  const bazi = calcBazi(y, m, d, h, state.baziGender);
  const reading = baziReading(bazi);
  addHistory('bazi', `${y}年${m}月${d}日 · ${bazi.dayMaster}${bazi.dayMasterWuxing}命`);
  const wxColors = {'金':'#FFD700','木':'#4CAF50','水':'#2196F3','火':'#F44336','土':'#CD853F'};
  const maxWx = Math.max(...Object.values(bazi.stats));

  document.getElementById('bazi-result').innerHTML = `
    <div class="result-area">
      <div class="card">
        <h3 style="color:var(--gold);margin-bottom:16px;font-family:'Noto Serif SC',serif;font-size:18px">四柱八字</h3>
        <div class="pillars-grid">
          ${bazi.pillars.map(p => `
            <div class="pillar-card">
              <div class="pillar-label">${p.label}</div>
              <div class="pillar-stem">${p.stem}</div>
              <div class="pillar-branch">${p.branch}</div>
              <div class="pillar-wx">${GAN_WX[p.stem]} · ${ZHI_WX[p.branch]}</div>
            </div>
          `).join('')}
        </div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">日主</div><div class="info-value gold">${bazi.dayMaster}（${bazi.dayMasterWuxing}）</div></div>
          <div class="info-item"><div class="info-label">生肖</div><div class="info-value">${bazi.zodiac}</div></div>
          <div class="info-item"><div class="info-label">纳音</div><div class="info-value">${bazi.nayin}</div></div>
          <div class="info-item"><div class="info-label">性别</div><div class="info-value">${bazi.gender}</div></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">五行统计</h3>
        <div class="wuxing-bars">
          ${Object.entries(bazi.stats).map(([k,v]) => `
            <div class="wx-item">
              <span class="wx-name wx-${k}">${k}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(v/maxWx)*100}%;background:${wxColors[k]}"></div></div>
              <span style="width:20px;text-align:right;font-size:13px;color:var(--text-secondary)">${v}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">十神</h3>
        <div class="info-grid">
          ${bazi.shiShen.map(s => `
            <div class="info-item"><div class="info-label">${s.pos}</div><div class="info-value">${s.stem} · ${s.name}</div></div>
          `).join('')}
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">命理解读</h3>
        <div class="reading-block"><div class="reading-title">🎭 性格</div><div class="reading-text">${reading.personality}</div></div>
        <div class="reading-block"><div class="reading-title">💼 事业</div><div class="reading-text">${reading.career}</div></div>
        <div class="reading-block"><div class="reading-title">💕 感情</div><div class="reading-text">${reading.love}</div></div>
        <div class="reading-block"><div class="reading-title">🏥 健康</div><div class="reading-text">${reading.health}</div></div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">大运</h3>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${bazi.dayun.map(dy => `
            <div class="info-item" style="flex:1;min-width:100px;text-align:center">
              <div class="info-label">${dy.startAge}-${dy.endAge}岁</div>
              <div class="info-value gold">${dy.stem}${dy.branch}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  scrollTo('#bazi-result');
}

// ===== Zhouyi =====
function doZhouyi() {
  const btn = document.getElementById('zhouyi-btn');
  btn.disabled = true;
  btn.textContent = '☯ 正在起卦...';
  document.getElementById('zhouyi-result').innerHTML = '<div class="loading"><div class="loading-emoji">☯</div><div class="loading-text">正在起卦，请静心等待...</div></div>';

  setTimeout(() => {
    const result = coinDivination();
    const o = result.original;
    addHistory('zhouyi', `${o.full} · ${o.kw.join(' ')}`);
    let html = `<div class="result-area">
      <div class="card">
        <div class="gua-display">
          <div class="gua-name">${o.full}</div>
          <div class="gua-ci">「${o.ci}」</div>
          <div class="divider"></div>
          <div class="gua-interp">${o.interp}</div>
          <div class="gua-tags">${o.kw.map(k => `<span class="gua-tag">${k}</span>`).join('')}</div>
        </div>
      </div>`;
    if (result.changed) {
      const c = result.changed;
      html += `<div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">变卦</h3>
        <div class="gua-display">
          <div class="gua-name">${c.full}</div>
          <div class="gua-ci">「${c.ci}」</div>
          <div class="divider"></div>
          <div class="gua-interp">${c.interp}</div>
        </div>
      </div>`;
    }
    if (result.movingYao.length > 0) {
      html += `<div class="card" style="margin-top:16px;text-align:center">
        <span style="color:var(--accent-red);font-size:14px">动爻：第 ${result.movingYao.map(y => y+1).join('、')} 爻</span>
      </div>`;
    }
    html += '</div>';
    document.getElementById('zhouyi-result').innerHTML = html;
    btn.disabled = false;
    btn.textContent = '☯ 重新起卦';
  }, 2000);
}

// ===== Tarot =====
function renderTarotSpreads() {
  document.getElementById('tarot-spreads').innerHTML = TAROT_SPREADS.map((s, i) => `
    <button class="spread-btn ${i===0?'active':''}" onclick="selectSpread(${i},this)">${s.name}（${s.count}张）</button>
  `).join('');
}

function selectSpread(idx, btn) {
  state.selectedSpread = idx;
  btn.parentElement.querySelectorAll('.spread-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function doTarot() {
  const btn = document.getElementById('tarot-btn');
  const spread = TAROT_SPREADS[state.selectedSpread];
  btn.disabled = true;
  btn.textContent = '🃏 洗牌抽牌中...';
  document.getElementById('tarot-result').innerHTML = '<div class="loading"><div class="loading-emoji">🃏</div><div class="loading-text">正在洗牌抽牌...</div></div>';

  setTimeout(() => {
    const cards = drawTarotCards(spread);
    addHistory('tarot', `${spread.name} · ${cards.map(c=>c.card.name).join(' / ')}`);
    document.getElementById('tarot-result').innerHTML = `
      <div class="result-area">
        <div class="card">
          <h3 style="color:var(--gold);margin-bottom:20px;font-family:'Noto Serif SC',serif;font-size:18px">${spread.name}解读</h3>
          <div class="tarot-cards">
            ${cards.map((c, i) => `
              <div class="tarot-card ${c.isReversed?'reversed':''}" style="animation-delay:${i*0.12}s">
                <div class="tarot-card-inner">
                  <div class="tarot-position">${c.position}</div>
                  <div class="tarot-name">${c.card.name}</div>
                  <span class="tarot-dir ${c.isReversed?'rev':'up'}">${c.isReversed?'逆位':'正位'}</span>
                  <div class="tarot-meaning">${c.isReversed ? c.card.rev : c.card.up}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    btn.disabled = false;
    btn.textContent = `🃏 重新抽牌（${spread.count}张）`;
  }, 1500);
}

// ===== Zodiac =====
function renderZodiacGrid() {
  document.getElementById('zodiac-grid').innerHTML = ZODIAC_SIGNS.map((s, i) => `
    <div class="zodiac-chip ${i===0?'active':''}" onclick="selectZodiac(${i},this)">
      <span class="zodiac-sym">${s.sym}</span>
      <span class="zodiac-nm">${s.name}</span>
    </div>
  `).join('');
}

function selectZodiac(idx, el) {
  state.selectedZodiac = idx;
  el.parentElement.querySelectorAll('.zodiac-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderZodiacInfo();
}

function renderZodiacInfo() {
  const s = ZODIAC_SIGNS[state.selectedZodiac];
  document.getElementById('zodiac-info').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
      <span style="font-size:40px">${s.sym}</span>
      <div>
        <div style="font-size:20px;font-weight:700;color:var(--text-primary)">${s.name}</div>
        <div style="font-size:13px;color:var(--text-muted)">${s.dr}</div>
      </div>
    </div>
    <div class="traits">${s.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}</div>
  `;
}

function doZodiac() {
  const s = ZODIAC_SIGNS[state.selectedZodiac];
  const f = zodiacDaily(s.id);
  addHistory('zodiac', `${s.name} · 综合运势${f.overall}分`);
  const bars = [
    { icon: '💕', label: '爱情', val: f.love, color: '#fd79a8' },
    { icon: '💼', label: '事业', val: f.career, color: '#a29bfe' },
    { icon: '💰', label: '财运', val: f.wealth, color: '#fdcb6e' },
    { icon: '🏃', label: '健康', val: f.health, color: '#00b894' },
  ];
  document.getElementById('zodiac-result').innerHTML = `
    <div class="result-area">
      <div class="card">
        <h3 style="color:var(--gold);margin-bottom:16px;font-family:'Noto Serif SC',serif;font-size:18px">${s.name}今日运势</h3>
        <div style="text-align:center;margin-bottom:20px">
          <span style="font-size:52px;font-weight:900;color:var(--gold);font-family:'Noto Serif SC',serif">${f.overall}</span>
          <span style="font-size:15px;color:var(--text-muted)">/100</span>
        </div>
        <div class="bar-group">
          ${bars.map(b => `
            <div class="bar-item">
              <span class="bar-icon">${b.icon}</span>
              <span class="bar-label">${b.label}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${b.val}%;background:${b.color}"></div></div>
              <span class="bar-value">${b.val}</span>
            </div>
          `).join('')}
        </div>
        <div class="divider"></div>
        <div class="reading-block"><div class="reading-title">📊 运势概述</div><div class="reading-text">${f.summary}</div></div>
        <div class="reading-block"><div class="reading-title">💡 今日建议</div><div class="reading-text">${f.advice}</div></div>
      </div>
    </div>
  `;
  scrollTo('#zodiac-result');
}

// ===== Name =====
function doName() {
  const name = document.getElementById('name-input').value.trim();
  if (!name || name.length < 2) return alert('请输入至少两个字的姓名');
  const surname = name[0];
  const given = name.slice(1);
  const result = calcName(surname, given);
  addHistory('name', `${name} · 评分${result.score}分`);
  const ges = [
    { label: '天格（祖上）', ge: result.tianGe },
    { label: '人格（主运）', ge: result.renGe },
    { label: '地格（前运）', ge: result.diGe },
    { label: '外格（社交）', ge: result.waiGe },
    { label: '总格（后运）', ge: result.zongGe },
  ];
  document.getElementById('name-result').innerHTML = `
    <div class="result-area">
      <div class="card" style="text-align:center">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:6px">姓名评分</div>
        <div style="font-size:64px;font-weight:900;color:var(--gold);font-family:'Noto Serif SC',serif;text-shadow:0 0 24px rgba(201,169,110,0.3)">${result.score}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">满分 99</div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">五格分析</h3>
        <table class="ge-table">
          <thead><tr><th>格局</th><th>数理</th><th>五行</th><th>吉凶</th></tr></thead>
          <tbody>
            ${ges.map(g => `
              <tr>
                <td>${g.label}</td>
                <td class="ge-num">${g.ge.num}</td>
                <td>${g.ge.wx}</td>
                <td><span class="ge-luck ${g.ge.luck==='大吉'||g.ge.luck==='吉'?'good':'bad'}">${g.ge.luck}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:10px;font-family:'Noto Serif SC',serif;font-size:18px">解读</h3>
        <div class="reading-text">
          ${result.score >= 90 ? '此名五格配置极佳，寓意深远，有利于事业发展和人际关系。' :
            result.score >= 80 ? '此名五格配置良好，寓意吉祥，有利于各方面发展。' :
            result.score >= 70 ? '此名格局尚可，某些数理偏弱，建议搭配吉祥数字使用。' :
            '此名五格配置一般，建议考虑调整用字以提升运势。'}
          人格（${result.renGe.num}）为姓名核心，五行属${result.renGe.wx}，${result.renGe.luck === '大吉' ? '大吉大利，主一生顺利。' : result.renGe.luck === '吉' ? '吉利，主事业有成。' : '需注意，可能影响运势。'}
          总格（${result.zongGe.num}）五行属${result.zongGe.wx}，${result.zongGe.luck === '大吉' ? '主晚年运势亨通。' : result.zongGe.luck === '吉' ? '主中晚年安稳。' : '需多加注意。'}
        </div>
      </div>
    </div>
  `;
  scrollTo('#name-result');
}

// ===== Fengshui =====
function doFengShui() {
  const year = +document.getElementById('fs-year').value;
  if (!year) return alert('请输入出生年份');
  const result = calcFengShui(year, state.fsGender);
  addHistory('fengshui', `${result.kua}卦 · ${result.group} · 生气方${result.sq}`);
  document.getElementById('fs-result').innerHTML = `
    <div class="result-area">
      <div class="card">
        <h3 style="color:var(--gold);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">命卦信息</h3>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">命卦数</div><div class="info-value gold">${result.kua}</div></div>
          <div class="info-item"><div class="info-label">命属</div><div class="info-value">${result.group}</div></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--accent-green);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">✨ 吉方</h3>
        <div class="dir-grid">
          <div class="dir-card good"><div class="dir-name">生气方</div><div class="dir-val">${result.sq}</div><div class="dir-desc">最吉利，利事业财运</div></div>
          <div class="dir-card good"><div class="dir-name">天医方</div><div class="dir-val">${result.ty}</div><div class="dir-desc">利健康</div></div>
          <div class="dir-card good"><div class="dir-name">延年方</div><div class="dir-val">${result.yn}</div><div class="dir-desc">利感情婚姻</div></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--accent-red);margin-bottom:14px;font-family:'Noto Serif SC',serif;font-size:18px">⚠️ 凶方</h3>
        <div class="dir-grid">
          <div class="dir-card bad"><div class="dir-name">祸害方</div><div class="dir-val">${result.hh}</div></div>
          <div class="dir-card bad"><div class="dir-name">六煞方</div><div class="dir-val">${result.ls}</div></div>
          <div class="dir-card bad"><div class="dir-name">五鬼方</div><div class="dir-val">${result.wg}</div></div>
          <div class="dir-card bad"><div class="dir-name">绝命方</div><div class="dir-val">${result.jm}</div></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:10px;font-family:'Noto Serif SC',serif;font-size:18px">🏠 布局建议</h3>
        <div class="reading-text">
          你属于<strong style="color:var(--gold)">${result.group}</strong>。<br><br>
          🛏️ <strong>卧室</strong>宜朝向生气方（${result.sq}）或延年方（${result.yn}）。<br>
          📖 <strong>书房</strong>宜在生气方（${result.sq}），利学业事业。<br>
          🍳 <strong>厨房</strong>宜在天医方（${result.ty}），利家人健康。<br>
          🚿 <strong>卫生间</strong>宜在绝命方（${result.jm}）或五鬼方（${result.wg}），以凶制凶。<br>
          🚪 <strong>大门</strong>宜朝向生气方（${result.sq}），纳吉气入宅。
        </div>
      </div>
    </div>
  `;
  scrollTo('#fs-result');
}

// ===== Numerology =====
function doLifePath() {
  const val = document.getElementById('num-birth').value;
  if (!val) return alert('请选择出生日期');
  const [y, m, d] = val.split('-').map(Number);
  const result = lifePath(y, m, d);
  addHistory('numerology', `生命灵数 ${result.num}`);
  document.getElementById('num-result').innerHTML = `
    <div class="result-area">
      <div class="card">
        <h3 style="color:var(--gold);margin-bottom:16px;font-family:'Noto Serif SC',serif;font-size:18px">你的生命灵数</h3>
        <div class="life-path-display">
          <div class="life-num">${result.num}</div>
          <div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:3px">生命灵数</div>
            <div style="font-size:17px;font-weight:600;color:var(--text-primary)">${result.num <= 9 ? ['','领导','调解','创造','建设','冒险','照顾','思考','商业','理想'][result.num] || '大师' : result.num === 11 ? '灵性导师' : result.num === 22 ? '建造大师' : '治愈大师'}</div>
          </div>
        </div>
        <div class="reading-block"><div class="reading-title">📖 灵数含义</div><div class="reading-text">${result.meaning}</div></div>
      </div>
    </div>
  `;
  scrollTo('#num-result');
}

function doNumberAnalysis() {
  const num = document.getElementById('num-phone').value.replace(/\D/g, '');
  if (num.length < 4) return alert('请输入至少4位数字');
  const digits = num.split('').map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  const main = (() => { let n = sum; while(n>9) n = String(n).split('').reduce((a,b)=>a+b,0); return n; })();
  const wxMap = {1:'木',2:'土',3:'火',4:'木',5:'土',6:'金',7:'金',8:'土',9:'火'};
  let score = 60 + ([1,3,6,8].includes(main) ? 15 : 5);
  const hasRepeat = digits.some((d,i) => digits.indexOf(d) !== i);
  if (!hasRepeat) score += 10;
  score = Math.min(99, score);

  addHistory('numerology', '号码分析 · 主数' + main);

  document.getElementById('num-result').innerHTML = `
    <div class="result-area">
      <div class="card" style="text-align:center">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:6px">号码能量评分</div>
        <div style="font-size:64px;font-weight:900;color:var(--gold);font-family:'Noto Serif SC',serif;text-shadow:0 0 24px rgba(201,169,110,0.3)">${score}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">五行属${wxMap[main] || '土'} · 主数${main}</div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3 style="color:var(--gold);margin-bottom:10px;font-family:'Noto Serif SC',serif;font-size:18px">分析详情</h3>
        <div class="reading-text">
          ${score >= 85 ? '此号码能量极强，五行相生，数字组合吉利。' :
            score >= 75 ? '此号码能量较好，五行基本协调。' :
            score >= 65 ? '此号码能量一般，建议搭配吉祥数字使用。' :
            '此号码能量偏弱，建议考虑更换。'}
          <br><br>
          📊 数字总和：${sum}<br>
          🔢 主数：${main}（五行${wxMap[main] || '土'}）<br>
          ${!hasRepeat ? '✅ 号码无重复数字，能量纯粹。' : '⚠️ 号码存在重复数字，建议关注。'}
        </div>
      </div>
    </div>
  `;
  scrollTo('#num-result');
}

// ============================================
// AUTH MODULE
// ============================================
const AUTH_KEY = 'tianji_users';
const SESSION_KEY = 'tianji_session';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || {}; } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem(AUTH_KEY, JSON.stringify(users)); }
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(username) { localStorage.setItem(SESSION_KEY, JSON.stringify({ username, ts: Date.now() })); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function hashPwd(pwd) {
  let h = 0;
  for (let i = 0; i < pwd.length; i++) {
    h = ((h << 5) - h + pwd.charCodeAt(i)) | 0;
    h = ((h << 13) ^ h) | 0;
  }
  return 'h' + Math.abs(h).toString(36) + pwd.length;
}

function restoreSession() {
  const s = getSession();
  if (s && s.username) {
    const users = getUsers();
    if (users[s.username]) {
      state.currentUser = users[s.username];
      updateUI();
      return;
    }
  }
  updateUI();
}

function updateUI() {
  const avatar = document.getElementById('navAvatar');
  const profileSection = document.getElementById('profile');
  if (state.currentUser) {
    const u = state.currentUser;
    const initial = (u.nick || u.username)[0].toUpperCase();
    avatar.textContent = initial;
    avatar.classList.add('logged');
    profileSection.style.display = '';
    renderProfile();
  } else {
    avatar.textContent = '👤';
    avatar.classList.remove('logged');
    profileSection.style.display = 'none';
  }
}

function handleUserClick() {
  if (state.currentUser) {
    scrollTo('#profile');
  } else {
    openAuth();
  }
}

function openAuth() {
  document.getElementById('authOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  showLogin();
}
function closeAuth() {
  document.getElementById('authOverlay').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('regError').textContent = '';
}
function closeAuthIfBg(e) { if (e.target === e.currentTarget) closeAuth(); }
function showLogin() {
  document.getElementById('loginPanel').style.display = '';
  document.getElementById('registerPanel').style.display = 'none';
  document.getElementById('regError').textContent = '';
}
function showRegister() {
  document.getElementById('loginPanel').style.display = 'none';
  document.getElementById('registerPanel').style.display = '';
  document.getElementById('loginError').textContent = '';
}

function doRegister() {
  const username = document.getElementById('regUser').value.trim();
  const nick = document.getElementById('regNick').value.trim();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const errEl = document.getElementById('regError');

  if (!username || username.length < 2 || username.length > 16) { errEl.textContent = '用户名需2-16个字符'; return; }
  if (!/^[a-zA-Z0-9\u4e00-\u9fa5_]+$/.test(username)) { errEl.textContent = '用户名仅支持中英文、数字和下划线'; return; }
  if (pass.length < 6) { errEl.textContent = '密码至少6位'; return; }
  if (pass !== pass2) { errEl.textContent = '两次密码不一致'; return; }

  const users = getUsers();
  if (users[username]) { errEl.textContent = '用户名已存在'; return; }

  users[username] = {
    username,
    nick: nick || username,
    password: hashPwd(pass),
    joined: new Date().toISOString(),
    history: []
  };
  saveUsers(users);
  errEl.textContent = '';

  state.currentUser = users[username];
  saveSession(username);
  updateUI();
  closeAuth();
  showToast('注册成功，欢迎 ' + (nick || username) + '！');
}

function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');

  if (!username) { errEl.textContent = '请输入用户名'; return; }
  if (!pass) { errEl.textContent = '请输入密码'; return; }

  const users = getUsers();
  const user = users[username];
  if (!user) { errEl.textContent = '用户不存在'; return; }
  if (user.password !== hashPwd(pass)) { errEl.textContent = '密码错误'; return; }

  state.currentUser = user;
  saveSession(username);
  updateUI();
  closeAuth();
  showToast('欢迎回来，' + user.nick + '！');
}

function doLogout() {
  state.currentUser = null;
  clearSession();
  updateUI();
  scrollTo('#home');
  showToast('已退出登录');
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);z-index:300;padding:10px 24px;border-radius:12px;background:rgba(26,26,62,0.95);border:1px solid rgba(201,169,110,0.3);color:#e8d5a8;font-size:14px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;transition:all 0.3s;pointer-events:none;white-space:nowrap;font-family:"Noto Sans SC",sans-serif;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(-20px)';
  }, 2000);
}

function renderProfile() {
  const u = state.currentUser;
  if (!u) return;
  const history = u.history || [];
  const joined = u.joined ? new Date(u.joined).toLocaleDateString('zh-CN') : '未知';
  const initial = (u.nick || u.username)[0].toUpperCase();

  document.getElementById('profileCard').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${initial}</div>
      <div>
        <div class="profile-name">${u.nick || u.username}</div>
        <div class="profile-joined">@${u.username} · 加入于 ${joined}</div>
      </div>
    </div>
    <div class="profile-stats">
      <div class="profile-stat"><div class="profile-stat-num">${history.length}</div><div class="profile-stat-label">测算次数</div></div>
      <div class="profile-stat"><div class="profile-stat-num">${countType(history, 'bazi')}</div><div class="profile-stat-label">八字排盘</div></div>
      <div class="profile-stat"><div class="profile-stat-num">${countType(history, 'tarot')}</div><div class="profile-stat-label">塔罗占卜</div></div>
    </div>
    <div class="profile-actions">
      <button class="btn-outline" onclick="clearHistory()">🗑 清空记录</button>
      <button class="btn-outline danger" onclick="doLogout()">退出登录</button>
    </div>
  `;

  const listEl = document.getElementById('historyList');
  if (history.length === 0) {
    listEl.innerHTML = '<div class="history-empty"><div class="history-empty-icon">📋</div>暂无测算记录</div>';
  } else {
    const icons = { bazi: '🔮', zhouyi: '☯', tarot: '🃏', zodiac: '♈', name: '✍', fengshui: '🧭', numerology: '🔢' };
    const names = { bazi: '八字排盘', zhouyi: '周易占卜', tarot: '塔罗牌', zodiac: '星座运势', name: '姓名测算', fengshui: '风水罗盘', numerology: '数字能量' };
    listEl.innerHTML = '<h3 style="color:var(--gold);margin-bottom:12px;font-family:\'Noto Serif SC\',serif;font-size:18px">测算记录</h3>' +
      history.slice().reverse().map(h => {
        const time = new Date(h.time).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
        return '<div class="history-item">' +
          '<div class="history-icon">' + (icons[h.type] || '🔮') + '</div>' +
          '<div class="history-info">' +
            '<div class="history-title">' + (names[h.type] || h.type) + '</div>' +
            '<div class="history-detail">' + (h.detail || '') + '</div>' +
          '</div>' +
          '<div class="history-time">' + time + '</div>' +
        '</div>';
      }).join('');
  }
}

function countType(history, type) { return history.filter(h => h.type === type).length; }

function addHistory(type, detail) {
  if (!state.currentUser) return;
  const users = getUsers();
  const u = users[state.currentUser.username];
  if (!u) return;
  if (!u.history) u.history = [];
  u.history.push({ type, detail, time: new Date().toISOString() });
  if (u.history.length > 100) u.history = u.history.slice(-100);
  users[state.currentUser.username] = u;
  saveUsers(users);
  state.currentUser = u;
}

function clearHistory() {
  if (!state.currentUser) return;
  const users = getUsers();
  users[state.currentUser.username].history = [];
  saveUsers(users);
  state.currentUser.history = [];
  renderProfile();
  showToast('记录已清空');
}
