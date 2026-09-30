# AGENTS.md — 在这个站点上干活

> 这份文件讲**这个站点自己的规矩**：怎么加文章、怎么发布、什么不要碰。
> `AGENT.md`（单数）是 Nimbus 框架自带的指南，讲的是框架层（组件注册、registry、`migrate`）。
> 两者都读；冲突时以本文件为准。`CLAUDE.md` 转发到 `AGENT.md`。

**站点**：Meta42（调研 · 深度思考 · 认知）— <https://iodone.github.io/>
**技术栈**：Nimbus（`@cloudflare/nimbus-docs`）/ Astro，静态输出，GitHub Pages。

## 0. 先记住三件事

1. **发布 = 推 `main`。** `.github/workflows/deploy.yml` 自动构建并发布到 Pages。没有 staging、没有草稿分支——在 `main` 上的每次提交都会上线。
2. **内容是人工挑选的，没有自动同步。** 不存在"从某处导入一批"的机制。每篇文章都要逐篇写、逐篇审。
3. **顶部导航的唯一真源是 `src/lib/nav.ts`。** 别在别处硬编导航项。

## 1. 新增一篇文章

```bash
# 建空骨架
pnpm new:post --title "文章标题" --tags "tag1,tag2"
pnpm new:post --title "My Post" --date 2026-09-29 --tags "meta,note" --slug my-post

# 从已有的 markdown 文件导入（复制，之后两边各自演化，不回流）
pnpm import:post path/to/draft.md --tags "tag1,tag2" --description "一句话摘要"
```

导入脚本会剥掉源文件开头的 H1（避免和 frontmatter 的 `title` 重复），正文一个字符不改。
两个脚本都支持 `--force` 覆盖同名文件；不加则拒绝覆盖并非零退出。

**frontmatter** — 文章落在 `src/content/blog/<slug>.md`：

| 字段 | 必需 | 说明 |
| :--- | :--- | :--- |
| `title` | ✅ | 页面 H1 由它生成，**正文里不要再写 H1** |
| `date` | ✅ | `YYYY-MM-DD`；驱动倒序排列和日期标记 |
| `description` | — | 一句话摘要，用于列表 / RSS / OG 卡片。**手写**，脚本自动摘的通常不好 |
| `tags` | — | 字符串数组；驱动标签筛选，`/tags` 从它派生 |

`draft: true` 让文章留在仓库里但不发布：不进时间线、不进 RSS、不进 `llms.txt`、不生成页面；
`pnpm dev` 下仍可用单篇 URL 预览。定稿后删掉那一行即发布。

## 2. 更新一篇文章

直接改 `src/content/blog/<slug>.md` 的正文。

⚠️ **改文件名 = 改 URL = 旧链接 404。** 调整内容就改正文，不要改 slug。本项目没有重定向机制，真要改 slug 得自己负责旧链接。

`/tags`、`/archive` 是**派生页**，不用手工维护——标签集合来自所有文章的 frontmatter，年月分组来自 `date`，加一篇文章就自动跟上。

「关于」页是 `docs` 集合，在 `src/content/docs/about.mdx`。

## 3. 发布

```bash
pnpm build                # 先本地确认能构建
git add -A
git commit -m "post: 新增 xxx"
git push
```

CI 跑三步，和本地同源：

1. `pnpm install --frozen-lockfile`
2. `pnpm exec nimbus-docs check` — 免构建自检。内容或配置有问题时**先失败**，坏站点不会上线
3. `pnpm build` → `dist/` 交给 Pages

进度看仓库 **Actions** 页，通常一分钟内完成。

**回滚**：Pages 发布的是不可变 artifact，`git revert <bad-commit> && git push` 即回退。

## 4. 提交前必跑

```bash
pnpm exec nimbus-docs check    # 五项：Environment / Structure / Migrations / Authoring / Types，应全 ✓
pnpm build                     # 基线：14 页，Pagefind 索引 4 页
pnpm typecheck                 # 基线：117 文件，0 错 0 警 0 提示
```

构建日志里的 `Indexed N pages` 应等于「docs 页数 + 文章数」——**数字没涨说明新页面没进索引**（多半是缺 `data-pagefind-body`）。

## 5. 想改什么，改哪里

