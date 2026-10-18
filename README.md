# 达人种草执行平台

这是一个以 AI 为核心的达人内容执行管理 Demo，面向品牌方/运营方场景，用于统一管理“达人选题、内容审稿、发布排期、项目复盘”全流程。

项目以 React + Vite 前端 + Node 代理服务的方式实现，默认支持本地演示数据，并可接入 OpenAI Chat Completions 兼容的大模型 API。

## 项目定位

该平台的核心目标是：

- 快速建立“品牌项目”与“达人内容”任务清单
- 将内容执行流程拆成多个阶段：大纲、脚本、拍摄、视频、定稿发布
- 让 AI 自动生成选题洞察与审稿批注，辅助品牌方把控内容质量和合规风险
- 将排期和发布进度汇总到统一的日历视图，便于运营复盘与协调

适合用于：

- 品牌种草项目管理
- 达人内容风控与审核
- 内容策划与短视频执行协同
- AI 辅助创意评审原型演示

## 功能概览

### 0. 先策略、后执行

- 新建流程先收集项目目标、预算、投放平台、人群、产品 Brief、竞品与执行限制
- 调用已配置的授权趋势数据服务检索抖音 / 小红书公开内容，再让云端大模型结合真实检索结果生成预算、达人、内容、排期与衡量建议
- 用户可以对策略提出意见并多轮要求 AI 调整；只有用户确认策略后才会创建项目，随后进入达人执行看板
- 已确认策略、调研结果与项目信息保存在浏览器 localStorage，并可在项目详情中查看
- 未配置云端大模型时不会用本地模拟内容冒充策略；未配置授权趋势数据时会明确告知用户策略不包含实时平台检索

### 1. 项目总览

- 项目列表与搜索
- 项目概览统计（项目数、达人稿件、待审稿件、修改中、已定稿）
- 新建品牌种草项目

### 2. 项目详情

- 品牌 brief 与产品信息
- 选题洞察（AI 生成）
- 达人列表及内容状态
- 草稿/脚本/视频不同阶段的审核批注
- 可直接查看达人稿件链接、时间线、审稿记录

### 3. AI 审稿与洞察

- 使用云端大模型优先生成选题洞察与审稿意见
- 如果未配置 API Key 或上游失败，则自动回退到本地模拟引擎
- 支持 OpenAI 兼容接口，后端统一代理请求，不直接暴露前端 Key
- 录入达人真实大纲 / 脚本正文后，云端 AI 会逐段定位并给出具体修改建议
- 可将竞品高互动笔记的标题、正文摘要、链接和互动数据作为审稿参考

### 4. 发布与排期

- 给达人内容设置发布时间
- 在“发布日历”中查看已经排期的内容
- 便于运营统一跟踪内容推进节奏

### 5. 竞品笔记素材

- 支持手动粘贴小红书 / 抖音公开笔记内容与链接
- 可选接入合规的数据服务 API，按竞品名称或关键词检索笔记
- 搜索结果需保存项目信息后才会用于后续审稿
- 不会直接抓取、登录或绕过小红书 / 抖音页面访问限制

### 6. 本地数据持久化

- 通过浏览器 localStorage 保存项目状态
- 默认内置演示项目，方便直接体验完整流程

## 技术栈

- 前端：React 18 + Vite
- 后端代理：Node.js (server/index.mjs)
- 数据存储：浏览器 localStorage
- AI 接口：OpenAI Chat Completions 兼容接口

## 目录结构

