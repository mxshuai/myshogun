# View Page 功能更新说明

## ✅ 更新内容

已将 CSS 样式直接嵌入到 HTML 中，并移除了独立的 CSS 选项卡。

## 📋 修改详情

### 1. **convert-to-html.ts** (修改)
- `convertToHTML()` 函数现在会将 CSS 样式内联到 HTML 的 `<style>` 标签中
- 移除了外部 CSS 文件链接 `<link rel="stylesheet" href="styles.css">`
- 生成的 HTML 现在是完全自包含的，无需额外的 CSS 文件

### 2. **ViewPageModal.tsx** (修改)
- 移除 CSS 选项卡，只保留 JSON 和 HTML 两个选项卡
- 移除 `generateCSS` 导入
- 简化状态管理，只使用 `'json' | 'html'` 类型

## 🎯 现在的行为

### 选项卡
- **JSON** - 显示原始 Puck JSON 数据
- **HTML** - 显示包含内联 CSS 的完整 HTML 文档

### HTML 输出示例

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <style>
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
  </style>
</head>
<body>
  <div class="puck-page">
    <!-- Components here -->
  </div>
</body>
</html>
```

## 💡 优势

### ✅ 优点
1. **单文件部署** - 只需一个 HTML 文件即可运行
2. **简化分享** - 更容易分享和传输
3. **减少 HTTP 请求** - 不需要加载外部 CSS 文件
4. **即时可用** - 下载后直接双击打开即可查看

### ⚠️ 注意事项
1. **文件大小** - HTML 文件会比之前稍大（包含 CSS）
2. **缓存** - 无法利用浏览器对 CSS 文件的缓存
3. **维护性** - 如需修改样式，需要编辑 HTML 文件

## 🚀 使用场景

### 适合的场景
- ✅ 快速原型展示
- ✅ 邮件模板（需要内联样式）
- ✅ 单页应用导出
- ✅ 离线查看
- ✅ 简单静态页面

### 不适合的场景
- ❌ 大型网站（应该使用外部 CSS 文件）
- ❌ 多页面共享样式（会导致重复）
- ❌ 需要频繁更新样式的项目

## 📝 操作步骤

1. 进入编辑器：`http://localhost:5173/edit`
2. 点击 "View Page" 按钮
3. 切换到 **HTML** 选项卡
4. 点击 "Copy HTML" 或 "Download HTML"
5. 保存为 `.html` 文件
6. 直接在浏览器中打开即可看到完整效果

---

**更新日期**: 2026-04-29  
**版本**: v2.0  
**状态**: ✅ 已完成