| 想改 | 改这里 |
| :--- | :--- |
| 站点标题 / 描述 / 域名 | `astro.config.ts` |
| 顶部导航项 | `src/lib/nav.ts` 的 `NAV` 数组（加一行即多一个 tab） |
| 配色 / 字号阶梯 | `src/styles/globals.css` 的 `--nb-*` token（**改 token，别改组件**） |
| 正文排版、中英混排 | `src/styles/prose.css` |
| 列表卡片 / 条目 / 页头 | `src/components/blog/` |
| 文章页版式（双栏 + 右侧大纲） | `src/layouts/BlogLayout.astro` |
| 大纲收纳到第几级标题 | `src/pages/blog/[...slug].astro` 的 `getTOC(...)` |
| 每页文章数 | `src/pages/blog/index.astro` **和** `src/pages/blog/page/[page].astro`（两处 `PAGE_SIZE`，必须一起改） |
| 标签页 / 归档页 | `src/pages/tags/`、`src/pages/archive.astro` |
| 字体 | `src/layouts/BaseLayout.astro` 的 import + `globals.css` 的 `--nb-font-serif`。**换西文衬线前先看坑 7；新增页面级 `<h1>` 看坑 9** |

## 6. 这个项目自己加的东西（升级框架时最容易踩）

`nimbus-docs` 升级不会碰 `src/` 下我们自己的东西：

| 文件 | 它是什么 |
| :--- | :--- |
| `src/lib/nav.ts` | 顶部导航唯一真源 |
| `src/layouts/BlogLayout.astro` | 博客版式：条件加宽的双栏外壳 + 右侧大纲 |
| `src/layouts/BaseLayout.astro` | 字体 import |
| `src/styles/globals.css` | `--nb-*` token 与字体栈 |
| `src/styles/prose.css` | 末尾「Mixed typesetting」混排段 |
| `src/components/blog/*` | 列表 / 条目 / 页头，Props 是本项目定义的 |
| `src/pages/{tags,archive}*` | 派生页 |
| `src/components/ui/toc/*` | 官方大纲组件，可见文案已中文化 |

`src/components/Header.astro` 与 `src/components/ui/toc/*` 虽是官方组件，但**调用方式和文案被本项目改过**
（多处 `<Header>` 调用点都多传了 `sections`）。用 `nimbus-docs add <slug> --overwrite` 覆盖官方文件**之前先 diff**，
否则会在不报任何错的情况下丢掉顶部导航或目录栏文案：

```bash
pnpm exec nimbus-docs diff src/components/Header.astro
```

## 7. 已知的坑

**1. 删 / 改内容文件后构建失败 → 清缓存。**
纯新增文章、只改正文不会触发；**删除或重命名** `src/content/**` 下的文件后，Astro 内容层缓存会指向已不存在的模块：

```sh
rm -rf .astro node_modules/.astro dist && pnpm build
```

顺带一个信号：脏工作区里构建 CSS 产物会虚胖（实测约 149KB vs 干净重建约 69KB，且干净产物与 CI 哈希一致）。体积突然翻倍是清缓存的信号，不是样式变多了。

**2. dev server 不吃新增的内容文件。**
往 `src/content/blog/` 加了新文件后页面常不更新，重启即可：

```sh
pkill -f "astro dev"; pnpm dev --port 4321
```

**构建产物总是对的**——拿不准就用 `pnpm build && pnpm preview` 复核。

**3. `site` 决定所有绝对 URL。**
`astro.config.ts` 的 `site` 驱动 canonical、OG 图地址、robots、sitemap，以及 `llms.txt` / RSS 里的链接。改域名必须同步改它，否则这些输出全部指错。

**4. 搜索只索引带 `data-pagefind-body` 的页。**
文章详情页有；`/blog` 列表页**故意没有**——列表全是摘要卡片，索引它只会往搜索结果里塞重复的短条目，正文的权威副本在详情页。

**5. 文章页大纲的体量随标题数线性增长。**
每条链接约 900 字节（桌面栏与移动端 `<select>` 各一份）。实测 103 个 h2/h3 的文章，gzip 后净增约 11KB。嫌密就把 `getTOC` 的 `maxHeadingLevel` 收到 2。

同源的一个点：`BlogLayout` 的外壳只在**确实有目录时**才加宽到 `xl:max-w-[68rem]`（`class:list` 条件拼接）——44rem 才是正文的中文阅读宽度。改成无条件加宽，会让没有右侧栏的列表页被撑到 64rem。

