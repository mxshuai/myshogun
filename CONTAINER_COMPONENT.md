# Container 组件

Container 是一个功能丰富的容器组件，支持背景设置、垂直对齐和视差效果。

## 功能特性

- ✅ 单个Slot设计，可拖入任意组件
- ✅ 三种背景类型：颜色、图片、视频
- ✅ 垂直对齐控制（上/中/下）
- ✅ 视差滚动效果
- ✅ 整个容器可点击选项
- ✅ 支持Layout属性（padding、spanCol等）

## 属性说明

### Main（主要设置）

- **Entire container clickable**: 单选开关，是否整个容器可点击
- **Container Url**: 文本输入框，点击后跳转的链接地址
- **Open in new window**: 单选开关，是否在新窗口打开链接
- **Vertically align content**: 单选按钮
  - **Top**: 内容顶部对齐
  - **Middle**: 内容垂直居中对齐（默认）
  - **Bottom**: 内容底部对齐

### Background（背景设置）

- **Background**: 单选按钮，选择背景类型
  - **Color**: 纯色背景
  - **Image**: 图片背景（默认）
  - **Video**: 视频背景
- **Background image**: 文本输入框，输入背景图片URL
- **Background size**: 单选按钮，背景图片尺寸
  - **Cover**: 完全覆盖容器（默认）
  - **Contain**: 完全包含在容器内
  - **Custom**: 自定义尺寸
- **Background repeat**: 单选按钮，背景图片重复方式
  - **No Repeat**: 不重复（默认）
  - **Repeat**: 重复
- **Horizontal position**: 单选按钮，水平位置
  - **Left**: 左对齐
  - **Center**: 居中（默认）
  - **Right**: 右对齐
- **Horizontal position value (px)**: 数值输入，水平位置精确值（像素）
- **Vertical position**: 单选按钮，垂直位置
  - **Top**: 顶部
  - **Center**: 居中（默认）
  - **Bottom**: 底部
- **Vertical position value (px)**: 数值输入，垂直位置精确值（像素）
- **Responsive image**: 单选开关，是否响应式图片
  - **True**: 是（默认）
  - **False**: 否
- **Loading**: 单选按钮，图片加载方式
  - **Eager**: 立即加载
  - **Lazy**: 懒加载
  - **Auto**: 自动（默认）
- **Parallax effect**: 单选开关，是否启用视差滚动效果

### Content（内容）

- **Content**: Slot插槽，可以拖入其他Puck组件

## 使用方法

### 1. 添加Container组件

从左侧组件面板的 **Layout** 分类中拖拽 **Container** 组件到画布。

### 2. 配置背景

在属性面板的 **Background** 部分：

1. 选择背景类型（Color/Image/Video）
2. 如果选择Image，在 **Background image** 字段输入图片URL
3. 可选：启用 **Parallax effect** 实现视差滚动效果

### 3. 设置垂直对齐

在 **Main** 部分的 **Vertically align content** 中选择：
- **Top**: 内容靠上
- **Middle**: 内容居中（推荐）
- **Bottom**: 内容靠下

### 4. 添加内容

点击 **Content** 字段，拖入其他组件：
- Heading（标题）
- Text（文本）
- Button（按钮）
- Image（图片）
- 等等...

### 5. 设置点击链接（可选）

如果启用了 **Entire container clickable**：
1. 在 **Container Url** 输入跳转链接
2. 可选：启用 **Open in new window** 在新窗口打开

## 示例

### 基础图片背景容器

```json
{
  "type": "Container",
  "props": {
    "entireContainerClickable": false,
    "verticalAlign": "middle",
    "backgroundType": "image",
    "backgroundImage": "https://example.com/background.jpg",
    "parallaxEffect": false,
    "content": [
      {
        "type": "Heading",
        "props": {
          "text": "Welcome",
          "level": 1,
          "size": "xxl",
          "align": "center"
        }
      },
      {
        "type": "Text",
        "props": {
          "text": "This is a container with background image",
          "size": "m",
          "align": "center"
        }
      }
    ]
  }
}
```

### 带视差效果的容器

