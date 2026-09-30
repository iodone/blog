# Meta42

[Nimbus](https://nimbus-docs.com)（Cloudflare 的 Astro 文档框架）驱动的个人站点：**调研 · 深度思考 · 认知**。
当前以博客（`/blog`）为主体，文档区在逐步建设中。

站点已发布在 **https://iodone.github.io/**。

## 本地运行

```bash
pnpm install        # 首次
pnpm dev            # 开发服务器（默认 http://localhost:4321）
pnpm build          # 生产构建，静态产物输出到 dist/
pnpm preview        # 本地预览构建产物
pnpm typecheck      # astro check 类型检查
pnpm lint:docs      # Nimbus 内容规范检查
```

## 两种阅读模式：人看页面，agent 读 markdown

这个站同时面向**人和 agent**——这不是附加功能，是 Nimbus 的一半价值所在。
下面这些路由就是给模型读的，改页面时**别顺手把它们弄丢**。

| 路由 | 作用 |
| :--- | :--- |
| `/llms.txt` | 站点级索引，指向下面这些 |
| `/llms-full.txt` | 全部可发现页面的合集，一个文件读完整个站点 |
| `/<page>/index.md` | 每个页面的 markdown 原文，去掉 HTML 壳 |
| `/blog/llms.txt` | blog 集合的索引 |
| `/nimbus-api/coordinates.json` | 页面坐标清单 |
| `/robots.txt`、`/sitemap-index.xml` | 常规发现入口 |

此外每页头部会注入一段面向 agent 的指令，告诉模型这是什么站、去哪取 markdown 版本。

**这些全部依赖 `astro.config.ts` 里的 `site`**——它存的是绝对 URL。
`site` 错了，`llms.txt` 里的链接就全错。

改完页面后自查：

```bash
pnpm build
ls dist/llms.txt dist/llms-full.txt dist/nimbus-api/coordinates.json   # 1. 还在吗
grep -o "https://[a-z0-9.]*" dist/llms.txt | sort -u                    # 2. 域名对吗
```

再看构建日志里的 `Indexed N pages`：应等于「docs 页数 + 文章数」。数字不涨，说明新页面没进索引。

## 发布

### 推送即发布

`main` 上只要有推送，`.github/workflows/deploy.yml` 就构建并发到 GitHub Pages，没有别的步骤：

```bash
git add -A
git commit -m "post: 新增 xxx"
git push
```

工作流做三件事，和本地跑的是同一条命令：

1. `pnpm install --frozen-lockfile`
2. `pnpm exec nimbus-docs check`——免构建自检（环境 / 结构 / 写作规范 / 类型 / 迁移），
   内容或配置有问题时**先失败**，不会把坏站点推上去；
3. `pnpm build`，再把 `dist/` 交给 Pages。

进度看仓库的 **Actions** 标签页，通常一分钟内完成。

**为什么不需要 `base`**：仓库名恰好是 `iodone.github.io`，属于 GitHub 的「用户站点」，
发布在域名根。若改成项目仓库（`iodone.github.io/REPO/`），`astro.config.ts` 要加 `base`，
且所有内部链接需复验——代码里已用 `withBase()` 包裹，但那是迁移，不是开关。

### 新增一篇文章

```bash
pnpm new:post --title "文章标题" --tags "tag1,tag2"
# 或从已有的 markdown 草稿导入（复制，不做同步）
pnpm import:post /path/to/draft.md --tags "tag1,tag2" --description "一句话摘要"
```

文章落在 `src/content/blog/`，frontmatter：

```yaml
---
title: 文章标题          # 必填
description: 一句话摘要   # 可选；用于 RSS、OG 卡片与列表
date: 2026-09-29         # 必填；驱动时间线倒序与日期标记
tags: ["meta", "note"]   # 可选，字符串数组；驱动标签筛选
---
```

`draft: true` 可让文章先留在仓库里但不发布：不进时间线、不进 RSS、不进 `llms.txt`，
也不生成页面（`pnpm dev` 下仍可按单篇 URL 预览）。定稿后删掉该行即发布。

标签页（`/tags`）与归档页（`/archive`）都是派生的，不手工维护——标签集合来自所有文章的
frontmatter，年月分组来自 `date`，加一篇文章就自动跟上。

### 回滚

Pages 发布的是不可变 artifact，回滚就是重新发一次旧提交：

```bash
git revert <bad-commit>
git push
```

另有一组 `wrangler` 脚本（`pnpm deploy`）可以把同一份 `dist/` 发到 Cloudflare，当前不使用。

## 升级 Nimbus

`nimbus.json` 里有两个版本号，**含义不同，别搞混**：

| 字段 | 含义 |
| :--- | :--- |
| `version` | 模板版本（脚手架生成时的），与 `templatesTag` 对应 |
| `lastReviewedNimbusVersion` | 最后一次人工适配过的框架版本 |

实际装的框架版本看 `package.json` 里的 `@cloudflare/nimbus-docs`。

升级不靠人肉抄代码，Nimbus 自带一套工具：

```bash
pnpm exec nimbus-docs outdated   # ① 列出过期的模板文件 / registry 项 / 待迁移的包 API
pnpm exec nimbus-docs migrate    # ② 计划并应用已知的包 API 迁移（加 --dry-run 先看）
pnpm exec nimbus-docs diff       # ③ 逐文件看上游与本地改动的差异（只读）
pnpm exec nimbus-docs check      # ④ 免构建自检：环境 + 结构 + 写作规范 + 类型 + 迁移
```

加框架功能也走同一套 registry，不要手抄：

```bash
pnpm exec nimbus-docs list --type feature   # 看有哪些配方
pnpm exec nimbus-docs add <slug>            # 安装
```

升框架本身：

```bash
pnpm add @cloudflare/nimbus-docs@latest
pnpm exec nimbus-docs check
pnpm build && pnpm typecheck
```

### 升级后必须复验的三件事

1. **构建与类型**——`pnpm build && pnpm typecheck`。
2. **agent 产出**——上一节的两条自查命令。
3. **本项目在框架之外自己加的东西**。升级最容易踩到：

   | 文件 | 为什么容易坏 |
   | :--- | :--- |
   | `src/lib/nav.ts` | 顶部导航的唯一真源（`NAV` 数组） |
   | `src/layouts/BlogLayout.astro` | 博客版式：双栏外壳 + 右侧大纲 |
   | `src/layouts/BaseLayout.astro` | 字体 import |
   | `src/styles/globals.css` | `--nb-*` token 与字体栈 |
   | `src/styles/prose.css` | 末尾「Mixed typesetting」段 |
   | `src/components/blog/*` | 列表 / 条目 / 页头，Props 是本项目定义的 |
   | `src/pages/{tags,archive}*` | 本项目新增的派生页 |

   `Header.astro` 与 `src/components/ui/toc/*` 虽是官方组件，但调用方式与可见文案被本项目改过
   （多传 `sections` 渲染自定义导航、目录文案中文化）。用 `add --overwrite` 覆盖官方文件
   **之前先 `diff` 一遍**，否则会在不报错的情况下丢掉这些改动：

   ```bash
   pnpm exec nimbus-docs diff src/components/Header.astro
   ```

   导航是可扩展的：`NAV` 是普通数组，全站四处 `<Header>` 调用点都传它，加 tab 只改一处；
   后面加产品页（`/products/...`）、slide（`/slides/...`）各自只需加一行 + 一个页面。
