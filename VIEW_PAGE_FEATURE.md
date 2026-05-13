# View Page 功能说明

## ✅ 功能实现

已在 Puck 编辑器的 Publish 按钮左侧添加了 "View Page" 按钮，点击后会弹出模态框显示当前页面的 JSON 源码。

## 📋 实现文件

### 1. **ViewPageModal.tsx** (新增)
- 路径: `app/components/ViewPageModal.tsx`
- 功能: 页面源码查看模态框组件

**主要特性：**
- ✨ 美观的模态框界面
- 📋 Copy to Clipboard - 一键复制 JSON 到剪贴板
- 💾 Download JSON - 下载为 JSON 文件
- 🎨 代码格式化显示（2空格缩进）
- ⌨️ 等宽字体显示，便于阅读
- 🔄 复制成功后显示 "✓ Copied!" 提示（2秒后恢复）

### 2. **puck-splat.tsx** (修改)
- 路径: `app/routes/puck-splat.tsx`
- 修改内容:
  - 导入 `useState` 和 `ViewPageModal`
  - 添加 `showViewModal` 状态管理
  - 使用 `overrides.headerActions` 自定义工具栏
  - 在 Publish 按钮前插入 "View Page" 按钮
  - 渲染 `ViewPageModal` 组件

## 🎯 使用方法

### 1. 进入编辑器
访问任意页面的编辑模式，例如：
```
http://localhost:5173/edit
```

### 2. 查看页面源码
- 在编辑器右上角，Publish 按钮的左侧会看到 "View Page" 按钮
- 点击 "View Page" 按钮
- 弹出模态框，显示当前页面的完整 JSON 数据

### 3. 操作选项

#### Copy to Clipboard
- 点击 "Copy to Clipboard" 按钮
- JSON 数据会自动复制到剪贴板
- 按钮文字变为 "✓ Copied!"（绿色）
- 2 秒后恢复为 "Copy to Clipboard"

#### Download JSON
- 点击 "Download JSON" 按钮
- 自动下载名为 `page-data.json` 的文件
- 文件内容为格式化的 JSON 数据

#### 关闭模态框
- 点击右上角的 × 按钮
- 或点击模态框外部的遮罩层

## 🎨 样式特点

### 按钮样式
- 白色背景
- 灰色边框 (#e0e0e0)
- 圆角 6px
- Hover 时背景变为浅灰色 (#f8f9fa)
- 位于 Publish 按钮左侧，间距 8px

### 模态框样式
- 半透明黑色遮罩层 (rgba(0, 0, 0, 0.5))
- 白色圆角卡片 (8px)
- 最大宽度 900px
- 最大高度 80vh
- 阴影效果 (0 4px 20px rgba(0, 0, 0, 0.15))
- 响应式设计（宽度 90%）

### 代码显示区域
- 浅灰色背景 (#f8f9fa)
- 等宽字体 (Monaco, Menlo, Courier New)
- 字体大小 0.875rem (14px)
- 行高 1.6
- 自动换行
- 可滚动查看

## 📊 JSON 数据结构示例

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
      },
      "id": "Heading-1"
    }
  ],
  "root": {
    "props": {
      "title": "My Page"
    }
  },
  "zones": {}
}
```

## 🔧 技术实现细节

### State Management
```typescript
const [showViewModal, setShowViewModal] = useState(false);
```

### Override API
使用 Puck 的 `overrides` API 自定义工具栏：
```typescript
overrides={{
  headerActions: ({ children }) => (
    <>
      <button onClick={() => setShowViewModal(true)}>
        View Page
      </button>
      {children}
    </>
  ),
}}
```

### Clipboard API
```typescript
await navigator.clipboard.writeText(jsonString);
```

### File Download
```typescript
const blob = new Blob([jsonString], { type: "application/json" });
const url = URL.createObjectURL(blob);
// ... 创建并触发下载链接
```

## 🐛 已知问题

无

## 🚀 未来改进建议

1. **语法高亮**: 集成 Prism.js 或 highlight.js 实现 JSON 语法高亮
2. **搜索功能**: 添加搜索框，支持在 JSON 中搜索特定字段
3. **折叠展开**: 支持折叠/展开 JSON 对象和数组
4. **验证功能**: 添加 JSON 结构验证，检查是否符合 Puck 数据规范
5. **历史记录**: 保存查看历史，支持对比不同版本

---

**实现日期**: 2026-04-29  
**功能状态**: ✅ 已完成并可用
