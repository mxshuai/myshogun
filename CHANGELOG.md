# Changelog

本文件记录本项目的重要变更。建议在合并或发布前更新 **[Unreleased]**；发版时将对应内容移动到带版本号与日期的章节。

书写可参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，条目类型可使用：**新增**、**变更**、**修复**、**移除**、**文档**。

---

## [Unreleased]

<!-- 在此追加尚未发布的改动 -->

---

## [1.0.0] - 2026-05-13

### 新增

- **AWS Amplify SSR 托管**：集成 `vite-plugin-react-router-amplify-hosting`，新增根目录 `amplify.yml`（产物目录 `.amplify-hosting`）；增加依赖 `@react-router/express`、`compression`、`express`、`morgan`。
- **脚本**：`start` 指向 `build/server/server.mjs`；新增 `preview:amplify` 用于本地模拟 Amplify compute 入口。
- **Git**：忽略构建产物目录 `.amplify-hosting/`。

### 变更

- **Layout / Section**：Section 的 margin、padding 支持按 Top / Right / Bottom / Left 配置；增加 **Dimensions**（Min Height / Max Width，px）；Section spacing 可通过「Default / Custom」折叠高级边距编辑。
- **HTML 导出**：`convert-to-html` 使用与画布一致的 Layout + Section 包裹层（含 cell 纵向 padding、Section 外边距与内边距、尺寸）。
- **编辑器**：暂时隐藏工具栏「View Page」按钮（逻辑与模态框保留）。

### 修复

- 恢复 `app/lib/resolve-visbuild-path.server.ts`，保证 SSR 路由下编辑路径解析正常。

### 移除 / 回退

- 纯静态（SPA）部署实验相关改动已回退，项目维持 **React Router SSR**；删除误置于 `public/` 下用于 SPA 的种子 JSON 副本。

### 文档

- 新增本 `CHANGELOG.md`。
