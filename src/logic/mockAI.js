// =====================================================================
// 演示版「AI 能力层」
// 当前为规则化本地生成，保证 0 配置 / 离线可演示 / 结果可控。
// 后期接入真实大模型时，只需替换本文件同名函数（保持返回结构一致）。
// =====================================================================
import { uid } from './constants.js';

/* ---------------- 品类识别（从 brief 文本猜测品类） ---------------- */
export function guessCategory(brief) {
  const pool = {
    美妆护肤: ['护肤', '精华', '面霜', '面膜', '彩妆', '粉底', '口红', '防晒', '洗面奶', '美白', '淡纹'],
    食品饮料: ['零食', '饮料', '咖啡', '茶饮', '气泡水', '燕麦', '蛋白棒', '冲调', '坚果'],
    数码3C: ['耳机', '手机', '电脑', '键盘', '鼠标', '充电', '3C', '数码', '智能手表'],
    母婴: ['宝宝', '婴童', '纸尿裤', '辅食', '奶瓶', '母婴', '儿童'],
    服装鞋包: ['服装', '外套', '羽绒服', '运动鞋', '鞋', '包包', '穿搭', '服饰'],
    家居生活: ['家居', '床垫', '枕头', '收纳', '香氛', '清洁', '厨具', '家电']
  };
  const text = JSON.stringify(brief || '').toLowerCase();
  let best = '默认品类';
  let score = 0;
  for (const [cat, words] of Object.entries(pool)) {
    let s = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
    if (s > score) { score = s; best = cat; }
  }
  return best;
}

const COMPLIANCE_RULES = {
  美妆护肤: [
    { title: '功效宣称', detail: '不得使用“美白、祛斑、医美级、抗老逆龄、根治”等绝对化/医疗化宣称，需以“改善、帮助淡化”等稳妥表述呈现。' },
    { title: '资质背书', detail: '涉及功效需标注特证编号；“成分党”内容只引成分本身功效，不演绎临床功效。' },
    { title: '前后对比', detail: '画面/文案避免“使用前 VS 使用后”的夸张对比，需注明“效果因人而异，实际以个人体验为准”。' },
    { title: '医美暗示', detail: '禁用“堪比热玛吉、平替医美、换肤”等医美关联话术，谨防被认定误导。' }
  ],
  食品饮料: [
    { title: '功能宣称', detail: '不得暗示“治疗/保健功效”，如“减肥、降血糖、助眠治愈”；避免“0 糖 = 无热量”等误导。' },
    { title: '成分边界', detail: '配料与营养表需与实物一致，不夸大“天然、无添加”的绝对性（应写“不额外添加”）。' },
    { title: '未成年人', detail: '画面不得引导未成年人冲动消费或暗示“喝了就能长高/变聪明”。' }
  ],
  数码3C: [
    { title: '参数真实性', detail: '参数、跑分、价格需以官方为准；不虚构“首发价”“最低价”，不贬低竞品参数误导用户。' },
    { title: '极限对比', detail: '“碾压、秒杀”等措辞禁用，对比测试需注明条件，避免断章取义。' },
    { title: '电池/安全', detail: '不得展示改装电池、危险使用方式等安全风险内容。' }
  ],
  母婴: [
    { title: '安全红线', detail: '不得出现可能误导家长的绝对安全承诺；材质/标准需有出处。' },
    { title: '专家背书', detail: '提及儿科/专家观点需核实；不制造焦虑（如“错过X岁就晚了”）。' }
  ],
  服装鞋包: [
    { title: '材质宣称', detail: '面料成分比例需与吊牌一致，“纯棉、真皮”需准确，不做“平替大牌”式误导。' },
    { title: '穿搭夸张', detail: '慎用“显高10cm、人人夸”等不可验证效果。' }
  ],
  默认品类: [
    { title: '绝对化用语', detail: '禁用“最、第一、国家级、绝无仅有”等广告法违禁词；确有依据需标注出处。' },
    { title: '对比竞品', detail: '不得无依据贬低竞品，对比表述需客观并注明维度。' },
    { title: '功效暗示', detail: '避免隐含功效/疗效承诺，功能性表述需有凭证并加“以实际为准”提醒。' }
  ]
};

