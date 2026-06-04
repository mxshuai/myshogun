/** 与 Shogun 默认面板一致：Body / 16px / Normal / 左对齐 / 深灰字 */
export const DEFAULT_TEXT_HTML =
  '<p style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 400; color: #374151; text-align: left; line-height: 1.5; margin: 0;">Text</p>';

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
  url: "http://",
  text: "Type your text here",
  title: "",
  openInNewWindow: true,
};

export const DEFAULT_IMAGE_FORM: ImageFormState = {
  url: "",
  alt: "",
  width: "",
  height: "",
  lockAspectRatio: true,
};
