# JSON 转 HTML/CSS 功能说明

## ✅ 功能实现

已成功实现将 Puck JSON 数据转换为标准 HTML 和 CSS 代码的功能。用户可以通过 View Page 模态框中的三个选项卡查看不同格式的代码。

## 📋 新增文件

### 1. **convert-to-html.ts** (新增)
- 路径: `app/lib/convert-to-html.ts`
- 功能: 将 Puck JSON 数据转换为 HTML 和 CSS 字符串

**核心函数：**
- `convertToHTML(data: Data): string` - 将 JSON 转换为完整的 HTML 文档
- `generateCSS(): string` - 生成基础 CSS 样式
- `generateComponentHTML(component, indent)` - 递归生成组件 HTML
- `escapeHtml(text)` - 转义 HTML 特殊字符

## 🎯 支持的组件转换

### ✅ 已支持的组件

| 组件 | HTML 标签 | 特性支持 |
|------|-----------|----------|
| **Heading** | `<h1>` - `<h6>` | size, align, level, layout.padding |
| **Text** | `<div><span>` | size, align, color, maxWidth, layout.padding |
| **Button** | `<a>` | variant (primary/secondary), href, label |
| **Card** | `<div>` | title, description, imageUrl, href, layout.padding |
| **Image** | `<img>` | src, alt, width, height, layout.padding |
| **Grid** | `<div>` (CSS Grid) | numColumns, gap, items (嵌套组件) |
| **Flex** | `<div>` (Flexbox) | direction, justifyContent, gap, wrap, items (嵌套组件) |
| **Hero** | `<div>` | title, subtitle, buttonText, buttonHref, backgroundImage, align |
| **Divider** | `<hr>` | thickness, color, style (solid/dashed/dotted) |
| **Spacer** | `<div>` | height |

## 🔧 使用方法

### 1. 进入编辑器
```
http://localhost:5173/edit
```

### 2. 打开 View Page 模态框
- 点击右上角的 "View Page" 按钮

### 3. 切换选项卡

模态框顶部有三个选项卡：

#### **JSON 选项卡**
- 显示原始的 Puck JSON 数据结构
- 适合开发者查看和调试
- 可复制/download 为 `.json` 文件

#### **HTML 选项卡**
- 显示转换后的完整 HTML 文档
- 包含 `<!DOCTYPE html>` 声明
- 所有组件转换为标准 HTML 标签
- 使用 inline styles 保持样式
- 可复制/download 为 `.html` 文件

#### **CSS 选项卡**
- 显示基础 CSS 样式
- 包含重置样式和响应式设置
- 可复制/download 为 `.css` 文件

### 4. 操作按钮

每个选项卡都有两个操作按钮：

**Copy [FORMAT]**
- 复制当前选项卡的内容到剪贴板
- 成功后显示 "✓ Copied!"

**Download [EXT]**
- 下载当前内容为文件
- 文件扩展名根据选项卡自动变化（.json / .html / .css）

## 📊 转换示例

### 输入：Puck JSON
```json
{
  "content": [
    {
      "type": "Heading",
      "props": {
        "text": "Welcome",
        "level": 1,
        "size": "xl",
        "align": "center"
      }
    },
    {
      "type": "Button",
      "props": {
        "label": "Get Started",
        "href": "#",
        "variant": "primary"
      }
    }
  ]
}
```

### 输出：HTML
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="puck-page">
    <h1 style="font-size: 2.5rem; text-align: center; margin: 0; font-weight: 600; line-height: 1.2;">
      <span style="display: block; width: 100%;">Welcome</span>
    </h1>
    <div>
      <a href="#" style="display: inline-block; padding: 16px 32px; background-color: #0070f3; color: #ffffff; border: none; border-radius: 6px; text-decoration: none; font-weight: 500;">
        Get Started
      </a>
    </div>
  </div>
