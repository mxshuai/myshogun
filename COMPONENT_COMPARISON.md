# Grid 和 Flex 组件对比分析

## 📊 官方 Demo vs 本项目

---

##  Grid 组件对比

### 1. 代码结构对比

| 特性 | 官方 Demo | 本项目 | 差异说明 |
|------|-----------|--------|----------|
| **使用 withLayout** | ✅ 是 | ❌ 否 | **关键差异**：官方 Grid 也使用 withLayout |
| **使用 Section 组件** | ✅ 是 | ❌ 否 | 官方使用 Section 包裹内容 |
| **使用 CSS Modules** | ✅ 是 | ❌ 否 | 官方使用 styles.module.css |
| **自定义 Slot 组件** | ✅ 是 (`CustomSlot`) | ❌ 否 | 官方传入 `as={CustomSlot}` |
| **disallow 属性** | ✅ 是 (`["Hero", "Stats"]`) |  否 | 官方限制某些组件不能放入 |
| **字段定义** | 相同 | 相同 | numColumns, gap, items 一致 |
| **默认列数** | 4 | 3 | 官方默认 4 列 |

### 2. 代码对比

#### 官方 Demo - Grid

```tsx
import { Section } from "../../components/Section";
import { withLayout } from "../../components/Layout";

const CustomSlot = (props: any) => {
  return <span {...props} />;
};

export const GridInternal: ComponentConfig<GridProps> = {
  fields: { /* ... */ },
  defaultProps: {
    numColumns: 4,  // ← 默认 4 列
    gap: 24,
    items: [],
  },
  render: ({ gap, numColumns, items: Items }) => {
    return (
      <Section>  {/* ← 使用 Section 包裹 */}
        <Items
          as={CustomSlot}  {/* ← 传入自定义组件 */}
          disallow={["Hero", "Stats"]}  {/* ← 限制组件 */}
          className={getClassName()}
          style={{
            gap,
            gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
          }}
        />
      </Section>
    );
  },
};

export const Grid = withLayout(GridInternal);  // ← 使用 withLayout
```

#### 本项目 - Grid

```tsx
// 没有导入 Section 和 withLayout
// 没有 CustomSlot
// 没有 disallow

export const Grid: ComponentConfig<Components["Grid"]> = {
  fields: { /* ... */ },
  defaultProps: {
    numColumns: 3,  // ← 默认 3 列
    gap: 24,
    items: [],
  },
  render: ({ gap, numColumns, items: Items }) => {
    return (
      <div  {/* ← 直接使用 div，没有 Section */}
        style={{
          display: "grid",  {/* ← 手动设置 display: grid */}
          gap: `${gap}px`,
          gridTemplateColumns: `repeat(${numColumns}, 1fr)`,
          padding: "16px 0",  {/* ← 手动设置 padding */}
        }}
      >
        <Items />  {/* ← 没有 as、disallow、className */}
      </div>
    );
  },
};

// ❌ 没有使用 withLayout
```

### 3. CSS 对比

#### 官方 Demo - Grid CSS

```css
.Grid {
  display: flex;
  flex-direction: column;
  width: auto;
}

@media (min-width: 768px) {
  .Grid {
    display: grid;  /* ← 响应式：小屏 flex，大屏 grid */
  }
}
```

#### 本项目 - Grid CSS

```css
/* 无 CSS 文件，使用 inline styles */
```

---

## 🟦 Flex 组件对比

### 1. 代码结构对比

| 特性 | 官方 Demo | 本项目 | 差异说明 |
|------|-----------|--------|----------|
| **使用 withLayout** | ✅ 是 | ✅ 是 | 都使用了 withLayout |
| **使用 Section 组件** | ✅ 是 | ❌ 否 | 官方使用 Section 包裹 |
| **使用 CSS Modules** | ✅ 是 | ❌ 否 | 官方使用 styles.module.css |
| **disallow 属性** | ✅ 是 (`["Hero", "Stats"]`) | ❌ 否 | 官方限制某些组件 |
| **justifyContent 值** | `"start" \| "center" \| "end"` | `"flex-start" \| "center" \| "flex-end"` | **值不同** |
| **默认 wrap** | `"wrap"` | `"wrap"` | 一致 |
| **默认 layout.grow** | `true` | ❌ 未设置 | 官方默认 grow: true |

