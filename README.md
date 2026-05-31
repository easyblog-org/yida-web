# 易搭 (Yida)

<p align="center">
  <strong>易搭低代码应用生成系统前端，一个基于 AI 的低代码应用创建与分享平台</strong>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Ant%20Design-6.x-1677FF?logo=antdesign" alt="Ant Design" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/TanStack-Router%20%26%20Query-FF4154?logo=tanstack" alt="TanStack" />
  <img src="https://img.shields.io/badge/Zustand-5.x-F59E0B?logo=zustand" alt="Zustand" />
</p>

---

## ✨ 项目简介

Yida 易搭是一款低代码应用生成平台，集成 AI 能力，让用户可以轻松创建、管理和分享智能应用。平台提供可视化的工作台、丰富的应用案例展示、便捷的案例管理等功能。

### 🎯 核心特性

| 特性 | 说明 |
|------|------|
| 🤖 **AI 工作台** | 基于 @ant-design/x 的智能应用构建与对话能力 |
| 📦 **应用案例** | 丰富的应用案例广场，支持点赞、评论、关注 |
| 🎨 **可视化编辑** | 实时预览与应用可视化编辑 |
| 🔐 **权限管理** | 完整的用户权限体系与审核流程 |
| 📱 **响应式设计** | 移动端优先的 UI 设计，适配各种屏幕尺寸 |
| 🔄 **状态管理** | Zustand + TanStack Query 统一状态管理 |

---

## 🛠️ 技术栈

### 前端框架

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev/) | ^19.2.0 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org/) | ^5.x | 类型安全 |
| [Vite](https://vitejs.dev/) | ^7.x | 构建工具 |
| [TailwindCSS](https://tailwindcss.com/) | ^4.x | 原子化 CSS |
| [React Compiler](https://react.dev/learn/compiler) | ^1.0.0 | 自动优化渲染 |

### 组件库

| 技术 | 版本 | 用途 |
|------|------|------|
| [Ant Design](https://ant.design/) | ^6.3.5 | UI 组件库 |
| [@ant-design/x](https://x.ant.design/) | ^2.5.0 | AI 对话组件 |
| [lucide-react](https://lucide.dev/) | ^1.8.0 | 图标组件 |

### 状态与路由

| 技术 | 版本 | 用途 |
|------|------|------|
| [TanStack Router](https://tanstack.com/router/) | ^1.168.10 | 文件系统路由 |
| [TanStack Query](https://tanstack.com/query/) | ^5.97.0 | 数据请求与缓存 |
| [Zustand](https://zustand-demo.pmnd.rs/) | ^5.0.12 | 全局状态管理 |

### 其他

| 技术 | 版本 | 用途 |
|------|------|------|
| [Axios](https://axios-http.com/) | ^1.15.0 | HTTP 请求 |
| [Orval](https://orval.dev/) | ^8.7.0 | API 代码生成 |
| [dayjs](https://day.js.org/) | ^1.11.20 | 日期处理 |

---

## 📁 项目结构

```
yida-web/
├── src/
│   ├── api/                          # API 层
│   │   ├── generated/                # orval 生成的代码（禁止修改）
│   │   │   ├── endpoints/            # 接口调用代码
│   │   │   └── models/               # 接口相关类型定义
│   │   └── mutator/                  # Axios 自定义实例
│   ├── assets/                       # 静态资源
│   ├── components/                   # 公共组件
│   ├── features/                     # 功能模块
│   │   ├── about/                    # 关于页面
│   │   ├── admin/                    # 管理后台
│   │   │   └── pages/
│   │   │       ├── AdminLlmLogsPage.tsx
│   │   │       └── AdminUsersPage.tsx
│   │   ├── app-case/                 # 应用案例
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── types.ts
│   │   ├── auth/                     # 认证
│   │   │   └── pages/
│   │   │       ├── LoginPage.tsx
│   │   │       └── RegisterPage.tsx
│   │   ├── case-management/          # 案例管理
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   ├── cases-square/             # 案例广场
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── utils/
│   │   ├── home/                     # 首页
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/
│   │   ├── user/                     # 用户中心
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   └── types.ts
│   │   └── workbench/                # 应用工作台
│   │       ├── components/
│   │       ├── pages/
│   │       ├── hooks/
│   │       ├── stores/
│   │       └── utils/
│   ├── layouts/                      # 布局组件
│   │   ├── AdminLayout/              # 管理后台布局
│   │   ├── AuthLayout/               # 认证布局
│   │   ├── BasicLayout/              # 基础布局
│   │   └── PublicCaseDetailLayout/   # 公开案例详情布局
│   ├── routes/                       # 路由定义（TanStack Router）
│   │   ├── __root.tsx                # 根路由
│   │   ├── _basic/                   # 基础路由组
│   │   └── _case-detail/             # 案例详情路由组
│   ├── libs/
│   │   ├── query-client.ts           # TanStack Query 客户端
│   │   └── router.ts                 # 路由配置
│   ├── index.css                     # 全局样式
│   └── main.tsx                      # 应用入口
├── public/                           # 公共静态资源
├── package.json                      # 项目依赖
├── tsconfig.json                     # TypeScript 配置
├── vite.config.ts                    # Vite 配置
└── README.md                         # 项目说明
```

---

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18
- **pnpm**: >= 8

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-org/yida-web.git
cd yida-web

# 安装依赖
pnpm install
```

### 开发模式

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

---

## 📝 开发指南

### 代码规范

```bash
pnpm format        # 格式化代码（Prettier）
pnpm format:check # 检查代码格式
pnpm ts:check      # TypeScript 类型检查
```

### API 开发

项目使用 Orval 根据 OpenAPI 规范自动生成 API 调用代码：

```bash
pnpm gen:api
```

生成的代码位于 `src/api/generated/` 目录，**请勿手动编辑**。

### 组件开发

遵循 Feature-Based 模式：

- 页面组件放在 `src/features/{feature}/pages/`
- 业务组件放在 `src/features/{feature}/components/`
- 工具函数放在 `src/features/{feature}/utils/`
- 自定义 Hooks 放在 `src/features/{feature}/hooks/`

### 样式规范

- 优先使用 Tailwind CSS v4 实现样式
- 图标组件库使用 lucide-react
- Tailwind 工具类可以覆盖 Ant Design 样式

---

## ⚙️ 配置说明

### 自定义 Axios 实例

自定义 Axios 配置位于 `src/api/mutator/custom-instance.ts`，可按需补充请求拦截器、响应拦截器等。

### Ant Design 配置

全局 Ant Design ConfigProvider 配置位于 `src/main.tsx`，可通过 `theme.token` 自定义主题 token，如字体大小、颜色等。

---

## 📋 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览生产版本 |
| `pnpm format` | 格式化代码 |
| `pnpm format:check` | 检查代码格式 |
| `pnpm ts:check` | TypeScript 类型检查 |
| `pnpm gen:api` | 生成 API 代码 |
| `pnpm test` | 运行测试 |

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## � 相关链接

- **前端仓库**: https://github.com/easyblog-org/yida-web
- **后端仓库**: https://github.com/easyblog-org/yida

---

## �📄 许可证

本项目采用 MIT 许可证。

---

<p align="center">
  Made with ❤️
</p>
