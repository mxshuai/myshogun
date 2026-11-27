/** Body / 16px / Normal / 左对齐 / 深灰字；字体继承 .visbuild-text / 全局栈，不写入行内 font-family */
export const DEFAULT_TEXT_HTML =
  '<p style="font-size: 16px; font-weight: 400; color: #374151; text-align: left; line-height: 1.5; margin: 0;">Text</p>';

/** 无编辑器时的侧栏占位（16px × 1.5） */
export const DEFAULT_TEXT_LINE_HEIGHT = "24px";

/** 无 mark 时侧栏字距反显为 0px（不写入文档） */
export const DEFAULT_TEXT_LETTER_SPACING = "0px";

export type LinkFormState = {
  url: string;
  text: string;
  title: string;
  openInNewWindow: boolean;
};

export type ImageFormState = {
  url: string;
  alt: string;
  width: string;
  height: string;
  lockAspectRatio: boolean;
};

export const DEFAULT_LINK_FORM: LinkFormState = {
  url: "",
  text: "Type your text here",
  title: "",
  openInNewWindow: false,
};

export const DEFAULT_IMAGE_FORM: ImageFormState = {
  url: "",
  alt: "",
  width: "",
  height: "",
  lockAspectRatio: true,
};
