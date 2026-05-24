import type { Template, TemplateCategory } from "../types";

// === DEFAULT TEMPLATE ===

const templateNotes = `*只能托運：武器／刀具／棍棒／液體>100ml／噴罐／長長的東西／蜂鳴器
*只能手提：鋰電池（ex: CR2032）`;

const templateCategories: TemplateCategory[] = [
  {
    name: "必要",
    items: [
      { id: "tp-1", text: "護照", category: "必要" },
      { id: "tp-2", text: "飯店", category: "必要" },
      { id: "tp-3", text: "機票", category: "必要" },
      { id: "tp-4", text: "入境申請表、簽證", category: "必要" },
      { id: "tp-5", text: "保險", category: "必要" },
      { id: "tp-6", text: "sim / esim", category: "必要" },
      {
        id: "tp-7",
        text: "本國證件（身分證／健保卡）",
        category: "必要",
      },
      {
        id: "tp-8",
        text: "台幣／外幣 / 信用卡",
        category: "必要",
      },
      { id: "tp-9", text: "各種票卷", category: "必要" },
      { id: "tp-10", text: "筆", category: "必要" },
      { id: "tp-11", text: "耳機", category: "必要" },
      { id: "tp-12", text: "水壺（機場）", category: "必要" },
      { id: "tp-13", text: "頸枕 & 靠枕", category: "必要" },
      { id: "tp-14", text: "轉接頭 & 變壓器", category: "必要" },
    ],
  },
  {
    name: "穿著",
    items: [
      { id: "tp-15", text: "衣服", category: "穿著" },
      { id: "tp-16", text: "褲子", category: "穿著" },
      { id: "tp-17", text: "內褲", category: "穿著" },
      { id: "tp-18", text: "襪子", category: "穿著" },
      { id: "tp-19", text: "鞋子", category: "穿著" },
      { id: "tp-20", text: "拖鞋", category: "穿著" },
      { id: "tp-21", text: "睡衣", category: "穿著" },
      { id: "tp-22", text: "圍巾", category: "穿著", subcategory: "冬季" },
      { id: "tp-23", text: "手套", category: "穿著", subcategory: "冬季" },
    ],
  },
  {
    name: "打扮",
    items: [
      { id: "tp-24", text: "化妝品", category: "打扮" },
      { id: "tp-25", text: "墨鏡", category: "打扮" },
      { id: "tp-26", text: "飾品", category: "打扮" },
    ],
  },
  {
    name: "盥洗用具",
    items: [
      { id: "tp-27", text: "卸妝", category: "盥洗用具" },
      { id: "tp-28", text: "化妝棉", category: "盥洗用具" },
      { id: "tp-29", text: "潤髮", category: "盥洗用具" },
      { id: "tp-30", text: "洗面乳", category: "盥洗用具" },
      { id: "tp-31", text: "牙膏牙刷", category: "盥洗用具" },
    ],
  },
  {
    name: "保養",
    items: [
      { id: "tp-32", text: "保養品", category: "保養" },
      { id: "tp-33", text: "面膜", category: "保養" },
      { id: "tp-34", text: "防曬", category: "保養" },
    ],
  },
  {
    name: "眼睛",
    items: [
      { id: "tp-35", text: "隱形眼鏡", category: "眼睛" },
      { id: "tp-36", text: "藥水", category: "眼睛" },
      { id: "tp-37", text: "水盒", category: "眼睛" },
      { id: "tp-38", text: "眼鏡", category: "眼睛" },
    ],
  },
  {
    name: "藥品",
    items: [
      { id: "tp-39", text: "保健食品", category: "藥品" },
      { id: "tp-40", text: "口服藥", category: "藥品" },
      { id: "tp-41", text: "外用藥", category: "藥品" },
      { id: "tp-42", text: "痠痛藥膏 & 貼片", category: "藥品" },
      { id: "tp-43", text: "ok bon", category: "藥品" },
    ],
  },
  {
    name: "生活",
    items: [
      { id: "tp-44", text: "陽傘", category: "生活" },
      { id: "tp-45", text: "防蚊", category: "生活" },
      { id: "tp-46", text: "墊子秤", category: "生活" },
      { id: "tp-47", text: "口罩", category: "生活" },
      { id: "tp-48", text: "購物袋", category: "生活" },
      { id: "tp-49", text: "壓縮袋", category: "生活" },
      { id: "tp-50", text: "髒衣服袋", category: "生活" },
    ],
  },
  {
    name: "泳裝",
    items: [
      { id: "tp-51", text: "泳衣", category: "泳裝" },
      { id: "tp-52", text: "泳帽", category: "泳裝" },
      { id: "tp-53", text: "蛙鏡", category: "泳裝" },
      { id: "tp-54", text: "毛巾", category: "泳裝" },
      { id: "tp-55", text: "罩衫", category: "泳裝" },
    ],
  },
  {
    name: "手機相關",
    items: [
      { id: "tp-56", text: "手機掛繩祖", category: "手機相關" },
      { id: "tp-57", text: "行動電源", category: "手機相關" },
      { id: "tp-58", text: "充電線", category: "手機相關" },
      { id: "tp-59", text: "手機架", category: "手機相關" },
      {
        id: "tp-60",
        text: "腳架／自拍棒（藍牙控制器 & 電池）",
        category: "手機相關",
      },
    ],
  },
  {
    name: "滑雪",
    items: [
      { id: "tp-61", text: "雪衣", category: "滑雪" },
      { id: "tp-62", text: "雪褲", category: "滑雪" },
      { id: "tp-63", text: "內層", category: "滑雪" },
      { id: "tp-64", text: "中層", category: "滑雪" },
      { id: "tp-65", text: "保暖褲", category: "滑雪" },
      { id: "tp-66", text: "襪子", category: "滑雪" },
      { id: "tp-67", text: "帽子", category: "滑雪" },
      { id: "tp-68", text: "內層手套（滑手機）", category: "滑雪" },
      { id: "tp-69", text: "外層手套", category: "滑雪" },
      { id: "tp-70", text: "雪鏡", category: "滑雪" },
      { id: "tp-71", text: "手腕", category: "滑雪", subcategory: "護具" },
      { id: "tp-72", text: "屁股", category: "滑雪", subcategory: "護具" },
      { id: "tp-73", text: "膝蓋", category: "滑雪", subcategory: "護具" },
    ],
  },
];

export const defaultTemplate: Template = {
  id: "default-template",
  notes: templateNotes,
  categories: templateCategories,
  shoppingItems: [],
};