```json
{
  "type": "Container",
  "props": {
    "entireContainerClickable": true,
    "containerUrl": "https://example.com/about",
    "openInNewWindow": false,
    "verticalAlign": "middle",
    "backgroundType": "image",
    "backgroundImage": "https://example.com/parallax-bg.jpg",
    "backgroundSize": "cover",
    "backgroundRepeat": "no-repeat",
    "horizontalPosition": "center",
    "horizontalPositionValue": 0,
    "verticalPosition": "center",
    "verticalPositionValue": 0,
    "responsiveImage": true,
    "loading": "auto",
    "parallaxEffect": true,
    "content": [
      {
        "type": "Button",
        "props": {
          "label": "Learn More",
          "href": "/about",
          "variant": "primary"
        }
      }
    ]
  }
}
```

### 自定义背景位置的容器

```json
{
  "type": "Container",
  "props": {
    "entireContainerClickable": false,
    "verticalAlign": "top",
    "backgroundType": "image",
    "backgroundImage": "https://example.com/bg.jpg",
    "backgroundSize": "custom",
    "backgroundRepeat": "repeat",
    "horizontalPosition": "left",
    "horizontalPositionValue": 50,
    "verticalPosition": "top",
    "verticalPositionValue": 100,
    "responsiveImage": true,
    "loading": "lazy",
    "parallaxEffect": false,
    "content": [
      {
        "type": "Heading",
        "props": {
          "text": "Custom Background Position",
          "level": 2,
          "size": "xl",
          "align": "left"
        }
      }
    ]
  }
}
```

## 技术实现

### 组件文件

- **组件实现**: `app/components/Container.tsx`
- **类型定义**: `app/components/types.ts`
- **HTML生成**: `app/lib/convert-to-html.ts`
- **配置注册**: `puck.config.tsx`

### 背景样式逻辑

```typescript
const getBackgroundStyle = () => {
  const baseStyle: React.CSSProperties = {
    minHeight: "200px",
    display: "flex",
    flexDirection: "column",
    justifyContent: alignMap[verticalAlign],
    padding: "40px 16px",
  };

  if (backgroundType === "image" && backgroundImage) {
    baseStyle.backgroundImage = `url(${backgroundImage})`;
    baseStyle.backgroundSize = "cover";
    baseStyle.backgroundPosition = "center";
    if (parallaxEffect) {
      baseStyle.backgroundAttachment = "fixed";
    }
  } else if (backgroundType === "color") {
    baseStyle.backgroundColor = "#f5f5f5";
  } else if (backgroundType === "video") {
    baseStyle.backgroundColor = "#000";
  }

  return baseStyle;
};
```

## 与其他组件的区别

| 特性 | Container | Flex | Section |
|------|-----------|------|---------|
| 背景设置 | ✅ 丰富（颜色/图片/视频） |  | ❌ |
| 垂直对齐 | ✅ | ❌ | ❌ |
| 视差效果 | ✅ | ❌ | ❌ |
| 点击链接 | ✅ | ❌ | ❌ |
| 背景位置控制 | ✅ | ❌ |  |
| 布局控制 | ❌ | ✅ | ❌ |
| 多子元素 |  (单Slot) | ✅ (单Slot) | ❌ |

## 注意事项

1. **背景图片URL**: 确保使用有效的图片URL
2. **视差效果**: 仅在桌面端效果明显，移动端可能禁用
3. **视频背景**: 当前仅设置背景色，视频功能需要额外实现
4. **点击事件**: 
   - 需要同时启用 `Entire container clickable` 和填写 `Container Url` 才会生效
   - 启用后会显示手型光标
   - 可选择是否在新窗口打开
5. **背景位置**: 
   - 可以选择预设位置（Left/Center/Right等）
   - 也可以输入精确的像素值
   - 像素值优先于预设位置
6. **响应式图片**: 当前版本仅作为属性记录，实际响应式需要根据容器大小调整

## 扩展建议

- ~~支持背景颜色自定义（当前固定为#f5f5f5）~~ - 已实现
- 支持视频背景URL输入和播放控制
- 添加背景叠加层（overlay）颜色和透明度设置
- ~~支持背景图片位置自定义~~ - 已实现
- 添加容器圆角设置
- 支持背景渐变效果