### 2. 代码对比

#### 官方 Demo - Flex

```tsx
import { Section } from "../../components/Section";
import { WithLayout, withLayout } from "../../components/Layout";

export type FlexProps = WithLayout<{
  justifyContent: "start" | "center" | "end";  // ← 简化的值
  direction: "row" | "column";
  gap: number;
  wrap: "wrap" | "nowrap";
  items: Slot;
}>;

const FlexInternal: ComponentConfig<FlexProps> = {
  fields: { /* ... */ },
  defaultProps: {
    justifyContent: "start",  // ← 使用 "start"
    direction: "row",
    gap: 24,
    wrap: "wrap",
    layout: {
      grow: true,  // ← 默认 grow: true
    },
    items: [],
  },
  render: ({ justifyContent, direction, gap, wrap, items: Items }) => {
    return (
      <Section style={{ height: "100%" }}>  {/* ← 使用 Section */}
        <Items
          className={getClassName()}
          style={{
            justifyContent,  // ← 直接使用，不加 px
            flexDirection: direction,
            gap,  // ← 直接使用数字，不加 px
            flexWrap: wrap,
          }}
          disallow={["Hero", "Stats"]}  {/* ← 限制组件 */}
        />
      </Section>
    );
  },
};

export const Flex = withLayout(FlexInternal);
```

#### 本项目 - Flex

```tsx
import { withLayout } from "./Layout";

// 没有导入 Section

const FlexInternal: ComponentConfig<Components["Flex"]> = {
  fields: { /* ... */ },
  defaultProps: {
    direction: "row",
    justifyContent: "flex-start",  // ← 使用 "flex-start"
    gap: 24,
    wrap: "wrap",
    // ❌ 没有设置 layout.grow
    items: [],
  },
  render: ({ justifyContent, direction, gap, wrap, items: Items }) => {
    return (
      <div  {/* ← 直接使用 div */}
        style={{
          display: "flex",  {/* ← 手动设置 */}
          justifyContent,
          flexDirection: direction,
          gap: `${gap}px`,  {/* ← 手动添加 px */}
          flexWrap: wrap,
          padding: "16px 0",  {/* ← 手动设置 padding */}
        }}
      >
        <Items />  {/* ← 没有 disallow、className */}
      </div>
    );
  },
};

export const Flex = withLayout(FlexInternal);
```

### 3. CSS 对比

#### 官方 Demo - Flex CSS

```css
.Flex {
  display: flex;
  flex-wrap: wrap;
  height: 100%;
}

.Flex-item {
  flex: 1;  /* ← 子项自动扩展 */
}
```

#### 本项目 - Flex CSS

```css
/* 无 CSS 文件 */
```

---

## 🔑 关键差异总结

### 1. **Section 组件的使用**

| 方面 | 官方 Demo | 本项目 |
|------|-----------|--------|
| **Grid** | `<Section>` 包裹 | 无包裹 |
| **Flex** | `<Section style={{ height: "100%" }}>` | 无包裹 |
| **作用** | 提供统一的 padding 和 max-width | 手动设置 padding |

**官方 Section 组件功能：**
```tsx
<Section maxWidth="1280px">
  <div className="Section-inner">  {/* 居中 + max-width */}
    {children}
  </div>
</Section>
```

**CSS：**
```css
.Section:not(.Section .Section) {
  padding-inline-start: 16px;  /* 移动端 */
  padding-inline-end: 16px;
}

@media (min-width: 768px) {
  .Section:not(.Section .Section) {
    padding-inline-start: 24px;  /* 桌面端 */
    padding-inline-end: 24px;
  }
}

.Section-inner {
  margin-inline-start: auto;  /* 水平居中 */
  margin-inline-end: auto;
  width: 100%;
}
```

### 2. **Slot 的高级用法**

| 特性 | 官方 Demo | 本项目 |
|------|-----------|--------|
| **as 属性** | `<Items as={CustomSlot}>` | `<Items />` |
| **disallow 属性** | `disallow={["Hero", "Stats"]}` | 无 |
| **className** | `className={getClassName()}` | 无 |

