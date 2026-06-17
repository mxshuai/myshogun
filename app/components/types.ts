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
    /** @deprecated 旧字段，resolveData / render 回退 */
    size?: "xxxl" | "xxl" | "xl" | "l" | "m" | "s" | "xs";
  }>;
  Text: WithLayout<{
    /** Puck richtext：存 TipTap 导出的 HTML 字符串 */
    html: string;
    maxWidth?: string;
    /** @deprecated 旧字段，仅 render 回退读取 */
    text?: string;
  }>;
  Button: WithLayout<{
    label: string;
    href: string;
    openInSameTab: boolean;
    align: "left" | "center" | "right";
    text: ButtonTextGroup;
    dimensions: ButtonDimensionsGroup;
    defaultStyle: ButtonStyleGroup;
    hoverStyle: ButtonStyleGroup;
    activeStyle: ButtonStyleGroup;
  }>;
  Card: WithLayout<{
    title: string;
    description: string;
    imageUrl?: string;
    href?: string;
  }>;
  Columns: {
    numColumns: number;
    gap: number;
    equalColumnHeights: boolean;
    stackOnSmallScreens: boolean;
    stackingBehavior: "leftFirst" | "rightFirst";
    items: Slot;
  };
  /** @deprecated 已更名为 Columns，保留以兼容旧页面 JSON */
  Grid: {
    numColumns: number;
    gap: number;
    equalColumnHeights?: boolean;
    stackOnSmallScreens?: boolean;
    stackingBehavior?: "leftFirst" | "rightFirst";
    items: Slot;
  };
  Hero: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonHref: string;
    backgroundImage?: string;
    align: "left" | "center";
  };
  Flex: WithLayout<{
    direction: "row" | "column";
    justifyContent: "start" | "center" | "end";
    gap: number;
    wrap: "wrap" | "nowrap";
    items: Slot;
  }>;
  Image: WithLayout<{
    src: string;
    alt: string;
    imageClickable: boolean;
    linkHref?: string;
    openInNewWindow?: boolean;
    performance: {
      imageQuality: number;
      responsiveImage: boolean;
      loading: "eager" | "lazy" | "auto";
    };
    dimensions: {
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
    videoUrl: string;
    aspectRatio: "16:9" | "4:3";
    loading: "eager" | "lazy" | "auto";
    loop: boolean;
    autoplay: boolean;
    muteAudio: boolean;
    relatedVideosFromOtherChannels: boolean;
  }>;
  Icon: WithLayout<{
    iconId: string;
    height: string;
    align: "left" | "center" | "right";
    color: string;
    ariaLabel: string;
    addLink: boolean;
    linkHref: string;
    openInNewWindow: boolean;
  }>;
  CustomHtml: WithLayout<{
    html: string;
    css: string;
  }>;
  RawHTML: WithLayout<{
    html: string;
  }>;
  Divider: WithLayout<{
    thickness: number;
    color: string;
    style: "solid" | "dashed" | "dotted";
  }>;
  Table: WithLayout<{
    // Main
    borderColor: string;
    borderWidth: number;
    tableBorderRadius: number;
    
    // Header
    headerBackgroundColor: string;
    headerFont: string;
    headerSize: number;
    headerTextColor: string;
    headerLineHeight?: number;
    headerLetterSpacing: number;
    headerTextAlignment: "left" | "center" | "right";
    
    // Columns
    columns: Array<{
      name: string;
      content: Slot;
    }>;
    columnSpacing: number;
    
    // Rows
    numberOfRows: number;
    rowBackgroundColor: string;
    rowSpacing: number;
  }>;
  Container: WithLayout<{
    // Main
    entireContainerClickable: boolean;
    containerUrl: string;
    openInNewWindow: boolean;
    verticalAlign: "top" | "middle" | "bottom";
    
    // Background
    backgroundType: "color" | "image" | "video";
    backgroundImage: string;
    backgroundColor: string;
    backgroundVideo: string;
    videoMuted: boolean;
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
    
    // Content
    content: Slot;
  }>;
  Tabs: WithLayout<{
    /** 1-based，编辑时在画布点击 tab 头切换；发布 HTML 初始激活 tab */
    activeTabIndex?: number;
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
    items: Array<{
      /** 持久化为 string；编辑画布中 Puck 内联编辑时可能为 ReactNode */
      title: string;
      open: boolean;
      content: Slot;
    }>;
    onlyOneOpen: boolean;
    openIcon: "none" | "chevron" | "plus";
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
    mode: "slide" | "loop";
    rewind: boolean;
    /** 可滑动的屏数（点/箭头切换的「页」数） */
    numberOfSlides: number;
    /** 每一屏横向并列的 slot 数量，类似 Grid 列数 */
    slidesPerPage: number;
    /** 1-based，编辑时在画布点击箭头/圆点切换当前屏 slot */
    currentSlideIndex: number;
    animation: string;
    autoSlide: boolean;
    showEachSlideSeconds: number;
    pauseAutoplayOnHover: boolean;
    controlsOverContent: boolean;
    showArrows: boolean;
    arrowColor: string;
    arrowHeight: number;
    arrowBackground: boolean;
    showDots: boolean;
    selectedDotColor: string;
    unselectedDotColor: string;
    dotsSize: number;
    selectedDotWidth: number; /** % of dotsSize; min 100, step 50 */
    dotsLocation: "left" | "center" | "right";
    spaceBetweenDots: number;
    items: Array<{
      /** 每个 Slide 项对应一个可编辑槽位 */
      slot: Slot;
    }>;
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
        // Main
        borderColor: "#D5D6D7",
        borderWidth: 1,
        tableBorderRadius: 0,

        // Header
        headerBackgroundColor: "#FFFFFF",
        headerFont: "",
        headerSize: 14,
        headerTextColor: "#22194D",
        headerLetterSpacing: 0,
        headerTextAlignment: "left",
        
        // Columns
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
        
        // Rows
        numberOfRows: 1,
        rowBackgroundColor: "#ffffff",
        rowSpacing: 10,
      },
    },
  ],
  root: {
    props: {
      title: "My Visbuild Page",
    },
  },
};
