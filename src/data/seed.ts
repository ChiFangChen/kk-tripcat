import type { Template, TemplateCategory } from "../types";

// === DEFAULT TEMPLATE ===

const templateNotes = `*只能托運：武器／刀具／棍棒／液體>100ml／噴罐／長長的東西／蜂鳴器
*只能手提：鋰電池（ex: CR2032）`;

const templateCategories: TemplateCategory[] = [
  {
    name: "必要",
    subcategories: [],
    items: [
      { id: "tp-1", text: "護照" },
      { id: "tp-2", text: "飯店" },
      { id: "tp-3", text: "機票" },
      { id: "tp-4", text: "入境申請表、簽證" },
      { id: "tp-5", text: "保險" },
      { id: "tp-6", text: "sim / esim" },
      { id: "tp-7", text: "本國證件（身分證／健保卡）" },
      { id: "tp-8", text: "台幣／外幣 / 信用卡" },
      { id: "tp-9", text: "各種票卷" },
      { id: "tp-10", text: "筆" },
      { id: "tp-11", text: "耳機" },
      { id: "tp-12", text: "水壺（機場）" },
      { id: "tp-13", text: "頸枕 & 靠枕" },
      { id: "tp-14", text: "轉接頭 & 變壓器" },
    ],
  },
  {
    name: "穿著",
    subcategories: ["冬季"],
    items: [
      { id: "tp-15", text: "衣服" },
      { id: "tp-16", text: "褲子" },
      { id: "tp-17", text: "內褲" },
      { id: "tp-18", text: "襪子" },
      { id: "tp-19", text: "鞋子" },
      { id: "tp-20", text: "拖鞋" },
      { id: "tp-21", text: "睡衣" },
      { id: "tp-22", text: "圍巾", subcategory: "冬季" },
      { id: "tp-23", text: "手套", subcategory: "冬季" },
    ],
  },
  {
    name: "打扮",
    subcategories: [],
    items: [
      { id: "tp-24", text: "化妝品" },
      { id: "tp-25", text: "墨鏡" },
      { id: "tp-26", text: "飾品" },
    ],
  },
  {
    name: "盥洗用具",
    subcategories: [],
    items: [
      { id: "tp-27", text: "卸妝" },
      { id: "tp-28", text: "化妝棉" },
      { id: "tp-29", text: "潤髮" },
      { id: "tp-30", text: "洗面乳" },
      { id: "tp-31", text: "牙膏牙刷" },
    ],
  },
  {
    name: "保養",
    subcategories: [],
    items: [
      { id: "tp-32", text: "保養品" },
      { id: "tp-33", text: "面膜" },
      { id: "tp-34", text: "防曬" },
    ],
  },
  {
    name: "眼睛",
    subcategories: [],
    items: [
      { id: "tp-35", text: "隱形眼鏡" },
      { id: "tp-36", text: "藥水" },
      { id: "tp-37", text: "水盒" },
      { id: "tp-38", text: "眼鏡" },
    ],
  },
  {
    name: "藥品",
    subcategories: [],
    items: [
      { id: "tp-39", text: "保健食品" },
      { id: "tp-40", text: "口服藥" },
      { id: "tp-41", text: "外用藥" },
      { id: "tp-42", text: "痠痛藥膏 & 貼片" },
      { id: "tp-43", text: "ok bon" },
    ],
  },
  {
    name: "生活",
    subcategories: [],
    items: [
      { id: "tp-44", text: "陽傘" },
      { id: "tp-45", text: "防蚊" },
      { id: "tp-46", text: "墊子秤" },
      { id: "tp-47", text: "口罩" },
      { id: "tp-48", text: "購物袋" },
      { id: "tp-49", text: "壓縮袋" },
      { id: "tp-50", text: "髒衣服袋" },
    ],
  },
  {
    name: "泳裝",
    subcategories: [],
    items: [
      { id: "tp-51", text: "泳衣" },
      { id: "tp-52", text: "泳帽" },
      { id: "tp-53", text: "蛙鏡" },
      { id: "tp-54", text: "毛巾" },
      { id: "tp-55", text: "罩衫" },
    ],
  },
  {
    name: "手機相關",
    subcategories: [],
    items: [
      { id: "tp-56", text: "手機掛繩祖" },
      { id: "tp-57", text: "行動電源" },
      { id: "tp-58", text: "充電線" },
      { id: "tp-59", text: "手機架" },
      { id: "tp-60", text: "腳架／自拍棒（藍牙控制器 & 電池）" },
    ],
  },
  {
    name: "滑雪",
    subcategories: ["護具"],
    items: [
      { id: "tp-61", text: "雪衣" },
      { id: "tp-62", text: "雪褲" },
      { id: "tp-63", text: "內層" },
      { id: "tp-64", text: "中層" },
      { id: "tp-65", text: "保暖褲" },
      { id: "tp-66", text: "襪子" },
      { id: "tp-67", text: "帽子" },
      { id: "tp-68", text: "內層手套（滑手機）" },
      { id: "tp-69", text: "外層手套" },
      { id: "tp-70", text: "雪鏡" },
      { id: "tp-71", text: "手腕", subcategory: "護具" },
      { id: "tp-72", text: "屁股", subcategory: "護具" },
      { id: "tp-73", text: "膝蓋", subcategory: "護具" },
    ],
  },
];

export const defaultTemplate: Template = {
  id: "default-template",
  notes: templateNotes,
  categories: templateCategories,
  shoppingItems: [],
};
