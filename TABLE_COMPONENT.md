# Table 组件使用说明

## 概述
Table组件是一个功能强大的表格组件，采用直观的列基础设计。每个列都包含一个Slot，可以在编辑器中直接向列中拖入组件。表格会根据配置的列数和行数自动生成对应的单元格结构。

## 特性
- ✅ 以列（Column）为基础的简单设计
- ✅ 每个列都有一个Slot，可以直接拖入组件
- ✅ 可配置行数，自动生成多行表格
- ✅ 统一的表头样式配置
- ✅ 灵活的表格样式控制（边框、圆角、间距等）
- ✅ 支持列间距和行间距独立设置

## 属性面板结构

### Main（主要设置）
- **Border color**: 表格边框颜色
- **Border width**: 表格边框宽度（0-10px）
- **Table border radius**: 表格圆角（0-50px）

### Header（表头设置）
- **Header background color**: 表头背景色
- **Font**: 表头字体（输入字体名称）
- **Size**: 表头字体大小（8-72px）
- **Text color**: 表头文字颜色
- **Line height**: 表头行高（0.5-3em）
- **Letter spacing**: 表头字母间距（-5到20px）
- **Header text alignment**: 表头文字对齐方式（Left/Center/Right）

### Columns（列管理）
- **Manage columns**: 列管理数组
  - **Column name**: 列名（显示在表头，默认值"New Column"）
  - **Content**: 列的内容Slot（可拖入组件，像flex一样）
- **Column spacing**: 列间距（0-100px）

### Rows（行设置）
- **Number of rows**: 行数（1-100，默认值1）
- **Row background color**: 行背景色
- **Row spacing**: 行间距（0-100px）

## 使用方法

### 1. 添加Table组件
在Puck编辑器的Layout分类中找到Table组件，将其拖拽到页面中。

### 2. 配置列
在属性面板的Columns字段中：
1. 点击"+"添加新列
2. 编辑列的Column name（显示为表头文字，默认"New Column"）
3. 在Content Slot中直接拖入组件（与flex组件相同的方式）

### 3. 配置行数
在Rows部分设置Number of rows，表格会自动生成对应数量的行。

### 4. 自定义样式
- 在Main部分设置表格边框和圆角
- 在Header部分统一设置表头样式
- 在Columns部分设置列间距
- 在Rows部分设置行数、行背景色和行间距

## 示例

### 基础表格（2列3行）
```json
{
  "type": "Table",
  "props": {
    "borderColor": "#e0e0e0",
    "borderWidth": 1,
    "tableBorderRadius": 4,
    "headerBackgroundColor": "#f5f5f5",
    "headerSize": 14,
    "headerTextColor": "#000000",
    "headerTextAlignment": "left",
    "columns": [
      {
        "name": "姓名",
        "content": [
          {
            "type": "Text",
            "props": {
              "text": "张三",
              "size": "m",
              "align": "left",
              "color": "default"
            }
          }
        ]
      },
      {
        "name": "年龄",
        "content": [
          {
            "type": "Text",
            "props": {
              "text": "25",
              "size": "m",
              "align": "center",
              "color": "default"
            }
          }
        ]
      }
    ],
    "columnSpacing": 10,
    "numberOfRows": 1,
    "rowBackgroundColor": "#ffffff",
    "rowSpacing": 10
  }
}
```

## 设计特点

### 列Slot设计
- 每个列的content都是一个Slot
- 在编辑器中可以直接向列的Slot拖入组件（与flex相同）
- 列的内容会在所有行中重复显示
- 支持disallow属性限制某些组件类型

### 自动行生成
- 设置Number of rows后，表格会自动生成对应数量的行
- 所有行共享相同的列结构
- 每行的样式统一（背景色、间距等）

## 注意事项
1. **所有UI文本使用英文**，符合组件配置规范
2. **列的content是Slot**，支持拖入任何Puck组件（与flex相同）
3. **行数控制**：通过Number of rows统一控制，默认值为1
4. **表头统一配置**：所有列表头共享相同的样式设置
5. **颜色格式**：使用十六进制颜色值（如 #FF0000）
6. **Column name默认值**：新添加的列默认名称为"New Column"
7. **不需要Column ID**：列的标识由数组索引自动管理

## 常见问题

**Q: 如何添加新列？**
A: 在Columns字段点击"+ Add Column"按钮，新列会自动添加到表格中。

**Q: 如何设置表格有几行？**
A: 在Rows部分的Number of rows字段中设置所需的行数。

**Q: 如何在列中添加组件？**
A: 选中Table组件后，在编辑器画布中可以直接向每列的Slot拖入组件，操作方式与flex组件相同。

**Q: 表头样式如何设置？**
A: 在Header部分统一设置所有表头的样式，包括字体、大小、颜色等。

**Q: 如何调整列间距和行间距？**
A: 分别使用Column spacing和Row spacing字段进行独立控制。