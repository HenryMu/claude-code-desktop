# Claude Code Desktop

**[English](./README.md)** | **[中文](./README.zh-CN.md)** | **[日本語](./README.ja.md)** | **[한국어](./README.ko.md)**

> **社区开源项目** — 这是一个免费、开源的 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI 桌面 GUI 客户端。
> 它 **不是** Anthropic 官方的 [Claude Desktop](https://claude.ai/download) 应用（官方应用需要付费订阅）。
> 本项目基于 MIT 协议开源，与 Anthropic 没有关联、未被背书、也不存在官方联系。

![Electron](https://img.shields.io/badge/Electron-34-black?logo=electron) ![React](https://img.shields.io/badge/React-19-blue?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript) ![License](https://img.shields.io/badge/License-MIT-green)

![截图](./screenshot.png)

## 功能特性

- **会话浏览器** — 自动发现 `~/.claude/projects/` 下的所有 Claude Code 项目和会话
- **实时同步** — 监听 `.jsonl` 会话文件变化，随对话进展自动更新
- **对话视图** — 格式化消息展示，支持折叠的思考块和工具调用卡片
- **终端集成** — 完整的 `xterm.js` 终端，可直接与 Claude Code CLI 交互
- **会话恢复** — 点击任意会话即可通过 `claude --resume <session-id>` 恢复
- **权限提示** — 当 Claude Code 请求工具权限时，显示交互式的 Allow/Always/Deny 按钮
- **跨平台** — 支持 Windows、macOS 和 Linux

## 为什么做这个项目？

Claude Code 是一个极其强大的 CLI 工具 — 但并不是每个人都习惯在终端中工作。

作为开发者，我们希望有一种更直观的方式来管理多个会话、浏览对话历史、统览所有项目。在终端标签页之间来回切换、在长输出中滚动查找信息，效率并不高。

所以我们打造了 Claude Code Desktop — 一个免费、开源的 GUI，封装了你已经熟悉和喜爱的 Claude Code CLI。除了 Claude Code CLI 本身的访问权限外，不需要任何额外订阅。安装、连接、开箱即用。

**目标很简单：** 让 Claude Code 对每个人都更易用、更高效，同时保持 100% 免费和开源。

## 与官方产品的区别

| | Claude Desktop（Anthropic 官方） | Claude Code Desktop（本项目） |
|---|---|---|
| **类型** | Anthropic 官方产品 | 第三方社区项目 |
| **费用** | 需要 Claude Pro / Max 订阅 | **免费 & 开源**（MIT 协议） |
| **界面** | 以聊天为核心的 GUI | 终端 + 对话混合型 GUI |
| **后端** | 直接调用 Anthropic API | Claude Code CLI |
| **开源** | 闭源 | **完全开源** |
| **目标用户** | 普通用户 | 使用 Claude Code CLI 的开发者 |

两者都是优秀的工具 — 只是满足不同的需求。如果你想要一个精致的 Claude 聊天体验，请使用官方 Claude Desktop。如果你是深度使用 Claude Code CLI 的开发者，想要一个可视化的会话管理器，欢迎试试本项目。

## 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- 已安装并配置 [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)

### 安装

```bash
git clone https://github.com/HenryMu/claude-code-desktop.git
cd claude-code-desktop
npm install
```

### 开发

```bash
npm run dev
```

### 构建

```bash
npm run build
```

## 架构

```
src/
├── shared/types.ts              # 共享 TypeScript 类型（IPC、JSONL、Session）
├── main/
│   ├── index.ts                 # Electron 主进程入口
│   ├── ipc-handlers.ts          # IPC 通道注册
│   ├── session-watcher.ts       # 文件监听 + 增量 JSONL 解析器
│   ├── claude-manager.ts        # node-pty 进程生命周期管理
│   └── path-utils.ts            # 跨平台路径编码/解码
├── preload/
│   └── index.ts                 # contextBridge API
└── renderer/
    ├── index.html
    └── src/
        ├── App.tsx              # 根布局与标签状态
        ├── components/
        │   ├── Sidebar.tsx      # 项目树 + 会话列表
        │   └── MainContent.tsx  # 对话 + 终端标签页
        ├── hooks/
        │   ├── useSessionWatcher.ts  # 会话数据 IPC 监听
        │   └── useClaudeManager.ts   # PTY 进程管理
        └── styles/
            └── global.css       # Catppuccin 暗色主题
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面框架 | [Electron](https://www.electronjs.org/) 34 |
| 构建工具 | [electron-vite](https://electron-vite.org/) |
| 前端 | [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) |
| 终端 | [xterm.js](https://xtermjs.org/) + [node-pty](https://github.com/microsoft/node-pty) |
| 文件监听 | [chokidar](https://github.com/paulmillr/chokidar) |
| 样式 | CSS（Catppuccin 暗色主题） |

## 许可证

[MIT](./LICENSE)