**`as` 属性的作用：**
```tsx
const CustomSlot = (props: any) => {
  return <span {...props} />;  // 使用 span 而不是默认的 div
};

<Items as={CustomSlot} />
```

### 3. **justifyContent 的值差异**

| 组件 | 官方 Demo | 本项目 | 说明 |
|------|-----------|--------|------|
| Flex.justifyContent | `"start"` | `"flex-start"` | CSS 标准值不同 |

**官方使用简化值：**
```typescript
justifyContent: "start" | "center" | "end"
```

**本项目使用标准 CSS 值：**
```typescript
justifyContent: "flex-start" | "center" | "flex-end"
```

### 4. **默认值差异**

| 属性 | 官方 Demo | 本项目 |
|------|-----------|--------|
| Grid.numColumns | `4` | `3` |
| Flex.layout.grow | `true` | 未设置（默认 false） |

### 5. **样式处理方式**

| 方面 | 官方 Demo | 本项目 |
|------|-----------|--------|
| **CSS 方案** | CSS Modules | Inline Styles |
| **响应式设计** | ✅ 有（@media） | ❌ 无 |
| **类名工厂** | `getClassNameFactory` | 无 |
| **gap 单位** | 直接使用数字（无单位） | 手动添加 `px` |

---

##  建议改进项

### 🔴 高优先级

1. **让 Grid 也使用 withLayout**
   ```tsx
   export const Grid = withLayout(GridInternal);
   ```

2. **创建 Section 组件**
   - 统一容器的 padding 和 max-width
   - 提供响应式设计

3. **添加 disallow 限制**
   ```tsx
   <Items disallow={["Hero", "Stats"]} />
   ```

### 🟡 中优先级

4. **统一 justifyContent 的值**
   - 选项 A：使用官方的简化值 `"start" | "center" | "end"`
   - 选项 B：保持标准 CSS 值 `"flex-start" | "center" | "flex-end"`

5. **设置 Flex 默认 grow: true**
   ```tsx
   defaultProps: {
     layout: {
       grow: true,
     },
   }
   ```

### 🟢 低优先级

6. **引入 CSS Modules**
   - 创建 `Grid/styles.module.css`
   - 创建 `Flex/styles.module.css`
   - 实现响应式设计

7. **添加 CustomSlot**
   ```tsx
   const CustomSlot = (props: any) => <span {...props} />;
   <Items as={CustomSlot} />
   ```

8. **调整 Grid 默认列数**
   - 改为 `numColumns: 4`（与官方一致）

---

##  快速修复清单

如果要在本项目中快速对齐官方 Demo，需要：

- [ ] **1. 修改 Grid 组件**
  ```tsx
  // 添加 withLayout 导入
  import { withLayout } from "./Layout";
  
  // 改为内部组件 + 导出包装后的版本
  const GridInternal: ComponentConfig<Components["Grid"]> = { /* ... */ };
  export const Grid = withLayout(GridInternal);
  
  // 默认列数改为 4
  defaultProps: { numColumns: 4, gap: 24, items: [] }
  ```

- [ ] **2. 修改 Flex 组件**
  ```tsx
  // 设置默认 grow
  defaultProps: {
    // ...
    layout: { grow: true },
  }
  
  // 可选：改为简化值
  justifyContent: "start" | "center" | "end"
  ```

- [ ] **3. 创建 Section 组件**
  ```tsx
  // app/components/Section.tsx
  export const Section = ({ children, maxWidth = "1280px" }) => (
    <div style={{ padding: "16px" }}>
      <div style={{ maxWidth, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
  ```

- [ ] **4. 在 Grid 和 Flex 中使用 Section**
  ```tsx
  render: ({ /* ... */ }) => (
    <Section>
      <Items /* ... */ />
    </Section>
  )
  ```

---

##  学习要点

1. **官方 Demo 使用 CSS Modules** → 更好的样式隔离和响应式设计
2. **Section 组件是关键** → 提供统一的容器样式
3. **Slot 的高级用法** → `as`、`disallow`、`className` 属性
4. **withLayout 的统一应用** → Grid 也应该使用
5. **简化值的优势** → `"start"` 比 `"flex-start"` 更简洁
