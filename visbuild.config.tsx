import type { Config } from "@puckeditor/core";
import { Heading } from "./app/components/Heading";
import { Text } from "./app/components/Text";
import { Button } from "./app/components/Button";
import { Card } from "./app/components/Card";
import { Columns, Grid } from "./app/components/Columns";
import { Hero } from "./app/components/Hero";
import { Flex } from "./app/components/Flex";
import { Image } from "./app/components/Image";
import { Video } from "./app/components/Video";
import { Divider } from "./app/components/Divider";
import { Icon } from "./app/components/Icon";
import { Spacer } from "./app/components/Spacer";
import { Table } from "./app/components/Table";
import { Container } from "./app/components/Container";
import { Tabs } from "./app/components/Tabs";
import { Accordion } from "./app/components/Accordion";
import { Slider } from "./app/components/Slider";
import { CustomHtml } from "./app/components/CustomHtml";
import { RawHTML } from "./app/components/RawHTML";

export const config: Config = {
  root: {
    fields: {
      title: {
        type: "text",
        label: "Page title",
      },
      pagePath: {
        type: "text",
        label: "URL path",
      },
    },
  },
  categories: {
    layout: {
      title: "Layout",
      components: [
        "Columns",
        "Flex",
        "Spacer",
        "Table",
        "Container",
        "Tabs",
        "Accordion",
        "Slider",
        "Card",
      ],
    },
    content: {
      title: "Content",
      components: [
        "Heading",
        "Text",
        "Image",
        "Video",
        "CustomHtml",
        "RawHTML",
        "Button",
        "Divider",
        "Icon",
      ],
    },
    sections: {
      title: "Sections",
      components: ["Hero"],
    },
  },
  components: {
    Heading,
    Text,
    Button,
    Card,
    Columns,
    Grid,
    Hero,
    Flex,
    Image,
    Video,
    Icon,
    CustomHtml,
    RawHTML,
    Divider,
    Spacer,
    Table,
    Container,
    Tabs,
    Accordion,
    Slider,
  },
};
