// ============================================================
// Divination Module - 命理术数功能
// 紫微斗数、六爻占卜、面相手相、奇门遁甲、梅花易数、五行命理
// ============================================================
var Divination = (function() {

  function seededRandom(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function() {
      s = s * 16807 % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // ===== 紫微斗数 =====
  var ZIWEI_MAIN = ['紫微','天机','太阳','武曲','天同','廉贞','天府','太阴','贪狼','巨门','天相','天梁','七杀','破军'];
  var ZIWEI_PALACES = ['命宫','兄弟','夫妻','子女','财帛','疾厄','迁移','交友','官禄','田宅','福德','父母'];

  function calcZiwei(year, month, day, hour, gender) {
    var bazi = calcBazi(year, month, day, hour, gender ? 1 : 0);
    var seed = year * 10000 + month * 100 + day * 10 + hour + 7;
    var r = seededRandom(seed);

    // 命宫主星
    var mingStar = ZIWEI_MAIN[Math.floor(r() * ZIWEI_MAIN.length)];

    // 四化
    var sihuaTypes = ['化禄','化权','化科','化忌'];
    var sihuaStars = [];
    var usedIdx = [];
    for (var i = 0; i < 4; i++) {
      var idx;
      do { idx = Math.floor(r() * ZIWEI_MAIN.length); } while (usedIdx.indexOf(idx) >= 0);
      usedIdx.push(idx);
      sihuaStars.push({ star: ZIWEI_MAIN[idx], type: sihuaTypes[i] });
    }

    // 命宫
    var palaces = [{ name: '命宫', mainStar: mingStar }];

    // 解读
    var readings = {
      personality: getZiweiReading(mingStar, 'personality', r),
      career: getZiweiReading(mingStar, 'career', r),
      love: getZiweiReading(mingStar, 'love', r),
      wealth: getZiweiReading(mingStar, 'wealth', r),
      health: getZiweiReading(mingStar, 'health', r)
    };

    return {
      dayMaster: bazi.dayMaster,
      dayMasterWuxing: bazi.dayMasterWuxing,
      palaces: palaces,
      sihua: sihuaStars,
      readings: readings
    };
  }

  function getZiweiReading(star, aspect, r) {
    var map = {
      '紫微': { personality: '性格沉稳大气，有领导才能，自尊心强，做事有主见，天生具有帝王之气。', career: '适合从事管理、领导岗位，或自主创业。贵人运佳，容易得到上级赏识。', love: '感情上较为强势，需要一个能理解你、尊重你的人。婚姻宜晚不宜早。', wealth: '财运中上，善于理财，但不宜投机。正财运稳定，偏财运需谨慎。', health: '注意心血管和消化系统，保持规律作息。' },
      '天机': { personality: '聪明机智，善于思考分析，思维敏捷，但有时想太多反而犹豫不决。', career: '适合从事策划、咨询、技术类工作。善于发现问题并找到解决方案。', love: '感情细腻，善于沟通，但容易因过度分析而错失良机。', wealth: '财运靠智慧，适合知识型收入。投资需理性分析。', health: '注意神经系统，避免过度用脑，适当运动。' },
      '太阳': { personality: '热情开朗，光明磊落，乐于助人，但有时过于理想化。', career: '适合需要展示才华的工作，如教育、传媒、演艺等。贵人运强。', love: '感情热烈，对伴侣真诚付出，但需注意不要过于强势。', wealth: '财运旺盛，尤其利于白天从事的行业。', health: '注意眼睛和心血管，避免暴晒。' },
      '武曲': { personality: '刚毅果断，执行力强，重义气，但有时过于刚硬。', career: '适合金融、军事、法律等行业。执行力强，容易取得成就。', love: '感情上不太善于表达，但内心深情。需要学会温柔。', wealth: '财运极佳，善于积累财富，投资眼光独到。', health: '注意呼吸系统和骨骼，避免剧烈运动受伤。' },
      '贪狼': { personality: '多才多艺，交际能力强，善于变通，但有时欲望较多。', career: '适合销售、公关、艺术类工作。社交能力强，人脉广泛。', love: '桃花运旺，异性缘好，但需注意感情专一。', wealth: '偏财运好，善于把握机会，但需控制消费欲望。', health: '注意肝胆和泌尿系统，避免过度应酬。' },
      '七杀': { personality: '性格刚烈，有魄力，敢于冒险，但有时过于冲动。', career: '适合创业或从事竞争激烈的行业。有将帅之才。', love: '感情上需要学会包容和退让，否则容易产生冲突。', wealth: '财运起伏较大，善于抓住大机会，但需注意风险控制。', health: '注意外伤和意外，避免危险运动。' },
      '破军': { personality: '勇于开拓，不拘一格，有创新精神，但有时不够稳定。', career: '适合创新型行业或自主创业。善于打破常规。', love: '感情经历丰富，需要找到真正理解你的人。', wealth: '财运有波动，大起大落，需学会稳健理财。', health: '注意消化系统，饮食宜规律。' }
    };
    var starMap = map[star] || map['紫微'];
    return starMap[aspect] || '综合运势平稳，需把握机遇。';
  }

  // ===== 六爻占卜 =====
  var _liuyaoLines = [];
  var _liuyaoCount = 0;

  function initLiuyao() {
    _liuyaoLines = [];
    _liuyaoCount = 0;
    var preview = document.getElementById('liuyao-gua-preview');
    if (preview) preview.innerHTML = '';
    var progress = document.getElementById('liuyao-progress');
    if (progress) progress.textContent = '第 0/6 次';
    var resetBtn = document.getElementById('liuyao-reset-btn');
    if (resetBtn) resetBtn.disabled = true;
  }

  function tossLiuyaoCoin() {
    if (_liuyaoCount >= 6) return;
    var coins = [];
    for (var i = 0; i < 3; i++) coins.push(Math.random() < 0.5 ? 0 : 1);
    var sum = coins[0] + coins[1] + coins[2];
    // 6=老阴(变爻), 7=少阳, 8=少阴, 9=老阳(变爻)
    var line;
    if (sum === 6) line = { yao: 0, bian: true };
    else if (sum === 7) line = { yao: 1, bian: false };
    else if (sum === 8) line = { yao: 0, bian: false };
    else line = { yao: 1, bian: true };
    _liuyaoLines.push(line);
    _liuyaoCount++;

    // 更新预览
    var preview = document.getElementById('liuyao-gua-preview');
    if (preview) {
      var html = '';
      for (var j = _liuyaoLines.length - 1; j >= 0; j--) {
        var l = _liuyaoLines[j];
        if (l.yao === 1) html += '<span style="color:var(--gold)">' + (l.bian ? '⚪⚪' : '━━━') + '</span><br>';
        else html += '<span style="color:var(--text-muted)">' + (l.bian ? '⚫⚫' : '━ ━') + '</span><br>';
      }
      preview.innerHTML = html;
    }

    var progress = document.getElementById('liuyao-progress');
    if (progress) progress.textContent = '第 ' + _liuyaoCount + '/6 次';

    if (_liuyaoCount >= 6) {
      var resetBtn = document.getElementById('liuyao-reset-btn');
      if (resetBtn) resetBtn.disabled = false;
      setTimeout(doLiuyaoResult, 500);
    }
  }

  function resetLiuyao() {
    initLiuyao();
    var result = document.getElementById('liuyao-result');
    if (result) result.innerHTML = '';
  }

  function doLiuyaoResult() {
    // 计算卦象
    var lower = 0, upper = 0;
    for (var i = 0; i < 3; i++) lower = lower * 2 + _liuyaoLines[i].yao;
    for (var j = 3; j < 6; j++) upper = upper * 2 + _liuyaoLines[j].yao;

    var guaNames = ['坤','艮','坎','巽','震','离','兑','乾'];
    var guaAttrs = ['土','土','水','木','木','火','金','金'];
    var guaImgs = ['☷','☶','☵','☴','☳','☲','☱','☰'];

    var lowerName = guaNames[lower] || '坤';
    var upperName = guaNames[upper] || '乾';
    var guaName = upperName + lowerName;

    // 找动爻
    var dongYao = -1;
    for (var k = 0; k < 6; k++) {
      if (_liuyaoLines[k].bian) { dongYao = k + 1; break; }
    }

    // 六亲
    var liuqin = ['父母','兄弟','子孙','妻财','官鬼'];
    var r = seededRandom(Date.now());
    var yongShen = liuqin[Math.floor(r() * liuqin.length)];

    // 断卦
    var results = [
      '卦象显示事情有转机，宜积极行动。用神得力，事可成也。',
      '卦中用神受克，事情多有阻碍，宜缓不宜急，耐心等待时机。',
      '世应相生，合作顺利。但需注意细节，不可大意。',
      '六冲之卦，事情多变，需做好两手准备。动爻在' + dongYao + '爻，此爻为关键。',
      '六合之卦，事情和合，利于合作与感情。整体运势向好。',
      '用神旺相，事情有望成功。但需注意第三者干扰，保持专注。'
    ];
    var result = results[Math.floor(r() * results.length)];

    addHistory('liuyao', '六爻占卜 · ' + guaName + (dongYao > 0 ? ' · 动爻' + dongYao : ''));

    document.getElementById('liuyao-result').innerHTML =
      '<div class="result-area">' +
        '<div class="card"><h3 style="color:var(--gold);margin-bottom:14px;font-family:serif;font-size:16px">🎲 六爻占卜</h3>' +
          '<div class="info-grid">' +
            '<div class="info-item"><div class="info-label">卦名</div><div class="info-value gold">' + guaName + '</div></div>' +
            '<div class="info-item"><div class="info-label">上卦</div><div class="info-value">' + upperName + '（' + guaAttrs[upper] + '）</div></div>' +
            '<div class="info-item"><div class="info-label">下卦</div><div class="info-value">' + lowerName + '（' + guaAttrs[lower] + '）</div></div>' +
            '<div class="info-item"><div class="info-label">动爻</div><div class="info-value">' + (dongYao > 0 ? '第' + dongYao + '爻' : '无') + '</div></div>' +
            '<div class="info-item"><div class="info-label">用神</div><div class="info-value gold">' + yongShen + '</div></div>' +
          '</div>' +
        '</div>' +
        '<div class="card" style="margin-top:14px"><div style="font-size:14px;font-weight:600;color:var(--gold);margin-bottom:8px">🔮 断卦</div><div class="reading-text">' + result + '</div></div>' +
      '</div>';
  }

  // ===== 面相手相 =====
  function analyzeXiangxue(faceShape, forehead, eyes, nose, mouth, brow) {
    var seed = faceShape * 100000 + forehead * 10000 + eyes * 1000 + nose * 100 + mouth * 10 + brow;
    var r = seededRandom(seed + 42);

    var faceTexts = [
      '圆形脸：天生亲和力强，人缘好，性格温和。财运平稳，适合从事与人打交道的工作。',
      '方形脸：意志坚定，做事有魄力，领导力强。事业心重，但需注意人际关系。',
      '椭圆脸：五官端正，气质佳，聪明伶俐。各方面运势较为均衡。',
      '长形脸：思维敏捷，善于分析，但有时过于理性。适合从事技术或研究类工作。',
      '三角形脸：智慧型面相，领悟力强，但需注意身体健康。'
    ];

    var foreheadTexts = [
      '额头宽阔饱满：少年运佳，聪明早慧，父母缘好。事业起步顺利。',
      '额头适中：运势平稳，中年后逐渐发力。为人务实。',
      '额头窄低：少年运稍弱，需靠后天努力。但中年运势渐佳。'
    ];

    var eyeTexts = [
      '大而明亮的眼睛：心地善良，感情丰富，异性缘好。但需注意感情用事。',
      '细长有神的眼睛：智慧过人，观察力强，做事有条理。事业运佳。',
      '圆眼：性格开朗，人缘好，但需注意理财。财运有波动。',
      '三角眼：心思缜密，善于谋划，但需注意不要过于精明。'
    ];

    var noseTexts = [
      '高挺丰隆的鼻子：财运亨通，事业有成，自信满满。中年运势极佳。',
      '端正适中的鼻子：为人正直，做事踏实。财运稳健。',
      '低矮的鼻子：财运需靠自身努力，不宜投机。但贵人运不错。'
    ];

    var mouthTexts = [
      '唇红齿白：口福好，人缘佳，表达能力出色。利于从事沟通类工作。',
      '嘴角上扬：天生乐观，笑容常在，容易获得他人好感。',
      '薄唇：能言善辩，思维敏捷，但需注意言辞。感情上需多付出。',
      '厚唇：重情重义，感情丰富，但需注意不要过于感性。'
    ];

    var browTexts = [
      '浓密顺长的眉毛：兄弟朋友缘好，贵人运强。事业有助力。',
      '弯月眉：性格温柔，感情细腻，异性缘好。适合从事艺术类工作。',
      '剑眉：英气十足，做事果断，有领导才能。事业心强。',
      '淡眉：性格内敛，善于思考，但需注意社交。'
    ];

    var scores = {
      career: Math.floor(55 + r() * 40),
      wealth: Math.floor(50 + r() * 45),
      love: Math.floor(50 + r() * 45),
      health: Math.floor(55 + r() * 40)
    };

    var details = [
      { title: '👤 脸型分析', text: faceTexts[faceShape] },
      { title: '🧠 额头分析', text: foreheadTexts[forehead] },
      { title: '👁 眼睛分析', text: eyeTexts[eyes] },
      { title: '👃 鼻子分析', text: noseTexts[nose] },
      { title: '👄 嘴巴分析', text: mouthTexts[mouth] },
      { title: '🤨 眉毛分析', text: browTexts[brow] }
    ];

    return { scores: scores, details: details };
  }

  // ===== 奇门遁甲 =====
  function calcQimen(type) {
    var now = new Date();
    var typeNames = ['事业财运', '感情婚姻', '健康出行', '学业考试', '合作谈判'];
    var shens = ['值符','腾蛇','太阴','六合','白虎','玄武','九地','九天'];
    var xings = ['天蓬','天芮','天冲','天辅','天禽','天心','天柱','天任','天英'];
    var shiMen = ['开门','休门','生门','伤门','杜门','景门','死门','惊门'];
    var gongs = ['坎一宫','坤二宫','震三宫','巽四宫','中五宫','乾六宫','兑七宫','艮八宫','离九宫'];

    var seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate() * 10 + now.getHours() + type * 3;
    var r = seededRandom(seed);

    var ju = Math.floor(r() * 9) + 1;
    var shen = shens[Math.floor(r() * shens.length)];
    var xing = xings[Math.floor(r() * xings.length)];
    var men = shiMen[Math.floor(r() * shiMen.length)];
    var gong = gongs[Math.floor(r() * gongs.length)];

    var lucky = r() > 0.5;
    var neutral = !lucky && r() > 0.3;

    var results = {
      0: lucky ? '值符得位，天盘星吉，事业运势大好。近期有升职加薪的机会，宜积极争取。开门大吉，利于开拓新业务。' : '值符受克，事业有阻碍。天盘星落宫不利，近期宜守不宜攻。注意与上级的关系，避免正面冲突。',
      1: lucky ? '六合临宫，感情运佳。天喜星动，单身者有望遇到心仪对象。已有伴侣者感情更加稳固。' : '白虎临宫，感情有波折。需注意沟通，避免因小事引发争执。耐心经营，方可化解。',
      2: lucky ? '天心星临，健康无忧。出行顺利，宜动不宜静。' : '天芮星临，需注意身体健康。出行宜谨慎，避免前往陌生之地。',
      3: lucky ? '天辅星临，文昌运旺。考试大利，学业有成。宜静心复习，必有收获。' : '天蓬星临，学业有阻碍。需加倍努力，不可懈怠。寻求师长帮助可化解。',
      4: lucky ? '太阴临宫，合作顺利。六合得位，双方互利共赢。宜把握时机签约。' : '玄武临宫，合作需谨慎。对方可能有隐瞒，宜多做调查，不可轻信承诺。'
    };

    return {
      type: typeNames[type],
      ju: ju,
      shen: shen,
      xing: xing,
      shiMen: men,
      gong: gong,
      lucky: lucky,
      neutral: neutral,
      result: results[type]
    };
  }

  // ===== 梅花易数 =====
  function calcMeihua(upper, lower, dong) {
    var guaNames = ['坤','艮','坎','巽','震','离','兑','乾'];
    var guaAttrs = ['土','土','水','木','木','火','金','金'];
    var guaImgs = ['☷','☶','☵','☴','☳','☲','☱','☰'];

    if (upper < 1 || upper > 8) upper = Math.floor(Math.random() * 8) + 1;
    if (lower < 1 || lower > 8) lower = Math.floor(Math.random() * 8) + 1;
    if (dong < 1 || dong > 6) dong = Math.floor(Math.random() * 6) + 1;

    var upperIdx = upper - 1;
    var lowerIdx = lower - 1;

    var guaName = guaNames[upperIdx] + guaNames[lowerIdx];

    // 体用：动爻在下卦(1-3)则下卦为用，在上卦(4-6)则上卦为用
    var tiIdx, yongIdx;
    if (dong <= 3) {
      tiIdx = upperIdx;
      yongIdx = lowerIdx;
    } else {
      tiIdx = lowerIdx;
      yongIdx = upperIdx;
    }

    var ti = { name: guaNames[tiIdx], attr: guaAttrs[tiIdx], img: guaImgs[tiIdx] };
    var yong = { name: guaNames[yongIdx], attr: guaAttrs[yongIdx], img: guaImgs[yongIdx] };

    // 五行生克关系
    var ke = { '金': '木', '木': '土', '水': '火', '火': '金', '土': '水' };
    var sheng = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };

    var wxRelation;
    if (ke[ti.attr] === yong.attr) wxRelation = '体克用，事情可成，但需付出努力。利于主动出击，把握机会。';
    else if (sheng[ti.attr] === yong.attr) wxRelation = '体生用，需付出较多，但最终有利。利于帮助他人、投资理财。';
    else if (sheng[yong.attr] === ti.attr) wxRelation = '用生体，事情顺利，有贵人相助。利于求财、求学。大吉之象。';
    else if (ke[yong.attr] === ti.attr) wxRelation = '用克体，事情有阻碍，需谨慎应对。不宜冒进，宜守待时。';
    else wxRelation = '体用比和，事情平稳发展。不急不缓，顺其自然。';

    var readings = [
      '此卦显示当前所问之事正处于发展初期，需要耐心等待时机。卦象整体偏吉，只要坚持努力，终会有所收获。建议近期保持低调，积蓄力量。',
      '卦象显示事情已有转机，但仍有变数。动爻在第' + dong + '爻，提示你关注与此爻相关的方面。宜顺势而为，不可强求。',
      '此卦为大吉之象，天时地利人和皆备。宜果断行动，把握当下机遇。但成功之后仍需保持谦逊，不可骄傲自满。',
      '卦象显示事情有波折，但最终向好。过程中可能遇到一些困难，但这些都是成长的必经之路。保持信心，坚持到底。',
      '此卦提示你需要调整策略。当前的方向可能并非最佳选择，建议多听取他人意见，从不同角度审视问题。',
      '卦象显示近期运势平稳，适合处理日常事务。不宜做重大决定，等待更好的时机。注意身体健康，保持良好作息。'
    ];

    var advices = [
      '近期宜静不宜动，多学习充实自己。待时机成熟再行动。',
      '积极行动，把握机遇。但需注意细节，不可粗心大意。',
      '多与朋友交流，可能获得有价值的建议和帮助。',
      '注意身体健康，适当运动。身体是革命的本钱。',
      '财务方面宜保守，不宜冒险投资。稳健为上。',
      '相信自己的直觉，但重大决定还需理性分析。'
    ];

    var r = seededRandom(upper * 100 + lower * 10 + dong + Date.now() % 1000);

    return {
      guaName: guaName,
      upper: { name: guaNames[upperIdx], attr: guaAttrs[upperIdx], img: guaImgs[upperIdx] },
      lower: { name: guaNames[lowerIdx], attr: guaAttrs[lowerIdx], img: guaImgs[lowerIdx] },
      dong: dong,
      ti: ti,
      yong: yong,
      wxRelation: wxRelation,
      reading: readings[Math.floor(r() * readings.length)],
      advice: advices[Math.floor(r() * advices.length)]
    };
  }

  // ===== 五行命理 =====
  function calcWuxing(year, month, day, hour) {
    var bazi = calcBazi(year, month, day, hour, 1);
    var wxCount = bazi.stats;
    var dayWx = bazi.dayMasterWuxing;

    var maxWx = '金', minWx = '金', maxVal = 0, minVal = 999;
    var wxList = ['金', '木', '水', '火', '土'];
    for (var i = 0; i < wxList.length; i++) {
      if (wxCount[wxList[i]] > maxVal) { maxVal = wxCount[wxList[i]]; maxWx = wxList[i]; }
      if (wxCount[wxList[i]] < minVal) { minVal = wxCount[wxList[i]]; minWx = wxList[i]; }
    }

    var balanced = (maxVal - minVal) <= 2;

    // 喜用神：生日主的五行
    var sheng = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
    var xiYong = sheng[dayWx];
    // 忌神：克日主的五行
    var ke = { '金': '木', '木': '土', '水': '火', '火': '金', '土': '水' };
    var jiShen = ke[dayWx];

    var wxColors = { '金': '#FFD700', '木': '#4CAF50', '水': '#2196F3', '火': '#F44336', '土': '#CD853F' };
    var wxEmojis = { '金': '⚪', '木': '🟢', '水': '🔵', '火': '🔴', '土': '🟤' };
    var wxDir = { '金': '西', '木': '东', '水': '北', '火': '南', '土': '中' };
    var wxSeason = { '金': '秋季(8-10月)', '木': '春季(2-4月)', '水': '冬季(11-1月)', '火': '夏季(5-7月)', '土': '四季交替' };
    var wxFood = { '金': '白萝卜、银耳、梨、百合', '木': '绿色蔬菜、酸味食物、绿茶', '水': '黑豆、黑芝麻、海带、紫菜', '火': '红枣、番茄、红豆、苦瓜', '土': '南瓜、土豆、小米、黄豆' };
    var wxNum = { '金': '4、9', '木': '1、2', '水': '6、7', '火': '3、8', '土': '5、0' };

    return {
      bazi: bazi,
      wxCount: wxCount,
      maxWx: maxWx,
      minWx: minWx,
      dayWx: dayWx,
      balanced: balanced,
      xiYong: xiYong,
      jiShen: jiShen,
      wxColors: wxColors,
      wxEmojis: wxEmojis,
      wxDir: wxDir,
      wxSeason: wxSeason,
      wxFood: wxFood,
      wxNum: wxNum
    };
  }

  // ===== 导出 =====
  return {
    calcZiwei: calcZiwei,
    initLiuyao: initLiuyao,
    tossLiuyaoCoin: tossLiuyaoCoin,
    resetLiuyao: resetLiuyao,
    doLiuyaoResult: doLiuyaoResult,
    analyzeXiangxue: analyzeXiangxue,
    calcQimen: calcQimen,
    calcMeihua: calcMeihua,
    calcWuxing: calcWuxing
  };
})();