</body>
</html>
```

### 输出：CSS
```css
/* Puck Page Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

.puck-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .puck-page {
    padding: 0 12px;
  }
}
```

## 🎨 样式处理策略

### Inline Styles vs External CSS

**当前实现：Inline Styles**
- ✅ 优点：简单直接，无需额外文件
- ✅ 优点：样式与内容紧密绑定
- ❌ 缺点：HTML 文件较大
- ❌ 缺点：无法利用 CSS 缓存

**生成的 CSS 文件包含：**
- 全局重置样式
- 基础字体设置
- `.puck-page` 容器样式
- 响应式媒体查询

### Layout 属性处理

组件的 `layout` 属性会被转换为：
- `layout.padding` → `padding-top` 和 `padding-bottom`
- `layout.spanCol` → 在 Grid 中通过 `grid-column` 实现
- `layout.grow` → 在 Flex 中通过 `flex` 属性实现

## 🔍 技术细节

### 1. 递归组件渲染

```typescript
function generateComponentHTML(component: any, indent: number): string {
  // 根据 component.type 调用对应的生成函数
  // 对于 Grid/Flex，递归处理 items 数组
}
```

### 2. HTML 转义

防止 XSS 攻击，所有用户输入的文本都会转义：
```typescript
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

### 3. 缩进格式化

HTML 输出使用 2 空格缩进，便于阅读：
```typescript
const spaces = ' '.repeat(indent);
```

### 4. 响应式设计

- Grid 组件使用 `grid-template-columns: repeat(n, 1fr)`
- Flex 组件支持 `flex-wrap`
- Hero 组件使用 `min-height` 确保最小高度

## 🚀 使用场景

### 1. 导出静态页面
- 下载 HTML + CSS 文件
- 部署到任何静态托管服务
- 无需 React 运行时

### 2. 邮件模板
- 复制 HTML 代码
- 粘贴到邮件营销平台
- Inline styles 兼容大多数邮件客户端

### 3. CMS 集成
- 将 HTML 导入其他 CMS
- 作为内容片段复用
- 跨平台内容同步

### 4. 代码审查
- 查看生成的 HTML 结构
- 检查语义化标签
- 验证无障碍性

### 5. 学习参考
- 了解组件如何转换为 HTML
- 学习 CSS 布局技巧
- 研究最佳实践

## 🐛 已知限制

1. **动态交互丢失**
   - Button 的 hover 效果需要额外 CSS
   - 表单组件未实现（如果有的话）

2. **图片资源**
   - 图片 URL 保持不变
   - 需要确保图片可访问

3. **自定义组件**
   - 只支持预定义的 10 个组件
   - 自定义组件会显示为注释

4. **JavaScript 交互**
   - 不生成 JavaScript 代码
   - 如需交互，需手动添加

## 💡 未来改进建议

### 短期优化
1. **语法高亮**: 为 HTML/CSS 添加语法高亮显示
2. **预览功能**: 添加实时预览窗口
3. **压缩选项**: 提供压缩版 HTML/CSS
4. **组件映射表**: 显示 JSON 到 HTML 的映射关系

### 中期增强
1. **Tailwind CSS**: 支持转换为 Tailwind 类名
2. **SCSS/SASS**: 生成嵌套样式
3. **BEM 命名**: 使用 BEM 规范生成类名
4. **组件库导出**: 导出为 Web Components

### 长期愿景
1. **React 代码生成**: 直接生成 React 组件代码
2. **Vue/Angular 支持**: 多框架代码生成
3. **设计系统导出**: 提取设计 token
4. **无障碍检查**: 自动检测并修复 a11y 问题

## 📝 注意事项

### 使用 HTML 文件时

1. **链接外部资源**
   ```html
   <!-- 确保 CSS 文件在同一目录 -->
   <link rel="stylesheet" href="styles.css">
   ```

2. **图片路径**
   - 使用绝对 URL 或相对路径
   - 确保图片可访问

3. **字体加载**
   - 默认使用系统字体栈
   - 如需自定义字体，需在 CSS 中添加 `@font-face`

### 最佳实践

1. **定期导出备份**
   - 保存 HTML/CSS 作为备份
   - 版本控制重要页面

2. **测试不同浏览器**
   - Chrome, Firefox, Safari, Edge
   - 移动端浏览器

3. **性能优化**
   - 压缩图片
   - 使用 CDN 加载资源
   - 启用 Gzip 压缩

---

**实现日期**: 2026-04-29  
**功能状态**: ✅ 已完成并可用  
**支持组件**: 10/10 (100%)