/* ============ 1. AI 洞察：竞品选题库 / 行业热点 / 卡审注意事项 ============ */
export function generateInsights(project) {
  const brief = project.brief || {};
  const cat = guessCategory(brief.brandIntro + brief.productBrief + (brief.competitors || []).join(''));
  const brand = brief.brandName || project.name;
  const product = brief.product || '主推产品';
  const hot = catHot(cat, brand, product);
  const rules = COMPLIANCE_RULES[cat] || COMPLIANCE_RULES['默认品类'];

  const topics = hot.topics;
  const compBanks = brief.competitors && brief.competitors.length
    ? brief.competitors.slice(0, 4)
    : ['竞品A', '竞品B', '竞品C'];

  const topicCards = topics.map((t, i) => ({
    id: uid('tp'),
    title: t.title,
    angle: t.angle,
    hook: t.hook,
    platform: i % 3 === 0 ? '抖音' : i % 3 === 1 ? '小红书' : '双平台',
    type: i % 2 === 0 ? '图文' : '短视频',
    refComp: compBanks[i % compBanks.length],
    refNote: `其“${t.refTitle}”系列近 30 天互动最高的一条为视频开头的场景痛点 + 反转结论式表达`,
    why: t.why,
    risk: t.risk,
    score: 82 + ((i * 7) % 17)
  }));

  return {
    cat,
    topics: topicCards,
    hotspots: hot.hotspots,
    compliance: rules,
    generatedAt: new Date().toISOString()
  };
}

function catHot(cat, brand, product) {
  const map = {
    美妆护肤: {
      topics: [
        { title: `${product} 冷门用法测评：原来我一直用错了`, angle: '反常识测评', hook: '前 3 秒抛出错误用法造成悬念', why: '测评类内容完播率高，反常识点驱动收藏', risk: '避免贬低竞品，测评客观化', refTitle: 'XX精华用法测评' },
        { title: `${product} × 换季泛红自救指南`, angle: '场景痛点切入', hook: '换季刺痛画面 + “别再乱涂了”', why: '痛点型选题搜索/推荐双高，泛红词条热度持续', risk: '避免医疗功效暗示', refTitle: '换季修护自救' },
        { title: `成分党拆解 ${product}：有效成分真的够吗`, angle: '专业成分解读', hook: '放大成分表 + 讲解语气', why: '成分类内容收藏率高，人群精准', risk: '不虚构临床功效', refTitle: '成分拆解' },
        { title: `早八懒人 ${product} 5 分钟护肤流程`, angle: '场景解决方案', hook: '闹钟响 + 赶时间切镜', why: '早八/懒人标签流量池大', risk: '流程真实不夸张', refTitle: '早八护肤流程' }
      ],
      hotspots: [
        { title: '小红书 #早八人护肤 话题周热度 +32%', detail: '低门槛、可跟拍的内容获得更大自然流量，建议轻量条切入。' },
        { title: '抖音 #成分党 内容供给上升', detail: '专业拆解型视频完播率高，但需更严谨的话术（见卡审）。' },
        { title: '平台风向：以“本人真实体验”强化信任', detail: '头部内容大量使用“自用 X 周后”叙事，转化信任感优于硬广。' }
      ]
    },
    食品饮料: {
      topics: [
        { title: `${product} 无限回购清单：办公室下午茶新顶流`, angle: '清单种草', hook: '工位囤货画面', why: '清单式内容收藏高', risk: '不夸大健康功效', refTitle: '回购清单' },
        { title: `${product} 热量实测：到底能不能放开吃`, angle: '好奇实测', hook: '热量秤特写 + 数字悬念', why: '实测争议带来评论互动', risk: '营养数据需准确', refTitle: '热量实测' },
        { title: `减脂期嘴馋就靠 ${product}？真实吃法分享`, angle: '人群场景', hook: '“减脂期也能快乐”', why: '减脂人群标签强转化', risk: '避免减肥功效暗示', refTitle: '减脂期零食' }
      ],
      hotspots: [
        { title: '“配料表干净”成为最热门搜索前缀', detail: '干净配料成为消费决策关键词，内容中建议给出配料表实拍。' },
        { title: '平台“区域美食 + 新品牌”内容扶持', detail: '叠加产地/地域故事可获得额外曝光，可尝试产地溯源切入。' }
      ]
    },
    数码3C: {
      topics: [
        { title: `${product} 深度使用 30 天，说点大实话`, angle: '长测复盘', hook: '时间线快剪', why: '长测真实感强，粉丝信任高', risk: '如实描述续航/槽点', refTitle: '30天长测' },
        { title: `${product} 开箱 + 参数实测：值不值得买`, angle: '硬核评测', hook: '参数弹幕 + 实测数据', why: '决策期用户搜索意图强', risk: '参数引用官方口径', refTitle: '参数实测' },
        { title: `通勤党/打工人入手 ${product} 的一周体验`, angle: '人群场景', hook: '通勤 Vlog 切入', why: '场景化种草自然不硬广', risk: '价格描述客观', refTitle: '通勤数码好物' }
      ],
      hotspots: [
        { title: '“平替”相关话题仍高热但争议上升', detail: '建议弱化“平替”表述，转向“同价位更好用”等客观话术。' },
        { title: '实测类视频在抖音数码区时长占比上升', detail: '信息密度高、可跳转种草的内容更受算法推荐。' }
      ]
    },
    默认品类: {
      topics: [
        { title: `${product} 真实体验 7 天：值不值一目了然`, angle: '体验实证', hook: '开头直接给结论', why: '强结论降低完播门槛', risk: '结论需有依据', refTitle: 'X天体验' },
        { title: `对比 3 款之后，我留了 ${product}`, angle: '横向对比', hook: '三选一过程记录', why: '对比型内容决策感强', risk: '对比维度客观', refTitle: '横向对比' },
        { title: `${product} 的 3 个隐藏打开方式`, angle: '场景扩容', hook: '使用场景速览', why: '场景扩容激发评论补充', risk: '不做夸大承诺', refTitle: '隐藏玩法' }
      ],
      hotspots: [
        { title: '“听劝式种草”内容互动率更高', detail: '以“按评论区建议实测”互动梗开篇，能显著拉高评论量。' },
        { title: '真实开箱/空瓶类 UGC 获推荐加权', detail: '真实使用痕迹（空瓶/磨损）的实拍增强信任感。' }
      ]
    }
  };
  const rules = COMPLIANCE_RULES[cat] || COMPLIANCE_RULES['默认品类'];
  const hotspots = map[cat] ? map[cat].hotspots : map['默认品类'].hotspots;
  return { topics: (map[cat] || map['默认品类']).topics, hotspots, rules: rules.map((r) => r.detail) };
}

