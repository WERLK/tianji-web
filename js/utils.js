// ===== 天干地支 =====
const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const SHENG_XIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const GAN_WX = {'甲':'木','乙':'木','丙':'火','丁':'火','戊':'土','己':'土','庚':'金','辛':'金','壬':'水','癸':'水'};
const ZHI_WX = {'子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水'};
const NAYIN = {'甲子':'海中金','乙丑':'海中金','丙寅':'炉中火','丁卯':'炉中火','戊辰':'大林木','己巳':'大林木','庚午':'路旁土','辛未':'路旁土','壬申':'剑锋金','癸酉':'剑锋金','甲戌':'山头火','乙亥':'山头火','丙子':'涧下水','丁丑':'涧下水','戊寅':'城头土','己卯':'城头土','庚辰':'白蜡金','辛巳':'白蜡金','壬午':'杨柳木','癸未':'杨柳木','甲申':'泉中水','乙酉':'泉中水','丙戌':'屋上土','丁亥':'屋上土','戊子':'霹雳火','己丑':'霹雳火','庚寅':'松柏木','辛卯':'松柏木','壬辰':'长流水','癸巳':'长流水','甲午':'砂石金','乙未':'砂石金','丙申':'山下火','丁酉':'山下火','戊戌':'平地木','己亥':'平地木','庚子':'壁上土','辛丑':'壁上土','壬寅':'金箔金','癸卯':'金箔金','甲辰':'覆灯火','乙巳':'覆灯火','丙午':'天河水','丁未':'天河水','戊申':'大驿土','己酉':'大驿土','庚戌':'钗钏金','辛亥':'钗钏金','壬子':'桑柘木','癸丑':'桑柘木','甲寅':'大溪水','乙卯':'大溪水','丙辰':'沙中土','丁巳':'沙中土','戊午':'天上火','己未':'天上火','庚申':'石榴木','辛酉':'石榴木','壬戌':'大海水','癸亥':'大海水'};
const SHI_SHEN = ['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];

// ===== 八字计算 =====
function calcBazi(year, month, day, hour, gender) {
  const ysi = (year - 4) % 10, ybi = (year - 4) % 12;
  const msi = ((ysi % 5) * 2 + month - 1) % 10, mbi = (month + 1) % 12;
  const base = new Date(1900, 0, 1), target = new Date(year, month - 1, day);
  const diff = Math.floor((target - base) / 86400000);
  const dsi = ((diff % 10) + 10) % 10, dbi = ((diff % 12) + 12) % 12;
  const hbi = hour >= 23 ? 0 : Math.floor((hour + 1) / 2);
  const hsi = (dsi % 5) * 2 + hbi;
  const pillars = [
    {label:'年柱',stem:TIAN_GAN[ysi],branch:DI_ZHI[ybi]},
    {label:'月柱',stem:TIAN_GAN[msi],branch:DI_ZHI[mbi]},
    {label:'日柱',stem:TIAN_GAN[dsi],branch:DI_ZHI[dbi]},
    {label:'时柱',stem:TIAN_GAN[hsi%10],branch:DI_ZHI[hbi]}
  ];
  const dm = GAN_WX[pillars[2].stem];
  const stats = {'金':0,'木':0,'水':0,'火':0,'土':0};
  pillars.forEach(p => { stats[GAN_WX[p.stem]]++; stats[ZHI_WX[p.branch]]++; });
  const nayin = NAYIN[pillars[0].stem + pillars[0].branch] || '未知';
  const zodiac = SHENG_XIAO[ybi];
  const shiShen = pillars.map(p => {
    const si = TIAN_GAN.indexOf(p.stem), di = (si - dsi + 10) % 10;
    return {pos:p.label, name:SHI_SHEN[di], stem:p.stem};
  });
  const dayun = [];
  const startAge = gender === 1 ? (3 - (mbi % 3) + 3) % 3 : ((mbi % 3) + 3) % 3;
  for (let i = 0; i < 8; i++) {
    const age = startAge + i * 10;
    const si2 = (msi + i + (gender===1?1:-1) + 100) % 10;
    const bi2 = (mbi + i + (gender===1?1:-1) + 120) % 12;
    dayun.push({startAge:age, endAge:age+9, stem:TIAN_GAN[si2], branch:DI_ZHI[bi2]});
  }
  return {pillars, dayMaster:pillars[2].stem, dayMasterWuxing:dm, stats, nayin, zodiac, shiShen, dayun, gender:gender===1?'男':'女'};
}

function baziReading(bazi) {
  const dm = bazi.dayMasterWuxing;
  const data = {
    '金':{personality:'你天生具有金的特质，性格刚毅果断，重义气，有领导才能。做事干脆利落，不喜欢拖泥带水。但有时过于固执，需要学会变通。',career:'适合从事金融、法律、机械、管理等行业。你的决断力和执行力是最大优势。',love:'感情内敛专一，一旦认定就会非常忠诚。适合与水、土属性的人搭配。',health:'注意肺部和呼吸系统健康，秋季是养生重点。建议多进行有氧运动。'},
    '木':{personality:'你天生具有木的特质，性格仁慈温和，有上进心，富有同情心。善于学习和成长，但有时优柔寡断。',career:'适合从事教育、文化、创意、医疗等行业。你的创造力和亲和力是最大优势。',love:'感情丰富浪漫，善于营造温馨氛围。适合与水、火属性的人搭配。',health:'注意肝脏和胆囊健康，春季是养生重点。建议保持情绪稳定。'},
    '水':{personality:'你天生具有水的特质，性格聪明灵活，善于变通，思维敏捷。适应力强，但有时缺乏恒心。',career:'适合从事商贸、传播、咨询、旅游等行业。你的灵活性和智慧是最大优势。',love:'感情细腻善解人意，但有时优柔寡断。适合与金、木属性的人搭配。',health:'注意肾脏和泌尿系统健康，冬季是养生重点。建议注意保暖。'},
    '火':{personality:'你天生具有火的特质，性格热情开朗，为人直爽，有领导力。行动力强，但有时急躁冲动。',career:'适合从事管理、演艺、餐饮、科技等行业。你的领导力和热情是最大优势。',love:'感情热烈敢爱敢恨，容易一见钟情。适合与木、土属性的人搭配。',health:'注意心脏和心血管健康，夏季是养生重点。建议控制情绪。'},
    '土':{personality:'你天生具有土的特质，性格稳重踏实，诚实守信，包容力强。做事有条理，但有时过于保守。',career:'适合从事房地产、农业、建筑、金融等行业。你的稳定性和信用是最大优势。',love:'感情专一重视家庭，是可靠的伴侣。适合与火、金属性的人搭配。',health:'注意脾胃和消化系统健康，换季时节是养生重点。建议饮食规律。'}
  };
  return data[dm] || data['木'];
}

// ===== 周易 =====
const HEXAGRAMS = [
  {id:1,name:'乾',full:'乾为天',ci:'元亨利贞。',interp:'大吉大利之象。象征刚健中正、自强不息。事业蒸蒸日上，宜积极进取。',kw:['刚健','进取','成功']},
  {id:2,name:'坤',full:'坤为地',ci:'元亨，利牝马之贞。',interp:'柔顺包容之象。象征厚德载物，宜顺势而为，不宜冒进。',kw:['柔顺','包容','稳健']},
  {id:3,name:'屯',full:'水雷屯',ci:'元亨利贞，勿用有攸往。',interp:'万事开头难。如草木初生，虽有困难但充满生机。',kw:['艰难','创业','坚持']},
  {id:11,name:'泰',full:'地天泰',ci:'小往大来，吉亨。',interp:'通达顺畅之象。天地交泰，万事亨通。大吉之卦。',kw:['通达','顺利','大吉']},
  {id:12,name:'否',full:'天地否',ci:'否之匪人。',interp:'闭塞不通之象。天地不交，万事受阻。宜守不宜进。',kw:['闭塞','阻碍','等待']},
  {id:14,name:'大有',full:'火天大有',ci:'元亨。',interp:'大丰收之象。事业有成，财运亨通。',kw:['丰收','成功','富足']},
  {id:15,name:'谦',full:'地山谦',ci:'亨，君子有终。',interp:'谦虚之象。满招损谦受益，保持谦逊则万事亨通。',kw:['谦虚','低调','受益']},
  {id:24,name:'复',full:'地雷复',ci:'亨。出入无疾。',interp:'回归复兴之象。否极泰来，新的开始。',kw:['复兴','回归','新生']},
  {id:29,name:'坎',full:'坎为水',ci:'有孚维心亨。',interp:'险难之象。前路坎坷，但坚持就能渡过。',kw:['险难','坚持','渡过']},
  {id:30,name:'离',full:'离为火',ci:'利贞，亨。',interp:'光明之象。前途光明，但需脚踏实地。',kw:['光明','文明','热情']},
  {id:31,name:'咸',full:'泽山咸',ci:'亨利贞。',interp:'感应之象。感情和人际关系和谐，宜表达心意。',kw:['感应','感情','和谐']},
  {id:42,name:'益',full:'风雷益',ci:'利有攸往。',interp:'增益之象。好运来临，宜积极行动。',kw:['增益','好运','积极']},
  {id:49,name:'革',full:'泽火革',ci:'已日乃孚。',interp:'变革之象。时机成熟，宜大胆改革。',kw:['变革','创新','时机']},
  {id:50,name:'鼎',full:'火风鼎',ci:'元吉，亨。',interp:'鼎新之象。革故鼎新，建立新秩序。',kw:['革新','建立','新秩序']},
  {id:58,name:'兑',full:'兑为泽',ci:'亨，利贞。',interp:'喜悦之象。心情愉悦，人际关系和谐。',kw:['喜悦','和谐','交流']},
  {id:63,name:'既济',full:'水火既济',ci:'亨小，利贞。',interp:'完成之象。功成名就，但需居安思危。',kw:['完成','成功','警惕']},
  {id:64,name:'未济',full:'火水未济',ci:'亨。',interp:'未完成之象。事情尚未结束，继续努力。',kw:['未完成','努力','坚持']}
];

function coinDivination() {
  const lines = [], moving = [];
  for (let i = 0; i < 6; i++) {
    const coins = [Math.random()>.5?3:2, Math.random()>.5?3:2, Math.random()>.5?3:2];
    const sum = coins.reduce((a,b)=>a+b,0);
    if (sum===6) { lines.push(0); moving.push(i); }
    else if (sum===7) lines.push(1);
    else if (sum===8) lines.push(0);
    else { lines.push(1); moving.push(i); }
  }
  const idx = Math.floor(Math.random() * HEXAGRAMS.length);
  const original = HEXAGRAMS[idx];
  let changed = null;
  if (moving.length > 0) {
    let ci = (idx + moving.length) % HEXAGRAMS.length;
    changed = HEXAGRAMS[ci];
  }
  return {original, changed, movingYao: moving};
}

// ===== 塔罗 =====
const MAJOR_ARCANA = [
  {id:0,name:'愚者',up:'新的开始、冒险精神、无限可能',rev:'鲁莽行事、犹豫不决'},
  {id:1,name:'魔术师',up:'创造力、技巧、意志力',rev:'缺乏方向、才能浪费'},
  {id:2,name:'女祭司',up:'直觉、智慧、内在力量',rev:'忽视直觉、表面化'},
  {id:3,name:'女皇',up:'丰饶、母性、创造力',rev:'依赖、创造力受阻'},
  {id:4,name:'皇帝',up:'权威、秩序、领导力',rev:'专制、固执'},
  {id:5,name:'教皇',up:'传统、智慧、精神指引',rev:'叛逆、教条'},
  {id:6,name:'恋人',up:'爱情、选择、和谐',rev:'失衡、错误选择'},
  {id:7,name:'战车',up:'胜利、意志力、决心',rev:'失控、缺乏方向'},
  {id:8,name:'力量',up:'勇气、耐心、内在力量',rev:'软弱、缺乏自信'},
  {id:9,name:'隐者',up:'内省、智慧、独处',rev:'孤立、逃避'},
  {id:10,name:'命运之轮',up:'命运转折、好运、机遇',rev:'厄运、抗拒变化'},
  {id:11,name:'正义',up:'公正、真相、因果',rev:'不公、偏见'},
  {id:12,name:'倒吊人',up:'牺牲、等待、新视角',rev:'拖延、无谓牺牲'},
  {id:13,name:'死神',up:'结束、转变、重生',rev:'抗拒改变、停滞'},
  {id:14,name:'节制',up:'平衡、耐心、和谐',rev:'失衡、过度'},
  {id:15,name:'恶魔',up:'诱惑、束缚、欲望',rev:'解脱、自由'},
  {id:16,name:'塔',up:'突变、崩塌、觉醒',rev:'逃避灾难、恐惧变化'},
  {id:17,name:'星星',up:'希望、灵感、治愈',rev:'失望、缺乏信心'},
  {id:18,name:'月亮',up:'幻觉、恐惧、潜意识',rev:'真相浮现、释放恐惧'},
  {id:19,name:'太阳',up:'成功、快乐、活力',rev:'暂时的挫折'},
  {id:20,name:'审判',up:'觉醒、重生、审视',rev:'自我怀疑、逃避'},
  {id:21,name:'世界',up:'完成、圆满、成就',rev:'未完成、缺乏结束'}
];

const TAROT_SPREADS = [
  {id:'single',name:'单牌占卜',count:1,positions:['今日指引']},
  {id:'three',name:'时间之流',count:3,positions:['过去','现在','未来']},
  {id:'love',name:'爱情三角',count:3,positions:['你','对方','关系']},
  {id:'celtic',name:'凯尔特十字',count:5,positions:['现状','挑战','过去','未来','结果']}
];

function drawTarotCards(spread) {
  const shuffled = [...MAJOR_ARCANA].sort(() => Math.random() - 0.5);
  return spread.positions.map((pos, i) => ({
    position: pos,
    card: shuffled[i],
    isReversed: Math.random() > 0.5
  }));
}

// ===== 星座 =====
const ZODIAC_SIGNS = [
  {id:1,name:'白羊座',sym:'♈',el:'火',dr:'3.21-4.19',traits:['热情','冲动','勇敢']},
  {id:2,name:'金牛座',sym:'♉',el:'土',dr:'4.20-5.20',traits:['稳重','务实','忠诚']},
  {id:3,name:'双子座',sym:'♊',el:'风',dr:'5.21-6.21',traits:['机智','善变','好奇']},
  {id:4,name:'巨蟹座',sym:'♋',el:'水',dr:'6.22-7.22',traits:['敏感','顾家','温柔']},
  {id:5,name:'狮子座',sym:'♌',el:'火',dr:'7.23-8.22',traits:['自信','大方','领导']},
  {id:6,name:'处女座',sym:'♍',el:'土',dr:'8.23-9.22',traits:['细心','完美','务实']},
  {id:7,name:'天秤座',sym:'♎',el:'风',dr:'9.23-10.23',traits:['优雅','公正','社交']},
  {id:8,name:'天蝎座',sym:'♏',el:'水',dr:'10.24-11.22',traits:['神秘','专注','深情']},
  {id:9,name:'射手座',sym:'♐',el:'火',dr:'11.23-12.21',traits:['乐观','自由','冒险']},
  {id:10,name:'摩羯座',sym:'♑',el:'土',dr:'12.22-1.19',traits:['踏实','有野心','自律']},
  {id:11,name:'水瓶座',sym:'♒',el:'风',dr:'1.20-2.18',traits:['独立','创新','博爱']},
  {id:12,name:'双鱼座',sym:'♓',el:'水',dr:'2.19-3.20',traits:['浪漫','敏感','善良']}
];

function getSign(month, day) {
  for (const s of ZODIAC_SIGNS) {
    const [sm,sd] = s.dr.split('-')[0].split('.').map(Number);
    const [em,ed] = s.dr.split('-')[1].split('.').map(Number);
    if (sm <= em) { if ((month===sm&&day>=sd)||(month===em&&day<=ed)) return s; }
    else { if ((month===sm&&day>=sd)||(month===em&&day<=ed)) return s; }
  }
  return ZODIAC_SIGNS[9];
}

function zodiacDaily(signId) {
  const d = new Date(), seed = d.getFullYear()*400 + d.getMonth()*31 + d.getDate() + signId * 7;
  const r = n => ((seed*9301+49297+n*17)%233280)%100;
  const pick = (arr, n) => arr[(seed + n) % arr.length];

  const loveTexts = [
    '单身者今天桃花运不错，留意身边出现的异性，可能有意想不到的邂逅。已有伴侣者适合安排一次浪漫约会，增进感情。',
    '感情上需要多一些耐心和理解，避免因小事争执。单身者不宜急于表白，先观察对方的态度。',
    '今天的社交魅力很强，容易吸引他人的注意。已有伴侣者会感受到对方的深情，适合深入交流。',
    '感情运势平稳，适合处理感情中的实际问题。单身者可通过朋友介绍认识新对象。',
    '今天可能会遇到一些感情上的小波折，保持冷静是关键。已有伴侣者需要多关心对方的感受。',
    '浪漫气息浓厚，适合表白或制造惊喜。已有伴侣者今天容易产生甜蜜的回忆。',
    '感情上宜守不宜攻，耐心等待时机。单身者今天适合提升自我魅力，为未来的缘分做准备。'
  ];
  const careerTexts = [
    '工作中会有新的机遇出现，尤其是与创意相关的项目。保持敏锐的洞察力，抓住关键时刻展现自己的能力。',
    '今天适合处理积压的工作，效率较高。与同事的沟通顺畅，团队合作能带来意想不到的成果。',
    '职场中可能面临一些挑战，但这也是展现实力的好机会。保持自信，用行动证明自己。',
    '事业运平稳，适合制定长期计划。今天做出的决策会对未来产生积极影响，认真思考每一步。',
    '工作中可能会遇到意见分歧，学会倾听不同的声音。灵活变通比固执己见更容易获得支持。',
    '今天灵感充沛，适合头脑风暴和创意工作。把握住思维的火花，可能产生突破性的想法。',
    '适合学习新技能或参加培训，为职业发展充电。今天的积累会成为未来的重要资本。'
  ];
  const wealthTexts = [
    '财运不错，可能有意外之财或加薪的机会。但不宜进行大额投资，稳健理财为上。',
    '今天消费欲望较强，注意控制开支。适合制定预算计划，为未来的大额支出做准备。',
    '偏财运一般，正财运尚可。适合处理日常财务事务，如账单、报销等。',
    '有贵人相助的财运，可能在商业合作或投资上获得好机会。但务必做好充分的调研。',
    '今天不宜借钱给他人，也不宜借贷。保持财务独立，量入为出。',
    '财运回升，之前的投资可能开始见到回报。适合复盘理财策略，优化资产配置。',
    '适合购买日常用品或小额投资。大额消费建议再观望几天，避免冲动消费。'
  ];
  const healthTexts = [
    '身体状况良好，精力充沛。适合进行户外运动，如跑步、骑行等，释放多余的能量。',
    '注意休息，不要过度劳累。今天容易感到疲惫，适当的小憩能帮助你恢复精力。',
    '肠胃方面需要特别注意，饮食宜清淡。避免暴饮暴食和辛辣刺激的食物。',
    '情绪波动可能影响睡眠质量，建议睡前做些放松的活动，如冥想或听轻音乐。',
    '今天适合做一次全面的身体检查，关注自己的健康状况。预防胜于治疗。',
    '运动运佳，适合尝试新的运动项目。但注意热身，避免运动损伤。',
    '注意用眼卫生，长时间看屏幕后要适当休息。多喝水，保持身体的水分充足。'
  ];
  const luckyColors = ['红色','橙色','金色','绿色','蓝色','紫色','白色','粉色','银色','棕色','青色','黄色'];
  const luckyDirs = ['东方','南方','西方','北方','东南','东北','西南','西北'];
  const luckyNums = ['1','2','3','5','6','7','8','9','11','13','15','18','21','22','26','28','33','36','39','42'];
  const luckyFoods = ['红色水果','坚果','绿叶蔬菜','海鲜','豆制品','蜂蜜水','粗粮','鸡蛋','牛奶','绿茶','黑巧克力','酸奶'];
  const summaryTexts = [
    '今天整体运势向好，各方面都有不错的表现。保持积极的心态，你会发现自己比想象中更出色。',
    '今天可能会遇到一些小挑战，但这些都是成长的机会。保持冷静和耐心，困难终将过去。',
    '灵感充沛的一天，适合进行创作和思考。你的直觉今天特别准，相信自己的判断。',
    '社交运旺盛，人际关系和谐。今天适合与朋友聚会或参加社交活动，拓展人脉。',
    '适合休息和调整的一天。给自己一些独处的时间，整理思绪，为接下来的挑战养精蓄锐。',
    '行动力超强的一天，适合推进重要计划。把握住今天的能量，你会取得不错的进展。',
    '感情运突出的一天，无论是单身还是有伴侣，都能感受到浓浓的爱意。珍惜身边的人。',
    '财运亨通的一天，适合处理财务相关的事务。理性消费，合理投资，收获满满。',
    '学习运极佳，适合吸收新知识。今天的记忆力特别好，抓住机会充实自己。',
    '今天适合反思和规划，回顾过去的经验，为未来制定清晰的目标。'
  ];
  const adviceTexts = [
    '保持积极乐观的心态，好运自然来。今天适合穿' + pick(luckyColors, 0) + '的衣物提升运势。',
    '注意控制情绪，遇事三思而后行。今天适合向' + pick(luckyDirs, 1) + '方位出行。',
    '多与朋友交流，分享你的想法。今天的幸运数字是' + pick(luckyNums, 2) + '。',
    '今天适合学习充电，拓展视野。饮食上可以多吃' + pick(luckyFoods, 3) + '。',
    '注意身体健康，早睡早起。今天适合穿' + pick(luckyColors, 4) + '，幸运方位' + pick(luckyDirs, 5) + '。',
    '相信自己的直觉，大胆行动。今天的幸运数字是' + pick(luckyNums, 6) + '，幸运颜色' + pick(luckyColors, 7) + '。',
    '财务上宜保守，避免冲动消费。今天适合食用' + pick(luckyFoods, 8) + '补充能量。'
  ];

  return {
    overall: 60+r(1)%40, love: 55+r(2)%45, career: 55+r(3)%45,
    wealth: 50+r(4)%50, health: 60+r(5)%40,
    summary: pick(summaryTexts, 10),
    loveDetail: pick(loveTexts, 0),
    careerDetail: pick(careerTexts, 1),
    wealthDetail: pick(wealthTexts, 2),
    healthDetail: pick(healthTexts, 3),
    advice: pick(adviceTexts, 4),
    luckyColor: pick(luckyColors, 5),
    luckyDir: pick(luckyDirs, 6),
    luckyNum: pick(luckyNums, 7),
    luckyFood: pick(luckyFoods, 8)
  };
}

// ===== 姓名测算 =====
const STROKES = {'王':4,'李':7,'张':7,'刘':6,'陈':7,'杨':7,'赵':9,'黄':11,'周':8,'吴':7,'徐':10,'孙':6,'胡':9,'朱':6,'高':10,'林':8,'何':7,'郭':10,'马':3,'罗':8,'梁':11,'宋':7,'郑':8,'谢':12,'韩':12,'唐':10,'冯':5,'于':3,'董':12,'萧':11,'程':12,'曹':11,'袁':10,'邓':4,'许':6,'傅':12,'沈':8,'曾':12,'彭':12,'吕':6,'苏':7,'卢':5,'蒋':12,'蔡':14,'贾':10,'丁':2,'魏':14,'薛':16,'叶':5,'阎':11,'余':7,'潘':9,'杜':7,'戴':17,'夏':10,'钟':9,'汪':7,'田':5,'任':6,'姜':9,'范':8,'方':4,'石':5,'姚':9,'谭':14,'廖':14,'邹':7,'熊':14,'金':8,'陆':7,'郝':9,'孔':4,'白':5,'崔':11,'康':11,'毛':4,'邱':7,'秦':10,'江':6,'史':5,'顾':10,'侯':9,'邵':7,'孟':8,'龙':5,'万':3,'段':9,'雷':13,'钱':10,'汤':6,'尹':4,'黎':15,'易':8,'常':11,'武':8,'乔':6,'贺':9,'赖':13,'龚':11,'文':4,'明':8,'永':5,'建':8,'国':8,'志':7,'伟':11,'强':12,'军':6,'杰':8,'磊':15,'涛':10,'斌':11,'鑫':24,'洋':9,'勇':9,'艳':24,'敏':11,'静':14,'丽':7,'娟':10,'燕':16,'芳':7,'娜':9,'秀':7,'英':8,'华':6,'慧':15,'巧':5,'美':9,'兰':5,'婷':12,'雪':11,'琳':12,'晶':12,'欣':8,'蕾':16,'瑶':14,'倩':10,'颖':13,'露':20,'怡':8,'佳':8,'馨':20,'梦':11,'琪':12,'雅':12,'薇':16,'菲':14,'珊':9,'瑜':13,'璇':15,'萱':12,'妍':7,'彤':7,'曦':20,'晗':11,'睿':14,'泽':8,'昊':8,'宇':6,'轩':7,'博':12,'涵':12,'浩':10,'然':12,'皓':12,'晨':11,'翔':12,'鹏':13,'辉':12,'龙':5,'文':4,'博':12,'天':4,'一':1,'二':2,'三':3,'四':5,'五':4,'六':4,'七':2,'八':2,'九':2,'十':2};

function calcName(surname, given) {
  const gs = [...surname].map(c => STROKES[c] || (c.charCodeAt(0)%10+3));
  const gns = [...given].map(c => STROKES[c] || (c.charCodeAt(0)%10+3));
  const st = gs.reduce((a,b)=>a+b,0), gt = gns.reduce((a,b)=>a+b,0);
  const tg = st+1, rg = st+gns[0], dg = gt;
  const wg = given.length>1 ? st+gns[gns.length-1] : tg;
  const zg = st+gt;
  const wx = n => ({1:'木',2:'木',3:'火',4:'火',5:'土',6:'土',7:'金',8:'金',9:'水',0:'水'}[n%10]);
  const lucky = [1,3,5,6,7,8,11,13,15,16,17,18,21,23,24,25,29,31,32,33,35,37,39,41,45,47,48];
  const meaning = n => lucky.includes(n) ? '大吉' : n%2===0 ? '吉' : '凶';
  const ge = (n) => ({num:n, wx:wx(n), luck:meaning(n)});
  let score = 60;
  if (meaning(rg)==='大吉') score+=15; else if (meaning(rg)==='吉') score+=10;
  if (meaning(zg)==='大吉') score+=10; else if (meaning(zg)==='吉') score+=5;
  score = Math.min(99, score);
  return {tianGe:ge(tg),renGe:ge(rg),diGe:ge(dg),waiGe:ge(wg),zongGe:ge(zg),score};
}

// ===== 风水 =====
const BA_ZHAI = {
  1:{sq:'东南',ty:'东',yn:'南',hh:'东北',ls:'北',wg:'西',jm:'西北'},
  2:{sq:'东北',ty:'西',yn:'西北',hh:'东南',ls:'南',wg:'东',jm:'北'},
  3:{sq:'南',ty:'东南',yn:'东',hh:'西北',ls:'西',wg:'北',jm:'东北'},
  4:{sq:'东',ty:'南',yn:'东南',hh:'西',ls:'西北',wg:'东北',jm:'北'},
  6:{sq:'西',ty:'东北',yn:'西北',hh:'南',ls:'东南',wg:'东',jm:'北'},
  7:{sq:'西北',ty:'西',yn:'东北',hh:'东',ls:'南',wg:'东南',jm:'北'},
  8:{sq:'东北',ty:'西',yn:'西北',hh:'东南',ls:'南',wg:'东',jm:'北'},
  9:{sq:'南',ty:'东南',yn:'东',hh:'西北',ls:'西',wg:'北',jm:'东北'}
};

function calcFengShui(year, gender) {
  const digits = String(year).split('').map(Number);
  let sum = digits.reduce((a,b)=>a+b,0);
  while(sum>9) sum = String(sum).split('').reduce((a,b)=>a+b,0);
  let kua = sum%9===0?9:sum%9;
  if(year>=2000) kua = gender===1?(10-kua):(kua+6);
  else kua = gender===1?(10-kua):(kua+4);
  if(kua>9) kua%=9;
  if(kua===5) kua = gender===1?2:8;
  const group = [1,3,4,9].includes(kua)?'东四命':'西四命';
  const t = BA_ZHAI[kua]||BA_ZHAI[1];
  return {kua, group, ...t};
}

// ===== 数字能量 =====
function reduceNum(n) { while(n>9&&n!==11&&n!==22&&n!==33) n=String(n).split('').reduce((a,b)=>a+parseInt(b),0); return n; }
function lifePath(y,m,d) {
  const lp = reduceNum(reduceNum(y)+reduceNum(m)+reduceNum(d));
  const meanings = {
    1:'天生的领导者，独立自主，充满创造力。',2:'天生的调解者，敏感细腻，善于倾听。',
    3:'天生的艺术家，富有创造力和幽默感。',4:'天生的建设者，踏实可靠，注重秩序。',
    5:'天生的冒险家，热爱变化和新鲜体验。',6:'天生的照顾者，充满爱心和责任感。',
    7:'天生的思考者，追求真理和深层理解。',8:'天生的商业家，追求物质和精神的双重成功。',
    9:'天生的理想主义者，关心社会和人类福祉。',11:'灵性导师，拥有超凡的直觉和灵感。',
    22:'建造大师，能将宏大愿景变为现实。',33:'治愈大师，拥有无条件的爱和治愈能力。'
  };
  return {num:lp, meaning:meanings[lp]||'未知'};
}

// ===== 每日运势 =====
function getDailyFortune() {
  const d = new Date();
  const seed = d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  let _s=seed;const rand=()=>{_s=(_s*9301+49297)%233280;return _s/233280;};
  const r = rand;
  const colors=['红色','橙色','黄色','绿色','青色','蓝色','紫色','白色','粉色'];
  const dirs=['东','南','西','北','东南','东北','西南','西北'];
  const yiOpts=['签约','出行','搬家','开业','求职','约会','投资','学习','运动','购物','社交','面试'];
  const jiOpts=['争吵','借贷','赌博','远行','跳槽','手术','冲动消费','熬夜'];
  const yi=[],ji=[];
  for(let i=0;i<4;i++) yi.push(yiOpts[Math.floor(r()*yiOpts.length)]);
  for(let i=0;i<3;i++) ji.push(jiOpts[Math.floor(r()*jiOpts.length)]);
  return {
    date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
    overall:Math.floor(50+r()*50), love:Math.floor(45+r()*55), career:Math.floor(45+r()*55),
    wealth:Math.floor(40+r()*60), health:Math.floor(50+r()*50),
    luckyColor:colors[Math.floor(r()*colors.length)], luckyNumber:Math.floor(r()*9)+1,
    luckyDirection:dirs[Math.floor(r()*dirs.length)], yi, ji,
    summary:['今天整体运势不错，适合推进重要计划。','今天可能遇到一些小挑战，但你的能力足以应对。','今天灵感充沛，适合创意工作和学习新知识。','今天社交运佳，多与人交流可能带来意外收获。','今天适合休息调整，为接下来的挑战积蓄能量。','今天行动力强，适合处理积压的事务。','今天财运不错，但需理性消费。'][Math.floor(r()*7)],
    advice:['保持积极心态，好运自然来。','注意控制情绪，避免冲动决定。','多与朋友交流，可能获得有价值的建议。','今天适合学习充电，提升自己的能力。','注意身体健康，适当运动。','财务方面宜保守，不宜冒险投资。','相信自己的直觉，但重大决定还需理性分析。'][Math.floor(r()*7)]
  };
}
