# 易搭 (Yida)

易搭低代码应用生成系统前端，一个基于 AI 的低代码应用创建与分享平台。

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 7
- **UI 组件库**: Ant Design v6
- **样式**: Tailwind CSS v4
- **路由**: TanStack Router
- **数据请求**: TanStack Query + Axios
- **状态管理**: Zustand
- **AI 组件**: @ant-design/x (AI 对话组件)

## 项目结构

```
src/
├── api/                          # API 层
│   ├── generated/                # orval 生成的代码（禁止修改）
│   │   ├── endpoints/            # 接口调用代码
│   │   └── models/               # 接口相关类型定义
│   └── mutator/                  # Axios 自定义实例
├── assets/                       # 静态资源
├── features/                     # 功能模块
│   ├── about/                    # 关于页面
│   ├── admin/                    # 管理后台
│   ├── app-case/                 # 应用案例
│   ├── auth/                     # 认证（登录/注册）
│   ├── case-management/          # 案例管理
│   ├── cases-square/             # 案例广场
│   ├── home/                     # 首页
│   ├── user/                     # 用户中心
│   └── workbench/                # 应用工作台
├── layouts/                      # 布局组件
├── routes/                       # 路由定义（TanStack Router 文件系统路由）
├── stores/                       # Zustand 状态仓库
├── index.css                     # 全局样式
└── main.tsx                      # 应用入口
```

## 功能模块

### 工作台 (workbench)

应用创建和编辑的核心工作区，提供可视化的应用构建能力。

### 案例广场 (cases-square)

展示和分享用户创建的应用案例，支持点赞、评论、关注等功能。

### 案例管理 (case-management)

管理已提交的应用案例，包括案例审核、详情查看等。

### 用户中心 (user)

用户个人信息管理，包括个人资料编辑、头像修改、作品展示、收藏管理等。

### 管理后台 (admin)

系统管理功能，包括用户管理、LLM 日志查看、案例审核等。

## 开发

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
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

### 类型检查

```bash
pnpm ts:check
```

### 代码格式化

```bash
pnpm format        # 格式化代码
pnpm format:check # 检查代码格式
```

### 生成 API 代码

根据 OpenAPI 规范生成 API 调用代码：

```bash
pnpm gen:api
```

## 架构说明

### Feature-Based 组织方式

严格遵循 Feature-Based 模式，按功能划分子文件夹。在每个子文件夹中按需组织当前功能私有的 `pages`、`components`、`hooks`、`services`、`utils`、`schemas` 等目录。

### 路由

- 路由相关问题积极使用 TanStack Router Skill
- 路由组中的 `route.tsx` 仅负责路由声明、布局挂载、路由级守卫、重定向等路由相关逻辑
- 页面实现必须放在 `src/features/*/pages` 中

### 样式规范

- 优先使用 Tailwind CSS v4 实现样式
- Tailwind 工具类可以覆盖 Ant Design 样式
- 图标组件库使用 lucide-react

### API 层

所有请求代码和 React Query hooks 由 orval 生成到 `src/api/generated` 中，严禁手动编辑。自定义 Axios 实例位于 `src/api/mutator/custom-instance.ts`。

### React Compiler

项目已配置 React Compiler，大部分情况无需手动使用 `useMemo`/`useCallback` 等 Hooks 进行优化。

## 致谢

- [Ant Design](https://ant.design/) - UI 组件库
- [TanStack](https://tanstack.com/) - React Router & Query
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