/* ============ 2. 审稿用“文档内容模拟”（真实场景来自飞书文档） ============ */
export function buildReviewDoc(stageKey, kol, sourceContent = '', source = 'submitted') {
  const title = kol.name ? `${kol.name} · 种草内容` : '种草内容';
  const submittedContent = sourceContent || (kol.drafts && kol.drafts[stageKey]);
  if (submittedContent) {
    const paragraphs = submittedContent.split(/\n+/).map((text) => text.trim()).filter(Boolean);
    const blocks = paragraphs.slice(0, 39).map((text, index) => ({
      id: `${source}_${index + 1}`,
      tag: stageKey === 'script_pending' && /^\[?(?:镜头|口播|画面|转场|00:)/.test(text) ? '脚本段落' : `稿件段落 ${index + 1}`,
      text
    }));
    if (paragraphs.length > 39) {
      blocks.push({
        id: `${source}_40`,
        tag: `稿件段落 40（后续内容）`,
        text: paragraphs.slice(39).join('\n')
      });
    }
    return {
      name: stageKey === 'draft_pending' ? '达人种草大纲' : stageKey === 'script_pending' ? '达人脚本' : '达人视频初稿',
      source,
      blocks: blocks.length ? blocks : [{ id: `${source}_1`, tag: '稿件正文', text: submittedContent.trim() }]
    };
  }
  if (stageKey === 'draft_pending') {
    return {
      name: '达人种草大纲',
      source: 'demo',
      blocks: [
        { id: 'h1', tag: '大纲标题', text: `${title}：${'打破对“贵 = 好”的误解，成分与体验同样重要'}` },
        { id: 'p1', tag: '钩子设计', text: '开头直接怼脸使用效果，并抛出问题：“为什么你花了大价钱还是没效果？关键在这三步。”' },
        { id: 'p2', tag: '痛点铺垫', text: '讲述自己曾经盲目跟风踩坑：跟风买大牌、叠加使用导致烂脸，引向“看成分、看体验、看实测”。' },
        { id: 'p3', tag: '核心内容', text: '从三个维度展开：1）成分与质地实测；2）14 天真实使用记录（含照片）；3）和 2 款竞品的横向对比。' },
        { id: 'p4', tag: '场景种草', text: '结尾给出使用场景：早八通勤快速护肤 + 换季敏感期维稳，并口播“链接在评论区置顶，领券再下单”。' },
        { id: 'p5', tag: '风险话术', text: '口播补充“本内容为个人真实使用感受，效果因人而异，仅供参考，理性种草。”' }
      ]
    };
  }
  if (stageKey === 'script_pending') {
    return {
      name: '达人脚本（口播 + 分镜）',
      source: 'demo',
      blocks: [
        { id: 'v0', tag: '00:00 - 00:04', text: '[镜头] 特写产品在桌面转盘上，画外音：别急着划走，30 秒看完这支被吹爆的宝藏产品到底行不行。' },
        { id: 'v1', tag: '00:04 - 00:16', text: '[口播] 先说结论：用了一个月，皮肤状态真的稳定了不少，但网上把它夸上天我是不认同的，它适合的是有熬夜、泛红困扰的姐妹。' },
        { id: 'v2', tag: '00:16 - 00:40', text: '[画面] 字幕同步成分表特写，口播：核心是 X 和 Y 两个成分，一个修护屏障，一个舒缓泛红；我拿前后 14 天的素颜对比给大家看。' },
        { id: 'v3', tag: '00:40 - 01:02', text: '[转场] 和市面另外两款热门产品并排测评，口播：质地、吸收、保湿力逐一比，结论是它更适合敏感肌，但性价比见仁见智。' },
        { id: 'v4', tag: '01:02 - 01:20', text: '[口播] 结尾：坚持用会有惊喜，链接放在左下角，记得先领券再下单！还有什么想测的评论区告诉我。' },
        { id: 'v5', tag: '01:20 - 01:24', text: '[口播] 本视频为个人真实体验，效果因人而异，请理性种草。' }
      ]
    };
  }
  return {
    name: '达人视频初稿（抽帧审阅）',
    source: 'demo',
    blocks: [
      { id: 'f1', tag: '00:00 封面帧', text: '封面大标题：“别再交智商税了！成分党实测 30 天”，人物表情夸张，副标题“贵 ≠ 好用”。' },
      { id: 'f2', tag: '00:05 口播开头', text: '（无口头介绍品牌）直接说“姐妹们今天测个狠的”，画面从开箱直接切使用特写。' },
      { id: 'f3', tag: '00:32 功效对比段', text: '14 天前后对比图并排展示，文案标注“皮肤肉眼可见变好”，BGM 音量较大。' },
      { id: 'f4', tag: '01:10 竞品对比段', text: '将竞品 A 称为“智商税”，画面配合撇嘴动作，未打码竞品 LOGO。' },
      { id: 'f5', tag: '01:45 口播收尾', text: '“现在下单立减 50，仅限今天”，画面弹出价格与倒计时。' },
      { id: 'f6', tag: '全片 BGM', text: '背景音乐使用热门 BGM 变调版，未标注来源。' }
    ]
  };
}

/* ============ 3. AI 审稿批注生成 ============ */
export function reviewBlocks({ stageKey, doc, brief, project }) {
  const B = (i) => doc.blocks[i];
  const briefText = (brief && (brief.brandIntro + brief.productBrief + brief.notes + (brief.competitors || []).join(','))) || '';
  const rules = brief && brief.rules ? brief.rules : [];
  const notes = (brief && (brief.notes || '')) ? splitNotes(brief.notes) : [];
  const competitors = (brief && brief.competitors) || [];
  const anns = [];
  let ai = (a) => a;

  if (stageKey === 'draft_pending') {
    // 大纲批注
    anns.push(make('compliance', B(0).id, { where: '大纲标题', original: B(0).text,
      suggestion: '标题使用“贵 = 好是误解”属于对行业现状的评价，标题方向 OK；但建议把“误解”弱化为“是不是越贵越好？”，避免标题党式否定全行业。',
      reason: '负面情绪标题易触发限流与用户举报，规避风险的同时保留悬念。', severity: 'suggest' }));
    anns.push(make('creative', B(1).id, { where: '钩子设计', original: B(1).text,
      suggestion: '“花了大价钱还是没效果”这句钩子引发负向联想，容易招致竞品粉丝对立评论。建议增加 0.5 秒“同品类避雷”软性过渡。',
      reason: '开头对立话术会拉低评论氛围，影响评论区权重。', severity: 'suggest' }));
    anns.push(make('sales', B(3).id, { where: '核心内容', original: B(3).text,
      suggestion: `横向对比对象建议点名 ${competitors[0] || '同类热门产品'}、${competitors[1] || '同类口碑产品'}，并给出对比维度表（成分/质地/价格），对比维度越客观说服力越强。`,
      reason: '结合竞品库信息可让对比更可信，避免空泛。', severity: 'suggest' }));
    anns.push(make('content', B(4).id, { where: '场景种草', original: B(4).text,
      suggestion: '口播引导“领券再下单”太硬。建议拆为：先给干货价值（早八流程），最后一句自然带出“有需要的姐妹再看评论区置顶”。',
      reason: '硬转化话术在起号期容易被限流，软化后转化不掉。', severity: 'must' }));
    anns.push(make('content', B(2).id, { where: '痛点铺垫', original: B(2).text,
      suggestion: '“盲目跟风踩坑烂脸”的叙述建议增加“已按建议停用并修复好”的收尾，避免劝退观感。',
      reason: '负面体验叙述过长会影响产品可信度，需在 30 字内转正。', severity: 'suggest' }));
  } else if (stageKey === 'script_pending') {
    anns.push(make('content', B(1).id, { where: '00:04-00:16', original: B(1).text,
      suggestion: '“网上把它夸上天我是不认同的”指向性模糊。改成“网上很多说法比较夸张，我的真实感受是……”把对立转移到“夸张说法”，更安全。',
      reason: '避免“不认同”类表述误伤同领域达人，引发同行评论区互踩。', severity: 'must' }));
    anns.push(make('compliance', B(2).id, { where: '00:16-00:40', original: B(2).text,
      suggestion: '“皮肤状态真的稳定了不少”属于功效表述，建议改为“我自己用下来感觉泛红有缓解”，并全程标注“个人体验，仅供参考”。',
      reason: '结合卡审规则：无特证不得做确定性功效宣称。', severity: 'must' }));
    anns.push(make('sales', B(3).id, { where: '00:40-01:02', original: B(3).text,
      suggestion: '对比环节增加一句价格说明“三者价位接近时再看成分”，先立标准再下结论，转化说服力更强。',
      reason: '先立维度再对比，可避免被评论区挑刺“价格不同怎么比”。', severity: 'suggest' }));
    anns.push(make('tech', B(0).id, { where: '00:00-00:04', original: B(0).text,
      suggestion: '“30 秒看完”与脚本实际 84 秒不符，开头承诺需与内容时长一致，建议改为“一分钟看完”。',
      reason: '首屏承诺与正片时长不一致会被判定标题党，影响完播率。', severity: 'suggest' }));
  } else {
    anns.push(make('compliance', B(1).id, { where: '00:05 口播开头', original: B(1).text,
      suggestion: '开头未提品牌信息，但画面出现品牌 LOGO 且无“广告”标注。商业合作内容需在片头/文案中标注广告性质，建议保留“合作品牌：XX”提示。',
      reason: '内容商业化未显著标示，存在合规与举报风险（对应卡审项）。', severity: 'must' }));
    anns.push(make('compliance', B(2).id, { where: '00:32 功效对比段', original: B(2).text,
      suggestion: '“肉眼可见变好”为确定性功效表达；前后对比图无“效果因人而异”水印。请加上“个人真实体验，效果因人而异”字幕，并弱化文案为“泛红有改善”。',
      reason: '无特证不得宣称确定性功效；对比图需附免责提示。', severity: 'must' }));
    anns.push(make('content', B(3).id, { where: '01:10 竞品对比段', original: B(3).text,
      suggestion: '将竞品 A 称为“智商税”且未打码 LOGO。请删除该称呼，改为“这款价格高但肤感一般”，并为竞品 LOGO 打码。',
      reason: '贬损指名竞品有被投诉下架及品牌公关风险，务必修改。', severity: 'block' }));
    anns.push(make('sales', B(4).id, { where: '01:45 口播收尾', original: B(4).text,
      suggestion: '“仅限今天”属限时优惠话术，需与平台/品牌实际优惠活动一致。若为达人自发承诺，请删除，改用“关注我蹲后续福利”。',
      reason: '虚假限时优惠一旦被验证不实，将影响商单结算与信任。', severity: 'must' }));
    anns.push(make('creative', B(5).id, { where: '全片 BGM', original: B(5).text,
      suggestion: '热门 BGM 变调版建议替换为平台商用曲库内正版音源，避免版权申诉导致限流。',
      reason: '版权风险会直接导致内容下架。', severity: 'suggest' }));
    anns.push(make('tech', B(0).id, { where: '00:00 封面帧', original: B(0).text,
      suggestion: '封面“别再交智商税了”表达略激进，标题保留但正文封面副标题建议弱化为“成分党 30 天实测记录”，人物表情控制自然。',
      reason: '封面激进但内容温和会造成点开落差，影响完播与转化。', severity: 'suggest' }));
  }

  // 关联前置注意事项与卡审规则，追加批注
  if (brief && brief.notes) {
    const note = brief.notes;
    if (/美白|祛斑|医美|治疗|治愈|根治|减肥/.test(note)) {
      const blk = stageKey === 'draft_pending' ? B(3).id : stageKey === 'script_pending' ? B(2).id : B(3).id;
      anns.push(make('compliance', blk, { where: '涉及敏感功效处', original: '正文/脚本中涉及功效相关描述',
        suggestion: `结合项目卡审要求（${note.slice(0, 60)}…）：涉及该功效的表达需改为“使用后个人感受”，并添加“效果因人而异”提示。`,
        reason: '命中品牌方预先设定的内容红线，必须遵守。', severity: 'must' }));
    }
  }
  if (stageKey === 'draft_pending' && notes.length) {
    anns.push(make('content', B(3).id, { where: '核心内容', original: '大纲正文结构',
      suggestion: `注意品牌前置要求：${notes[0].slice(0, 50)}${notes.length > 1 ? '；' + notes[1].slice(0, 40) + '…' : '…'}。建议在正文中单独成段体现。`,
      reason: '品牌内容注意事项需被完整承载。', severity: 'suggest' }));
  }
  if (brief && brief.competitors && brief.competitors.length && stageKey !== 'video_pending') {
    anns.push(make('sales', B(4).id, { where: '竞品相关段落', original: '提及竞品表述',
      suggestion: `竞品库收录：${brief.competitors.join('、')}。请先做差异性对比，避免与其同质化开头（可参考洞察中的“对比测评”选题角度）。`,
      reason: '与竞品形成差异是本次投放的核心目标之一。', severity: 'suggest' }));
  }

  return anns.slice(0, 8);
}

function make(type, blockId, opts) {
  return {
    id: uid('an'),
    type,
    blockId,
    where: opts.where,
    original: opts.original,
    suggestion: opts.suggestion,
    reason: opts.reason,
    severity: opts.severity || 'suggest',
    status: 'open',            // open | accepted | removed
    createdAt: new Date().toISOString()
  };
}

function splitNotes(s) {
  return s.split(/[\n;；。]/).map((x) => x.trim()).filter(Boolean);
}

/* ---------------- 提示达人修改的文案 ---------------- */
export function buildNotifyMessage(project, kol, stageKey, anns) {
  const stage = { draft_pending: '大纲', script_pending: '脚本', video_pending: '视频初稿' }[stageKey];
  const musts = anns.filter((a) => a.status !== 'removed');
  const block = musts.filter((a) => a.severity === 'block').length
    ? '（含 1 项必须修改：涉及合规红线，请优先处理）' : '';
  const lines = musts.map((a) => `【${a.severity === 'block' ? '必须' : a.severity === 'must' ? '重要' : '建议'}·${a.where}】${a.suggestion}`);
  return `@${kol.name} 您好，${project.name} 项目「${stage}」已由品牌方复核完成，请按以下 ${musts.length} 条批注意见修改${block}：\n${lines.join('\n')}\n修改完成后请在飞书文档内回复，并告知我方确认，谢谢！`;
}

/* 占位：生成 demo 用待审稿件 */
export function demoKolName(i) {
  return ['林小鹿 Lin', '苏打泡泡', '一颗奶冻', '阿呜漫游', '桃桃乌龙', 'Momo酱'][i % 6];
}
