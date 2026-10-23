import type { Config, Data, Slot } from "@puckeditor/core";
import type {
  ButtonDimensionsGroup,
  ButtonStyleGroup,
  ButtonTextGroup,
} from "./button-styles";
import type { WithLayout } from "./Layout";

// 定义所有组件的 Props 类型
export type Components = {
  Heading: WithLayout<{
    main: {
      text: string;
      level: 1 | 2 | 3 | 4 | 5 | 6;
      font: string;
      fontSize: number;
      textColor: string;
      lineHeight?: number;
      letterSpacing?: number;
      addLink: boolean;
      linkHref: string;
      openInNewWindow: boolean;
      align: "left" | "center" | "right";
    };
  }>;
  Text: WithLayout<{
    main: {
      /** Puck richtext：存 TipTap 导出的 HTML 字符串 */
      html: string;
    };
  }>;
  Button: WithLayout<{
    main: {
      label: string;
      href: string;
      openInSameTab: boolean;
      align: "left" | "center" | "right";
    };
    text: ButtonTextGroup;
    dimensions: ButtonDimensionsGroup;
    defaultStyle: ButtonStyleGroup;
    hoverStyle: ButtonStyleGroup;
    activeStyle: ButtonStyleGroup;
  }>;
  Card: WithLayout<{
    main: {
      title: string;
      description: string;
      imageUrl?: string;
      href?: string;
    };
  }>;
  Columns: {
    main: {
      numColumns: number;
      gap: number;
      equalColumnHeights: boolean;
      stackOnSmallScreens: boolean;
      stackingBehavior: "leftFirst" | "rightFirst";
      /** 各列宽度百分比，和为 100。缺省或均分时按等宽渲染。 */
      columnWidths?: number[];
    };
    /** 每列一个独立 slot，列数由 main.numColumns 驱动（resolveData 同步） */
    columns: Array<{ content: Slot }>;
  };
  Hero: {
    main: {
      title: string;
      subtitle: string;
      buttonText: string;
      buttonHref: string;
      backgroundImage?: string;
      align: "left" | "center";
    };
  };
  Flex: WithLayout<{
    main: {
      direction: "row" | "column";
      justifyContent: "start" | "center" | "end";
      gap: number;
      wrap: boolean;
      items: Slot;
    };
  }>;
  Image: WithLayout<{
    main: {
      src:
        | string
        | {
            url: string;
            filename?: string;
            size?: number | null;
            width?: number | null;
            height?: number | null;
          };
      hoverSrc?: {
        url: string;
        filename?: string;
        size?: number | null;
        width?: number | null;
        height?: number | null;
      } | null;
      alt: string;
      imageClickable: boolean;
      linkHref?: string;
      openInNewWindow?: boolean;
    };
    performance: {
      imageQuality: number;
      responsiveImage: boolean;
      loading: "eager" | "lazy" | "auto";
    };
    dimensions: {
      minHeight?: number;
      maxWidth?: number;
      height?: number;
      imageFit: "cover" | "contain" | "stretch";
      imagePosition: string;
      zoom: number;
      aspectRatio: "auto" | "16/9" | "4/3" | "3/2" | "1/1";
    };
    defaultStyle: {
      opacity: number;
      borderColor: string;
      borderThickness?: number;
      borderRadius?: number;
      boxShadow: boolean;
      boxShadowColor?: string;
      boxShadowOffsetX?: number;
      boxShadowOffsetY?: number;
      boxShadowBlur?: number;
      boxShadowSpread?: number;
    };
    hoverStyle: {
      opacity: number;
      borderColor: string;
      borderThickness?: number;
      borderRadius?: number;
      boxShadow: boolean;
      boxShadowColor?: string;
      boxShadowOffsetX?: number;
      boxShadowOffsetY?: number;
      boxShadowBlur?: number;
      boxShadowSpread?: number;
    };
  }>;
  Video: WithLayout<{
    main: {
      videoUrl: string;
      aspectRatio: "16:9" | "4:3";
      loading: "eager" | "lazy" | "auto";
      loop: boolean;
      autoplay: boolean;
      muteAudio: boolean;
      relatedVideosFromOtherChannels: boolean;
    };
  }>;
  Icon: WithLayout<{
    main: {
      iconId: string;
      height: number;
      align: "left" | "center" | "right";
      color: string;
      ariaLabel: string;
      addLink: boolean;
      linkHref: string;
      openInNewWindow: boolean;
    };
  }>;
  CustomHtml: WithLayout<{
    main: {
      html: string;
      css: string;
    };
  }>;
  RawHTML: WithLayout<{
    main: {
      html: string;
    };
  }>;
  Divider: WithLayout<{
    main: {
      thickness: number;
      color: string;
      style: "solid" | "dashed" | "dotted";
    };
  }>;
  Table: WithLayout<{
    main: {
      borderColor: string;
      borderWidth: number;
      tableBorderRadius: number;
    };
    header: {
      headerBackgroundColor: string;
      headerFont: string;
      headerSize: number;
      headerTextColor: string;
      headerLineHeight?: number;
      headerLetterSpacing: number;
      headerTextAlignment: "left" | "center" | "right";
    };
    tableColumns: {
      columns: Array<{
        name: string;
        content: Slot;
      }>;
      columnSpacing: number;
    };
    rows: {
      numberOfRows: number;
      rowBackgroundColor: string;
      rowSpacing: number;
    };
  }>;
  Container: WithLayout<{
    main: {
      entireContainerClickable: boolean;
      containerUrl: string;
      openInNewWindow: boolean;
      verticalAlign: "top" | "middle" | "bottom";
    };
    background: {
      backgroundType: "color" | "image" | "video";
      backgroundImage:
        | string
        | {
            url: string;
            filename?: string;
            size?: number | null;
            width?: number | null;
            height?: number | null;
          }
        | null;
      backgroundColor: string;
      backgroundVideo: string;
      sound: boolean;
      backgroundSize: "cover" | "contain" | "custom";
      backgroundWidth?: number;
      backgroundHeight?: number;
      backgroundRepeat: "no-repeat" | "repeat";
      horizontalPosition: "left" | "center" | "right" | "custom";
      horizontalPositionValue: number;
      verticalPosition: "top" | "center" | "bottom" | "custom";
      verticalPositionValue: number;
      responsiveImage: boolean;
      loading: "eager" | "lazy" | "auto";
      parallaxEffect: boolean;
    };
    content: Slot;
  }>;
  Tabs: WithLayout<{
    /** 1-based，编辑时在画布点击 tab 头切换；发布 HTML 初始激活 tab */
    activeTabIndex?: number;
    main: {
      tabs: Array<{
        id?: string;
        /** 持久化为 string；编辑画布中 Puck 内联编辑时可能为 ReactNode */
        title: string;
        content: Slot;
      }>;
      theme: "rectangular" | "sloped" | "stretch";
      borderColor: string;
      borderThickness: number;
      font: string;
      fontSize: number;
    };
    defaultColor: {
      backgroundColor: string;
      textColor: string;
    };
    activeColors: {
      backgroundColor: string;
      textColor: string;
    };
  }>;

  Accordion: WithLayout<{
    /** 1-based，编辑时在画布点击 header 切换当前 pane；发布态由 items[].open 控制 */
    currentAccordionIndex?: number;
    main: {
      items: Array<{
        /** 持久化为 string；编辑画布中 Puck 内联编辑时可能为 ReactNode */
        title: string;
        open: boolean;
        content: Slot;
      }>;
      onlyOneOpen: boolean;
      openIcon: "none" | "chevron" | "plus";
    };
    paneHeaderText: {
      headerFont: string;
      headerSize: number;
      headerTextAlignment: "left" | "center" | "right";
      headingPadding: number;
    };
    colors: {
      headerBackgroundColor: string;
      headerTextColor: string;
      innerBackgroundColor: string;
      borderColor: string;
    };
  }>;
  Slider: WithLayout<{
    currentSlideIndex: number;
    items: Array<{
      /** 每个 Slide 项对应一个可编辑槽位 */
      slot: Slot;
    }>;
    main: {
      mode: "slide" | "loop";
      rewind: boolean;
      /** 可滑动的屏数（点/箭头切换的「页」数） */
      numberOfSlides: number;
      /** 每一屏横向并列的 slot 数量，类似 Grid 列数 */
      slidesPerPage: number;
      animation: string;
      autoSlide: boolean;
      showEachSlideSeconds: number;
      pauseAutoplayOnHover: boolean;
    };
    controls: {
      controlsOverContent: boolean;
      showArrows: boolean;
      arrowColor: string;
      arrowHeight: number;
      arrowBackground: boolean;
      showDots: boolean;
      selectedDotColor: string;
      unselectedDotColor: string;
      dotsSize: number;
      /** % of dotsSize; min 100, step 50 */
      selectedDotWidth: number;
      dotsLocation: "left" | "center" | "right";
      spaceBetweenDots: number;
    };
  }>;
};

// 导出配置类型
export type AppConfig = Config<Components>;

// 初始数据
export const initialData: Data = {
  content: [
    {
      type: "Table",
      props: {
        main: {
          borderColor: "#D5D6D7",
          borderWidth: 1,
          tableBorderRadius: 0,
        },
        header: {
          headerBackgroundColor: "#FFFFFF",
          headerFont: "",
          headerSize: 14,
          headerTextColor: "#22194D",
          headerLetterSpacing: 0,
          headerTextAlignment: "left",
        },
        tableColumns: {
          columns: [
            {
              name: "姓名",
              content: [
                {
                  type: "Text",
                  props: {
                    html: '<p style="font-size:16px">张三</p>',
                  },
                },
              ],
            },
            {
              name: "年龄",
              content: [
                {
                  type: "Text",
                  props: {
                    html: '<p style="font-size:16px;text-align:center">25</p>',
                  },
                },
              ],
            },
          ],
          columnSpacing: 10,
        },
        rows: {
          numberOfRows: 1,
          rowBackgroundColor: "#ffffff",
          rowSpacing: 10,
        },
      },
    },
  ],
  root: {
    props: {
      title: "My Visbuild Page",
    },
  },
};
