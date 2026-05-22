# 组件重构说明

## 概述
参照官方 Puck Demo 项目 (`puck-main/apps/demo`) 的设计模式，对本项目的组件进行了全面重构。

## 核心改动

### 1. 引入 `withLayout` 高阶组件
**文件**: `app/components/Layout.tsx`

官方 Demo 使用 `withLayout` 高阶组件（HOC）来统一管理所有组件的布局属性。这是一个关键的设计模式。

**优势**:
- 所有组件自动获得 layout 属性
- 根据父容器类型（Grid/Flex）动态显示不同的布局选项
- 避免在每个组件中重复定义 layout 字段

### 2. Layout 字段设计
**类型**: `ObjectField<LayoutFieldProps>`

```typescript
export type LayoutFieldProps = {
  padding?: string;      // 垂直内边距
  spanCol?: number;      // Grid 列跨越
  spanRow?: number;      // Grid 行跨越
  grow?: boolean;        // Flex 自动扩展
};
```

**动态字段显示逻辑** (通过 `resolveFields`):
- **在 Grid 容器中**: 显示 `spanCol`, `spanRow`, `padding`
- **在 Flex 容器中**: 显示 `grow`, `padding`
- **独立使用**: 仅显示 `padding`

### 3. Grid 组件重构
**改动**: 从 6 个独立 Slot 改为单个 Slot

**之前**:
```typescript
fields: {
  column1: { type: "slot" },
  column2: { type: "slot" },
  // ... column3-6
}
```

**现在**:
```typescript
fields: {
  numColumns: { type: "number", max: 12 },
  gap: { type: "number" },
  items: { type: "slot" },  // 单个 Slot
}
```

**原因**: 
- 官方 Demo 使用单个 Slot，通过 CSS Grid 自动分配子组件到各列
- 子组件通过 `layout.spanCol` 控制跨越的列数
- 更简洁、更灵活

### 4. Flex 组件重构
**改动**:
- 使用 `withLayout` 包装
- `justify` 改为 `justifyContent`
- `align` 属性移除（由 layout.grow 替代）
- `wrap` 改为字符串类型 `"wrap" | "nowrap"`

**字段变化**:
```typescript
// 之前
justify: "flex-start" | "center" | "flex-end" | "space-between" | "space-around"
align: "flex-start" | "center" | "flex-end" | "stretch"
wrap: boolean

// 现在
justifyContent: "flex-start" | "center" | "flex-end"
wrap: "wrap" | "nowrap"
layout: {
  grow: boolean,  // 替代 align: stretch
  padding: string
}
```

### 5. 所有普通组件添加 Layout 支持
以下组件现在都使用 `withLayout` 包装：
- ✅ Heading
- ✅ Text
- ✅ Button
- ✅ Card
- ✅ Image
- ✅ Flex

这些组件现在都具有：
- `layout.spanCol` - 在 Grid 中跨越的列数
- `layout.spanRow` - 在 Grid 中跨越的行数
- `layout.grow` - 在 Flex 中是否自动扩展
- `layout.padding` - 垂直内边距

### 6. 新增文件

#### `app/components/options.ts`
间距选项配置，与官方 Demo 保持一致：
```typescript
export const spacingOptions = [
  { label: "8px", value: "8px" },
  { label: "16px", value: "16px" },
  // ... 到 160px
];
```

#### `app/components/Layout.tsx`
核心布局组件和高阶函数：
- `Layout` - 包装组件的 React 组件
- `withLayout` - 高阶组件函数
- `layoutField` - Layout 字段定义
- `WithLayout<T>` - 类型包装器

## 使用示例

### 在 Grid 中使用
```typescript
Grid (numColumns: 3)
├── Heading (layout: { spanCol: 2, padding: "16px" })  // 跨越2列
├── Text (layout: { spanCol: 1, padding: "8px" })      // 占1列
└── Card (layout: { spanCol: 3, padding: "24px" })     // 跨越全部3列
```

### 在 Flex 中使用
```typescript
Flex (direction: row)
├── Button (layout: { grow: false, padding: "8px" })   // 固定宽度
├── Button (layout: { grow: false, padding: "8px" })   // 固定宽度
└── Text (layout: { grow: true, padding: "8px" })      // 自动填充剩余空间
```

## 文件清单

### 新创建的文件
- `app/components/Layout.tsx` - 布局高阶组件
- `app/components/options.ts` - 间距选项配置

### 重构的文件
- `app/components/types.ts` - 使用 `WithLayout` 类型包装
- `app/components/Grid.tsx` - 改为单 Slot 模式
- `app/components/Flex.tsx` - 使用 withLayout，字段调整
- `app/components/Heading.tsx` - 使用 withLayout
- `app/components/Text.tsx` - 使用 withLayout
- `app/components/Button.tsx` - 使用 withLayout
- `app/components/Card.tsx` - 使用 withLayout
- `app/components/Image.tsx` - 使用 withLayout

### 未修改的文件
- `app/components/Hero.tsx` - 暂不使用 withLayout
- `app/components/Divider.tsx` - 暂不使用 withLayout
- `app/components/Spacer.tsx` - 暂不使用 withLayout
- `visbuild.config.tsx` - 配置保持不变

## 与官方 Demo 的差异

| 特性 | 官方 Demo | 本项目 |
|------|-----------|--------|
| CSS Modules | ✅ 使用 | ❌ 未使用（使用 inline styles） |
| Section 组件 | ✅ 有 | ❌ 无 |
| RichText | ✅ 有 | ❌ 无 |
| Logos/Stats | ✅ 有 | ❌ 无 |
| 自定义 UI 组件 | ✅ 有 | ❌ 无 |
| resolveFields | ✅ 有 | ✅ 已实现 |
| withLayout HOC | ✅ 有 | ✅ 已实现 |

## 后续优化建议

1. **引入 CSS Modules** - 使样式管理更清晰
2. **添加 Section 组件** - 统一容器的 padding 和 max-width
3. **添加更多高级组件** - RichText, Logos, Stats 等
4. **改进响应式设计** - 添加 breakpoint 支持
5. **优化拖拽体验** - 添加 drop zones 提示

## 测试清单

- [ ] Grid 组件：添加子组件，调整 numColumns
- [ ] Grid 组件：设置子组件的 spanCol，验证跨列效果
- [ ] Flex 组件：添加子组件，调整 direction
- [ ] Flex 组件：设置子组件的 grow，验证自动扩展效果
- [ ] 所有组件：验证 padding 选项正常工作
- [ ] 所有组件：在不同容器中的字段显示正确
