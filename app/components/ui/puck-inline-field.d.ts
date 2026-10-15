import "@puckeditor/core";

declare module "@puckeditor/core" {
  interface BaseField {
    /**
     * 侧栏改成左右排列：标签在左，控件在右。
     * 适用于 number / text / select / radio / textarea。
     */
    inline?: boolean;
    /**
     * On/Off 单选改成左右排列的开关。
     * 适用于 options 为 false/true 的 radio 字段。
     */
    switch?: boolean;
    /** object 分组初始是否展开。未设置时默认收起。 */
    defaultOpen?: boolean;
  }
}
