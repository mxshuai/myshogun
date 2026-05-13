# Puck Editor 改造项目

这是一个基于 React Router v7 和 Puck Editor 的可视化页面构建器项目。已经添加了丰富的组件库，让您能够轻松创建专业级的网页。

## 🎯 项目特色

- ✅ **10+ 预建组件**：包含标题、文本、按钮、卡片、网格、英雄区域等常用组件
- ✅ **分类管理**：组件按功能分类（布局、内容、交互、区块、其他）
- ✅ **中文界面**：所有字段标签和选项都已中文化
- ✅ **响应式设计**：所有组件都支持响应式布局
- ✅ **实时预览**：所见即所得的编辑体验
- ✅ **数据持久化**：使用 JSON 文件存储页面数据

## 📦 可用组件

### 布局组件 (Layout)
- **Grid** - 网格布局，支持自定义列数和间距
- **Flex** - 弹性布局，支持多种对齐方式
- **Spacer** - 间距组件，用于控制垂直间距

### 内容组件 (Content)
- **Heading** - 标题组件，支持 H1-H6，多种尺寸和对齐方式
- **Text** - 文本组件，支持不同大小、对齐和颜色
- **Image** - 图片组件，支持自定义宽高
- **Card** - 卡片组件，包含标题、描述和图片

### 交互组件 (Interactive)
- **Button** - 按钮组件，支持主要、次要、边框三种样式

### 区块组件 (Sections)
- **Hero** - 英雄区域组件，适合用作页面顶部的大横幅

### 其他组件 (Other)
- **Divider** - 分隔线组件，支持实线、虚线、点线

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:5173` 查看首页

### 进入编辑器
在任意路径后添加 `/edit` 即可进入编辑模式：
- `http://localhost:5173/edit` - 编辑首页
- `http://localhost:5173/about/edit` - 编辑关于页面
- `http://localhost:5173/products/edit` - 编辑产品页面

### 构建生产版本
```bash
npm run build
npm start
```

## 📝 使用说明

### 1. 添加组件
从左侧组件面板拖拽组件到画布中

### 2. 编辑组件
点击画布中的组件，右侧会显示属性面板，可以修改：
- 文本内容
- 样式设置（颜色、大小、对齐等）
- 链接地址
- 图片 URL
- 布局参数

### 3. 删除组件
选中组件后，按 Delete 键或点击删除按钮

### 4. 发布页面
点击右上角的 "Publish" 按钮保存更改

### 5. 预览页面
访问不带 `/edit` 的路径即可查看发布的页面

## 🛠️ 技术栈

- **React 19** - 最新版本的 React
- **React Router v7** - 路由管理
- **Puck Editor** - 可视化编辑器核心
- **TypeScript** - 类型安全
- **Vite** - 构建工具

## 📂 项目结构

```
my-app/
├── app/
│   ├── components/          # Puck 组件定义
│   │   ├── types.ts        # 类型定义
│   │   ├── Heading.tsx     # 标题组件
│   │   ├── Text.tsx        # 文本组件
│   │   ├── Button.tsx      # 按钮组件
│   │   ├── Card.tsx        # 卡片组件
│   │   ├── Grid.tsx        # 网格组件
│   │   ├── Hero.tsx        # 英雄区域组件
│   │   ├── Flex.tsx        # 弹性布局组件
│   │   ├── Image.tsx       # 图片组件
│   │   ├── Divider.tsx     # 分隔线组件
│   │   └── Spacer.tsx      # 间距组件
│   ├── lib/                # 工具函数
│   ├── routes/             # 路由组件
│   └── root.tsx            # 根组件
├── puck.config.tsx         # Puck 配置文件
├── database.json           # 页面数据存储
└── package.json
```

## 🔧 自定义组件

要添加新组件，请按照以下步骤：

1. 在 `app/components/` 目录下创建新的组件文件
2. 定义组件的类型（在 `types.ts` 中）
3. 实现组件配置（fields, defaultProps, render）
4. 在 `puck.config.tsx` 中导入并注册组件

示例：
```tsx
import type { ComponentConfig } from "@puckeditor/core";

export const MyComponent: ComponentConfig<MyProps> = {
  fields: {
    // 定义字段
  },
  defaultProps: {
    // 默认属性
  },
  render: ({ /* props */ }) => {
    // 渲染逻辑
  },
};
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- Email: contact@example.com

---

享受使用 Puck Editor 构建您的页面吧！🎉
