# Meta42 博客站点

基于 [Nimbus](https://nimbus-docs.com)（Cloudflare Astro 文档框架）的个人站点：**调研 · 深度思考 · 知识库**。当前以博客（`/blog`）为主体，文档区在逐步建设中。

站点已发布在 **https://iodone.github.io/**。

本目录在磁盘上位于私有知识工作区 `system-weaver` 内（`contexts/blog/`），但它**属于另一个仓库**：
公开的 `iodone/iodone.github.io`，并已被 system-weaver 忽略。
素材从这里进来，公开内容从那边出去——细节见「部署发布」。

## 本地运行

```bash
pnpm install        # 首次
pnpm dev            # 开发服务器（默认 http://localhost:4321）
pnpm build          # 生产构建，静态产物输出到 dist/
pnpm preview        # 本地预览构建产物
pnpm typecheck      # astro check 类型检查
pnpm lint:docs      # Nimbus 内容规范检查
```

## 部署发布（GitHub Pages）

- 站点地址：**https://iodone.github.io/**
- 发布方式：GitHub Pages，由 Actions 构建；源码在独立公开仓库 `iodone/iodone.github.io`。

两个仓库分工不同，别搞混：

| 仓库 | 内容 | 可见性 |
| :--- | :--- | :--- |
| `iodone/iodone.github.io` | 本站源码（就是当前这个目录） | 公开 |
| `iodone/system-weaver` | 私有知识工作区，本站素材的来源 | 私有 |

`contexts/blog/` 已于 2026-09-30 加入 system-weaver 的 `.gitignore`。
两个仓库历史互相独立：一个存笔记，一个存公开内容。

### 推送即发布

`main` 上只要有推送，`.github/workflows/deploy.yml` 就构建并发到 Pages，没有别的步骤：

```bash
git add -A
git commit -m "post: 新增 xxx"
git push
```

工作流做三件事，和本地跑的是同一条命令：

1. `pnpm install --frozen-lockfile`
2. `pnpm exec nimbus-docs check` —— 免构建自检（环境 / 结构 / 写作规范 / 类型 / 迁移），
   内容或配置有问题时**先失败**，不会把坏站点推上去；
3. `pnpm build`，再把 `dist/` 交给 Pages。

进度看仓库的 **Actions** 标签页，通常一分钟内完成。

**为什么不需要 `base`**：仓库名恰好是 `iodone.github.io`，属于 GitHub 的「用户站点」，
发布在域名根。若改成项目仓库（`iodone.github.io/REPO/`），`astro.config.ts` 要加 `base`，
且所有内部链接需复验——代码里已用 `withBase()` 包裹，但那是迁移，不是开关。

### 首次配置（已完成，换账号时参考）

```bash
gh repo create iodone.github.io --public --source=. --push
# 关键一步：让 Pages 用 Actions 构建，而不是从某个分支直接发
gh api -X POST repos/iodone/iodone.github.io/pages -f build_type=workflow
```

`main` 之外的分支推送不会触发发布；`workflow_dispatch` 也开着，可在 Actions 页面手动跑。

### 回滚

Pages 发布的是不可变 artifact，回滚就是重新发一次旧提交：

```bash
git revert <bad-commit>
git push
```

### 备选：Cloudflare

`wrangler.jsonc` 还在，`pnpm deploy` 仍然可用。产物是同一份静态 `dist/`，
换平台只是换发布通道，不影响站点本身。当前不用。

---

## 面向 agent 的产出（AI-native）

Nimbus 的价值有一半不在页面上——它同时**面向人和 agent**。
下面这些路由不是装饰，是给模型读的。改页面时**别顺手把它们弄丢**。

| 路由 | 作用 |
| :--- | :--- |
| `/llms.txt` | 站点级索引，指向下面这些 |
| `/llms-full.txt` | 全部可发现页面的合集，一个文件读完整个站点（当前约 146 KB） |
| `/<page>/index.md` | 每个页面的 markdown 原文，去掉 HTML 壳 |
| `/blog/llms.txt` | blog 集合的索引 |
| `/nimbus-api/coordinates.json` | 页面坐标清单 |
| `/robots.txt`、`/sitemap-index.xml` | 常规发现入口 |

此外每页头部会注入一段给 agent 的指令（Nimbus 的 `AgentDirective`），
告诉模型这是什么站、去哪取 markdown 版本。

**这些都依赖 `astro.config.ts` 的 `site`**——里面存的是绝对 URL。
`site` 错了，`llms.txt` 里的链接就全错。这也正是构建日志里那条 `site` WARN 一直盯的东西。

### 改完页面后的自查

```bash
pnpm build
ls dist/llms.txt dist/llms-full.txt dist/nimbus-api/coordinates.json   # 1. 还在吗
grep -o "https://[a-z0-9.]*" dist/llms.txt | sort -u                    # 2. 域名对吗
```

再看构建日志里的 `Indexed N pages`：应等于「docs 页面数 + 文章数」（当前 1 + 3 = 4）。
**数字不涨，说明新页面没进索引**——多半是没加 `data-pagefind-body`（见「已知的坑」）。

Nimbus 还自带一个免构建的自检，改完配置或升级后跑一次很值：

```bash
pnpm exec nimbus-docs check
```

---

## 升级 Nimbus

`nimbus.json` 里有两个版本号，**含义不同，别搞混**：

| 字段 | 当前值 | 含义 |
| :--- | :--- | :--- |
| `version` | `0.7.7` | 模板版本（脚手架生成时的），与 `templatesTag` 对应 |
| `lastReviewedNimbusVersion` | `0.15.0` | 最后一次人工适配过的框架版本 |

实际装的框架版本看 `package.json` 里的 `@cloudflare/nimbus-docs`（当前 `^0.15.0`）。

### 升级路径

Nimbus 不靠人肉抄代码升级，它自带一套工具：

```bash
pnpm exec nimbus-docs outdated   # ① 列出过期的模板文件 / registry 项 / 待迁移的包 API
pnpm exec nimbus-docs migrate    # ② 计划并应用已知的包 API 迁移（加 --dry-run 先看）
pnpm exec nimbus-docs diff       # ③ 逐文件看上游与本地改动的差异（只读）
pnpm exec nimbus-docs check      # ④ 免构建自检：环境 + 结构 + 写作规范 + 类型 + 迁移
```

加框架功能也走同一套 registry，不要手抄：

```bash
pnpm exec nimbus-docs list --type feature   # 看有哪些配方
pnpm exec nimbus-docs add <slug>            # 安装；--overwrite 会用上游版本覆盖同名文件
```

升框架本身：

```bash
pnpm add @cloudflare/nimbus-docs@latest
pnpm exec nimbus-docs check
pnpm build && pnpm typecheck
```

### 升级后必须复验的三件事

1. **构建与类型** —— `pnpm build && pnpm typecheck`（当前基线：14 页、0 错 0 警）。
2. **agent 产出** —— 上一节的四条自查命令。
3. **本项目自己加的东西**。它们在框架之外，升级最容易踩到：

   | 文件 | 为什么容易坏 |
   | :--- | :--- |
   | `src/lib/nav.ts` | 导航唯一真源，`NAV` 数组 |
   | `src/layouts/BlogLayout.astro` | 自定义顶部导航 + 移动端导航条 |
   | `src/layouts/BaseLayout.astro` | 三行字体 import（Newsreader） |
   | `src/styles/globals.css` | `--nb-*` token 与字体栈 |
   | `src/styles/prose.css` | 末尾「Mixed typesetting」段 |
   | `src/components/blog/*` | 列表 / 条目 / 页头，Props 是本项目定义的 |
   | `src/components/ui/toc/*` | 官方大纲组件，可见文案已中文化（`本页目录` 等） |
   | `src/pages/{tags,archive}*` | 本项目新增的派生页 |

   另外 `Header.astro` 与 `ui/*` 虽是官方组件，但调用方式被本项目改过（多传了 `sections`），
   所以用 `add --overwrite` 覆盖官方文件**之前先 `diff` 一遍**。

   升级后若页面版式变了，**先查上面这八个地方**。

---

## 发布工作流（手动、逐篇、无自动同步）

⚠️ **发布是刻意为之的决定，不是自动流程。** 素材来源都在本目录之外的 workspace 中：

| 素材来源 | 内容 |
| :--- | :--- |
| `../thought_review/*.md` | 深度分析、架构讨论、方法论拆解 |
| `../survey_sessions/*.md` | 调研记录、阶段性结论 |
| `../../wiki/pages/*.md` | 知识库页面 |

**绝大多数材料是私有的，不应公开。** 没有任何批量导入或自动同步机制——每篇文章都必须人工挑选、改写、审阅后才会进入本站点。

发布步骤：

1. **挑选** — 从上表目录中选定一份值得公开的材料。
2. **改写** — 脱敏、重组结构、去掉内部语境，改写为面向公开读者的独立文章。
3. **建骨架** — `pnpm new:post --title "文章标题" --tags "tag1,tag2"`（见下节）。
4. **粘贴正文** — 把改写后的正文填入生成的 `src/content/blog/<slug>.mdx`。
5. **审阅** — 再读一遍：确认没有内部信息、没有夸大表述；`date`/`tags`/`description` 正确。
6. **构建验证** — `pnpm build`，确认页面渲染正常后发布。

### 从工作区草稿导入（推荐）

`contexts/` 下的调研 / 思考 / wiki 文档已经写好了，不需要重写一遍：

```bash
pnpm import:post ../survey_sessions/hawdb_architecture_survey_20260923.md   --tags "数据库,架构,调研"   --description "一句话摘要"
```

| 参数 | 说明 |
| :--- | :--- |
| `<source.md>` | 必填。工作区里的源文档路径 |
| `--title` | 可选，默认取源文档首个 H1；源文档没有 H1 时取文件名 |
| `--date` | 可选，默认从文件名取日期（`2026-09-21-x.md` 和 `x_20260921.md` 都认） |
| `--tags` | 可选，逗号分隔 |
| `--description` | 可选，默认自动摘正文首个段落；建议手写 |
| `--slug` | 可选，默认由文件名去掉日期前缀生成 |
| `--force` | 可选，覆盖同名文件（不加则拒绝覆盖并退出非零） |

行为：剥掉源文档开头的一级标题（避免和 frontmatter 的 `title` 重复），正文**一个字符不改**。
源码见 `scripts/import-post.mjs`。

> 导入是**复制**，不是同步。源文档之后的修改不会回流到 blog，blog 的修改也不回写源文档。
> 这是刻意的——发布是一篇一篇的编辑决定，不是自动管线。

### 新建文章骨架

```bash
pnpm new:post --title "开始写博客"
pnpm new:post --title "My Post" --date 2026-09-29 --tags "meta,note" --slug my-post
```

| 参数 | 说明 |
| :--- | :--- |
| `--title` | 必填。文章标题（可含中文） |
| `--date` | 可选，`YYYY-MM-DD`，默认今天（Asia/Shanghai） |
| `--tags` | 可选，逗号分隔，默认空 |
| `--slug` | 可选，覆盖自动生成的 slug |
| `--force` | 可选，覆盖已存在的同名文件（不加则拒绝覆盖并退出非零） |

slug 规则：保留中文，空白转 `-`，去掉不安全文件名字符（`\ / : * ? " < > |`），ASCII 小写。脚本零依赖（仅 `node:fs` / `node:path`），源码见 `scripts/new-post.mjs`。

## Frontmatter 参考

```yaml
---
title: 文章标题          # 必填
description: 一句话摘要   # 可选；用于 RSS、OG 卡片与列表
date: 2026-09-29         # 必填；驱动时间线倒序与日期标记
tags: ["meta", "note"]   # 可选，字符串数组，默认 []；驱动标签筛选
---
```

以下字段由 Nimbus 文档 schema 继承，按需使用：

| 字段 | 说明 |
| :--- | :--- |
| `draft` | `true` 时不发布——不进时间线、不进 RSS、不生成页面 |
| `noindex` | `true` 时页面保留但声明不进搜索引擎 |
| `socialImage` | 自定义 OG 图（默认用自动生成的卡片） |
| `head` | 追加到页面 `<head>` 的元素列表 |

### 草稿机制

`draft: true` 是官方支持的字段（`docsCollection` schema 自带，默认 `false`）。文章可以先以草稿状态提交进仓库：正文就位但未定稿时设 `draft: true`，即从时间线、RSS、llms.txt 中消失；生产构建也不会生成该文章的页面。`pnpm dev` 下可通过单篇 URL（`/blog/<slug>`）直接预览，方便边写边看。定稿后删掉该行即发布。适合"改写完成但还在审"的中间状态。

## 目录速览

```
src/content/blog/         # 文章（.md 或 .mdx 均可）
src/pages/blog/           # 时间线、单篇、分页、RSS、markdown alternate
src/pages/tags/           # 标签索引 /tags + 单标签页 /tags/<tag>
src/pages/archive.astro   # 归档页，按年 / 月分组
src/components/blog/      # 时间线组件（nb-cl-* 类名）
src/components/ui/toc/    # 右侧大纲栏（TOC / MobileTOC，文章页用，已中文化）
src/lib/nav.ts            # 顶部导航（唯一真源）
src/styles/globals.css    # 配色 + 字体 + 字号 token（--nb-*）
src/styles/prose.css      # 正文排版 + 混排规则
.github/workflows/deploy.yml  # 推送 main 即构建并发布到 GitHub Pages
public/.nojekyll          # 防止 Jekyll 忽略 _astro/（Actions 模式下也无害）
scripts/new-post.mjs      # 建文章骨架脚本（空模板）
scripts/import-post.mjs   # 从工作区文档导入（保留原文）
```

站点配置在 `astro.config.ts`（标题、描述、locale、站点域名等）。
部署配置在 `.github/workflows/deploy.yml`，升级路径见「升级 Nimbus」。

## 设计决策

风格是「编辑部」调性：**正文衬线，控件无衬线，代码等宽**。这不是装饰偏好，是有边界的：
衬线用来读，无衬线/等宽用来核对。两者混错了，长文会累眼，表格会错行。

| 决定 | 落在哪 | 怎么改 |
| :--- | :--- | :--- |
| 正文衬线 | `prose.css` 末尾「Mixed typesetting」段 | 删掉那段即回到全站无衬线 |
| 配色（暖纸 / 暖炭 + 陶土色强调） | `globals.css` 的 `:root` 与 `[data-mode="dark"]` | 改 `--nb-*` token，别改组件 |
| 字号阶梯 | `globals.css` 的 `--nb-h1-size` 等 | 同上 |
| 顶部导航 | `src/lib/nav.ts` 的 `NAV` 数组 | 加一行即多一个 tab，active 态自动推导；全站（文章 / 标签 / 归档 / 首页 / 文档 / 404）共用这一套 |
| 列表形态（全摘要卡片） | `BlogFeed` 的 `leadFirst` prop | 默认 `false`，每个列表都是摘要卡片；传 `true` 才恢复「最新一篇全文内联」的混合形态 |
| 文章页右侧大纲 | `BlogLayout` 的 `headings` prop | 文章页传 `getTOC(headings)` 就出现右侧栏，不传即原来的单栏；移动端由 `MobileTOC` 下拉接手 |

**字体**：拉丁部分自托管 Newsreader（`@fontsource-variable/newsreader`，含 optical size 与斜体）；
中文**走系统宋体栈**（Songti SC / 思源宋体 / SimSun），不下载中文字体。
`@fontsource/noto-serif-sc` 解包 87MB，全量进 `dist` 不现实。
代价是中文渲染随平台略有差异（都是宋体调性，但字形不同）。
若哪天要像素级一致：用 `pyftsubset` 按实际用字裁剪，产物通常几百 KB，挂到 `public/fonts/` 再补 `@font-face` 即可。

**导航的可扩展性**：`NAV` 是普通数组，`navSections()` 只做「本页或其子路径算 active」，全站四处 `<Header>` 调用点都传它，所以只改一处。
后面加产品页（`/products/...`）、slide（`/slides/...`）各自只需加一行 + 一个页面，导航逻辑不用动。

**标签页和归档页是派生的，不手工维护**：`/tags` 与 `/tags/<tag>` 的标签集合来自所有文章的
frontmatter，归档页的年月分组来自 `date`。加一篇文章或改一个标签，这些页面自动跟上。

## 七个已知的坑

### 1. 增删文章后偶发构建失败 → 清内容缓存

Astro 的内容层会把已解析的条目缓存在 `.astro/` 和 `node_modules/.astro/data-store.json`。
**删除或重命名** `src/content/**` 下的文件后，缓存里仍指着一个已不存在的模块，构建会报：

```
Rolldown failed to resolve import
"astro:content-layer-deferred-module?...&fileName=src%2Fcontent%2Fdocs%2Findex.mdx..."
```

这不是代码错误，是陈旧缓存。清掉即可：

```sh
rm -rf .astro node_modules/.astro dist && pnpm build
```

纯新增文章、只改正文时不会触发。

**顺带一个信号**：脏工作区里构建，CSS 产物会虚胖。本站实测过同一份源码——
脏目录下 `nav.*.css` 约 149 KB，`rm -rf .astro node_modules/.astro dist` 之后重建只有约 69 KB，
且与 CI 产物**哈希一致**。所以 CSS 体积突然翻倍，是清缓存的信号，不是样式变多了。

### 2. `site` 决定所有绝对 URL

`astro.config.ts` 的 `site` 现在是 `https://iodone.github.io`。
它驱动 canonical URL、OG 图的绝对地址、robots.txt、sitemap，以及 `llms.txt` / RSS 里的链接。
**域名变更时必须同步改它**，否则这些输出全部指错。
若同时换成项目仓库（`iodone.github.io/REPO/`），还得一并加 `base`。

「面向 agent 的产出」那一节列的所有路由都依赖它，改完记得跑一遍那里的自查。

### 3. dev server 不会吃到新增的内容文件

往 `src/content/blog/` 里加了新文件后，`pnpm dev` 常不会重新解析内容集合——
页面还是旧的（表现为 `/blog` 的体积和条目不随新文章变化）。重启即可：

```sh
pkill -f "astro dev"; pnpm dev --port 4321
```

和上面的构建缓存是同一类问题。**构建产物（`pnpm build`）总是对的**，
所以拿不准时用 `pnpm build && pnpm preview` 复核。

### 4. 搜索只索引文章详情页

Pagefind 只索引带 `data-pagefind-body` 的页面。Nimbus 默认只给 docs 版式加这个属性，
blog 的列表页和文章页都没有——所以搜索一度什么都搜不到（只索引到 1 页 68 词）。

现在 `src/pages/blog/[...slug].astro` 的 `<article>` 上加了 `data-pagefind-body`，文章详情页进索引；
`/blog` **故意不加**——列表只有摘要卡片，索引它只会往搜索结果里塞一堆重复的短条目，
正文的权威副本在详情页。
构建时看 `Indexed N pages` 校验，应为「docs 页数 + 文章数」。

### 5. 一旦打开 `leadFirst`，最新一篇的体量就是首页的体量

`/blog` 现在**全部走摘要卡片**，首页只受篇数影响（三篇约 30KB）。
但 `BlogFeed` 的 `leadFirst` 开关还留着——传 `true` 就回到混合形态：最新一篇全文内联，
首页大小立刻由那一篇决定，119KB 的 HawDB 会让首页涨回约 236KB。

要恢复混合形态，先确认能接受这个代价；否则给首篇加视觉截断
（`max-height` + 渐变 + 「阅读全文」），正文仍在 DOM 里，对 SEO 无损。

### 6. `--overwrite` 覆盖官方组件会静默丢掉自定义导航

`pnpm exec nimbus-docs add <slug> --overwrite` 会用上游版本覆盖同名文件。
`Header.astro` 的调用方式被本项目改过（四处调用点都多传了 `sections` 用于渲染自定义顶部导航），
`ui/toc/{TOC,MobileTOC}.astro` 的可见文案也换成了中文。
直接覆盖会在**不报任何错**的情况下丢掉顶部导航，或者把目录栏文案退回英文。

覆盖前先看差异：

```bash
pnpm exec nimbus-docs diff src/components/Header.astro
```

### 7. 目录栏的体量随标题数线性增长

文章页的右侧大纲由官方的 `<TOC>` 渲染，每条链接都自带一长串 Tailwind class，
平均约 **900 字节**（桌面栏与移动端 `<select>` 各放一份标题）。实测：

| 文章 | h2/h3 数 | 原始体积 | gzip |
| :--- | ---: | ---: | ---: |
| HawDB 调研 | 103 | 227 KB → 321 KB | 65 KB → 76 KB（+11 KB） |
| 私域对比 | 21 | 44 KB → 63 KB | 15 KB → 17 KB（+2 KB） |
| 连线拓扑 | 9 | 32 KB → 41 KB | 10 KB → 11 KB（+1 KB） |

gzip 后净增最多 11 KB，可以接受。真正该留意的是**可读性**：18rem 的栏里塞 103 条导航已经偏密。
嫌密就把 `src/pages/blog/[...slug].astro` 里的
`getTOC(headings, { minHeadingLevel: 2, maxHeadingLevel: 3 })` 收成只到 h2。

同源的一个坑：`BlogLayout` 的外壳只有在**确实有目录**时才加宽到 `xl:max-w-[68rem]`
（用 `class:list` 条件拼出来），因为 44rem 才是正文的中文阅读宽度。
哪天改成无条件加宽，列表页没有右侧栏却会被撑到 64rem，正文宽度直接失控。