**6. `leadFirst` 一旦打开，首页体量由最新一篇决定。**
默认关（所有列表都是统一摘要卡片）。传 `true` 会回到「最新一篇全文内联」，119KB 的文章会让首页涨到约 236KB。

**7. 换西文衬线字体，先量 x 高配平，别按好看选。**
正文的衬线是「西文用自托管字体 + 中文回退到平台宋体」的组合。两者同为 17px，但汉字墨高约 12.6px，西文小写的高度（x 高）决定它看起来是同级还是小一号：

| 西文（配 Songti SC） | x 高 | 汉字/x高 |
| :--- | ---: | ---: |
| Newsreader（原用） | 7.4 | **1.71** |
| Georgia | 8.2 | 1.53 |
| Lora | 8.5 | 1.48 |
| Source Serif 4 | 8.8 | 1.43 |
| **Noto Serif（现用）** | **9.1** | **1.38** |

比值越接近 1 越齐，1.71 是本表的离群值——小写字母明显比中文矮一档，这正是「中英混排看着乱」的头号来源，**跟空格多少无关**。换字体后用同一张表复核，别只看截图。

**8. `text-autospace` 的 `normal` 不是默认值，两条声明也不能调换顺序。**
Chrome 140 实测：不写是 174.82px，写 `normal` 179.07px，写 `no-autospace` 174.82px——**默认关，`normal` 才是开**。但 CSS Text 4 把 `normal` 定义为 no-autospace，所以 `prose.css` 里写了两条：先 `normal`（今天生效），再 `ideograph-alpha ideograph-numeric`（规范拼法，Chrome 现在解析不了会丢弃）。**调换顺序会让将来符合规范的引擎把间距关掉。**

另外实测两件事，免得误判它的作用：文章里**已经有空格的边界它不会再加一层**（差值 0.00px）；现有文章 1137 处中英边界全部是作者自己敲的空格，紧贴的 0 处——所以它对当前内容是**零影响**，纯粹是给未来漏敲空格的内容兜底。整篇正文高度开关前后完全一致（71078.5px）。

Firefox 没有对应属性，那边就退回今天的样子。

**9. 页面级 H1 不会自动继承衬线——谁写标签谁负责带上 `font-serif`。**
正文的衬线规则只作用于 `.docs-content` 内部（`prose.css`），而所有页面大标题都写在 `.docs-content` **外面**，必须自己声明字族。`IndexHeader.astro` 的注释把约定写明了：站点每个页面级 H1 都用衬线，读起来才是「编辑部」而不是工具页。

2026-09-30 全站核查：7 个 `<h1>` 里 **5 个漏了 `font-serif`**（首页、三篇文章页、`/about/`、404，以及分页的 `/blog/page/N`——它要等文章超过 20 篇才会暴露），只有 `/blog/`、`/tags/`、`/archive/` 是对的。因为 H1 直接落到 `html` 的 `--nb-font-sans`，标题会变成无衬线 Inter，跟同页 h2/h3 打架。

**新增任何 `<h1>`，照 `IndexHeader.astro` 的样子写：**

```astro
<h1
  class="m-0 font-serif text-balance leading-[1.1] text-foreground"
  style="font-size:var(--nb-h1-size);font-weight:var(--nb-h1-weight);letter-spacing:var(--nb-h1-tracking)"
>
```

刻意保持无衬线的是 UI chrome，别顺手改：`.nb-cl-date`、`.nb-cl-more`、侧栏 TOC 标签（`本页目录`，14px）、`404` 之外的框架组件。

## 8. 不要做

- 不要手工编辑 `dist/` —— 它是构建产物
- 不要在正文里重复写 H1（`title` 已经生成了）
- 不要在没跑 `pnpm build` 的情况下推 `main`
- 不要为了在 `.mdx` 里用组件而改 `src/components.ts` 绕过注册
- 不要直接 import `.mdx` —— 用 `<Render file="..." />`
- 不要把文章放进 `docs` 集合；文章一律进 `src/content/blog/`
- 不要移除 `BaseLayout.astro` 里的 `<AgentDirective />`（它负责把 agent 指向 `/llms.txt`）
- 不要在页面级 `<h1>` 上漏掉 `font-serif`（见坑 9，它不会从正文继承）