```text
.
├── src/                  # 前端源码
│   ├── components/       # 页面与公共组件
│   ├── logic/            # 状态管理、AI 封装、demo 数据
│   ├── styles/           # 样式文件
│   ├── App.jsx           # 根组件
│   └── main.jsx          # 入口
├── server/               # AI 代理服务
│   ├── .env.example      # 环境变量示例
│   └── index.mjs         # 代理服务入口
├── index.html            # Vite HTML 模板
├── vite.config.js        # Vite 配置
├── package.json          # 项目脚本与依赖
├── page2.yml             # 业务/流程配置文件（如项目说明或演示配置）
├── snap1.yaml            # 参考内容或快照配置
└── README.md             # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 AI 代理环境变量

复制示例文件：

```bash
cp server/.env.example server/.env
```

然后按需编辑 `server/.env`，例如：

```env
AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
AI_MODEL=glm-4-flash
AI_API_KEY=你的智谱APIKey
```

也支持以下常见模型/平台：

- 智谱 GLM
- Moonshot / Kimi
- 通义千问 DashScope
- DeepSeek
- 火山方舟 / 豆包

更多示例见 `server/.env.example`。

### 3. 启动后端代理

```bash
npm run server
```

默认监听：

- http://localhost:8787

### 4. 启动前端

在另一个终端中运行：

```bash
npm run dev
```

访问浏览器地址：

- http://localhost:5173

### 5. 构建生产包

```bash
npm run build
```

如需预览生产构建：

```bash
npm run preview
```

## AI 模式说明

项目的 AI 接口具备两种模式：

1. 云端模型模式
   - 仅当 `server/.env` 中配置了 `AI_API_KEY` 且后端可访问上游接口时生效
   - 前端请求会经过 `/api/ai/chat` 转发

2. 本地模拟模式
   - 项目选题洞察和演示稿审查可回退到 `src/logic/mockAI.js`
   - 新建项目的正式营销策略要求云端模型可用，避免把模拟模板误认为真实调研结论

## 竞品数据服务配置

自动检索需要用户自行接入已获授权、符合平台规则的数据服务。将下列变量添加到 `server/.env` 后重启代理：

```env
TREND_API_URL=https://your-provider.example/api/search
TREND_API_KEY=你的数据服务APIKey
```

代理会向 `TREND_API_URL` 发送 POST JSON：

```json
{
  "platform": "xiaohongshu",
  "keywords": "修护精华",
  "competitors": ["竞品品牌"],
  "limit": 10
}
```

`platform` 的值为 `xiaohongshu`、`douyin` 或 `all`。数据服务应返回以下规范化结构：

```json
{
  "items": [
    {
      "platform": "xiaohongshu",
      "competitor": "竞品品牌",
      "title": "笔记标题",
      "content": "公开笔记正文或摘要",
      "url": "https://example.com/note",
      "author": "作者昵称",
      "likes": 123,
      "comments": 12,
      "shares": 3,
      "publishedAt": "2026-01-01"
    }
  ]
}
```

字段 `content` 可提供服务商有权提供的公开内容或摘要。前端会保存所选素材在当前浏览器的项目数据中；云端审稿时最多发送 5 条素材，每条内容最多 1000 字。未配置服务时，可在项目详情的「项目信息与前置」页手动粘贴笔记正文和链接。自动抓取平台页面及素材版权/授权校验不在当前 Demo 范围内。

## 达人稿件录入

在项目执行看板新增达人时，可填写飞书新版文档链接。点击 AI 审稿后，服务端会使用飞书开放平台 API 读取文档纯文本，并将其按段落交给云端大模型生成批注。也可以粘贴大纲或上传 `.txt` / `.md` 文件；进入脚本待审核、视频待审核阶段后，可在相应行录入该阶段正文。

### 配置飞书开放平台

1. 在飞书开放平台创建并启用自建应用。
2. 为应用开通云文档权限「查看新版文档」(`docx:document:readonly`)。
3. 将应用 ID 和应用 Secret 配置到 `server/.env`：

   ```env
   FEISHU_APP_ID=cli_你的应用ID
   FEISHU_APP_SECRET=你的应用Secret
   ```

4. 在每份目标文档的「... → 更多 → 添加文档应用」中添加该应用。应用本身获批 API 权限，并不自动获得所有文档的读取权限。
5. 重启 `npm run server`，新增达人并粘贴 `https://...feishu.cn/docx/{document_id}` 链接。

服务端使用 `tenant_access_token`，凭证仅保存在服务端环境变量，并缓存至过期前刷新；不会发送到浏览器。当前自动读取仅支持飞书 / Lark 新版文档 `/docx/` 链接，不支持知识库、表格、旧版 `/doc/` 文档。文档无权限、链接无效或飞书服务不可用时会明确报错，不会静默改用演示稿。真实飞书稿件需要配置可用的云端 AI (`AI_API_KEY`) 才能生成内容审核意见；AI 服务不可用时不会用演示规则冒充真实审稿结果。

飞书 API 文档：

- [获取文档纯文本内容](https://open.feishu.cn/document/server-docs/docs/docs/docx-v1/document/raw_content)
- [自建应用获取 tenant_access_token](https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal)

## 运行时说明

- 程序默认内置了一组演示数据，直接打开页面即可查看完整演示流程
- 增删项目与进度更新会保存在浏览器 localStorage 中
- 如需重置为演示数据，可在页面中使用“重置为演示数据”功能

## 常见问题

### Q: 为什么前端没有直接调用模型 API？

A: 为了避免前端直接暴露密钥，所有模型请求统一通过 Node 代理 `server/index.mjs` 进行转发，属于更安全的实现方式。

### Q: 没有 AI Key 时还可以演示吗？

A: 可以。系统会自动回退本地模拟引擎，保留项目流程与 AI 审稿演示能力。

### Q: 数据会不会丢失？

A: 默认会保存在浏览器 localStorage 中。清理浏览器缓存或 localStorage 后，数据可能被重置。

## 后续扩展建议

- 接入真实后端数据库（例如 PostgreSQL / MySQL）
- 将项目/达人/审核记录落库并支持多用户协作
- 接入真实媒体素材库、飞书/Notion 文档同步、发布系统
- 扩展权限体系（品牌方、运营、达人、审核角色）
- 增加导出报表、统计分析、历史回溯与审计日志

## 备注

这是一个演示型/原型型项目，重点展示 AI 驱动内容执行管理的业务流程和用户体验，便于快速迭代与产品评审。
