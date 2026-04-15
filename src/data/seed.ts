import type { Template, TemplateCategory } from "../types";

// === DEFAULT TEMPLATE ===

const templateNotes = `*有些東西只能托運（武器／刀具／棍棒／液體>100ml／噴罐／長長的東西／蜂鳴器）
*有些東西只能手提（電池）`;

const templateCategories: TemplateCategory[] = [
  {
    name: "旅遊",
    items: [
      { id: "tp-1", text: "護照", category: "旅遊" },
      { id: "tp-2", text: "機票", category: "旅遊" },
      { id: "tp-3", text: "sim", category: "旅遊" },
      { id: "tp-4", text: "證件（身分證／健保卡）", category: "旅遊" },
      { id: "tp-5", text: "台幣／信用卡（flygo）", category: "旅遊" },
      { id: "tp-6", text: "各種票卷", category: "旅遊" },
      { id: "tp-7", text: "筆", category: "旅遊" },
      { id: "tp-8", text: "耳機", category: "旅遊" },
      { id: "tp-9", text: "水壺（機場）", category: "旅遊" },
    ],
  },
  {
    name: "衣物",
    items: [
      { id: "tp-10", text: "衣服", category: "衣物" },
      { id: "tp-11", text: "褲子", category: "衣物" },
      { id: "tp-12", text: "內褲", category: "衣物" },
      { id: "tp-13", text: "襪子", category: "衣物" },
      { id: "tp-14", text: "鞋子", category: "衣物" },
      { id: "tp-15", text: "睡衣", category: "衣物" },
      { id: "tp-16", text: "墨鏡", category: "衣物" },
      { id: "tp-17", text: "圍巾", category: "衣物" },
      { id: "tp-18", text: "手套", category: "衣物" },
    ],
  },
  {
    name: "盥洗用具",
    items: [
      { id: "tp-20", text: "卸妝", category: "盥洗用具" },
      { id: "tp-21", text: "海綿卸妝棉", category: "盥洗用具" },
      { id: "tp-22", text: "化妝棉", category: "盥洗用具" },
      { id: "tp-23", text: "一次性洗臉巾", category: "盥洗用具" },
      { id: "tp-24", text: "潤髮", category: "盥洗用具" },
      { id: "tp-25", text: "洗面乳", category: "盥洗用具" },
      { id: "tp-26", text: "牙膏牙刷", category: "盥洗用具" },
      { id: "tp-27", text: "牙線棒", category: "盥洗用具" },
      { id: "tp-28", text: "牙線", category: "盥洗用具" },
      { id: "tp-29", text: "洗屁股", category: "盥洗用具" },
      { id: "tp-30", text: "刷身體", category: "盥洗用具" },
      { id: "tp-31", text: "洗頭杯", category: "盥洗用具" },
    ],
  },
  {
    name: "保養",
    items: [
      { id: "tp-32", text: "保養品", category: "保養" },
      { id: "tp-33", text: "蘆薈", category: "保養" },
      { id: "tp-34", text: "面膜", category: "保養" },
      { id: "tp-35", text: "防曬", category: "保養" },
      { id: "tp-36", text: "休足時間", category: "保養" },
    ],
  },
  {
    name: "美容",
    items: [
      { id: "tp-37", text: "化妝品", category: "美容" },
      { id: "tp-19", text: "飾品（耳環／手環／項鍊）", category: "美容" },
      // 頭髮
      { id: "tp-38", text: "髮夾", category: "美容", subcategory: "頭髮" },
      { id: "tp-39", text: "髮圈", category: "美容", subcategory: "頭髮" },
      { id: "tp-40", text: "橡皮筋", category: "美容", subcategory: "頭髮" },
      { id: "tp-41", text: "綁髮道具", category: "美容", subcategory: "頭髮" },
      { id: "tp-42", text: "梳子", category: "美容", subcategory: "頭髮" },
      // 指甲
      { id: "tp-43", text: "指甲刀", category: "美容", subcategory: "指甲" },
      { id: "tp-44", text: "剪刀", category: "美容", subcategory: "指甲" },
      {
        id: "tp-45",
        text: "凝膠指甲油 & 紫外光",
        category: "美容",
        subcategory: "指甲",
      },
    ],
  },
  {
    name: "眼睛",
    items: [
      { id: "tp-46", text: "洗眼液", category: "眼睛" },
      { id: "tp-47", text: "隱形眼鏡", category: "眼睛" },
      { id: "tp-48", text: "藥水", category: "眼睛" },
      { id: "tp-49", text: "水盒", category: "眼睛" },
      { id: "tp-50", text: "眼鏡", category: "眼睛" },
      { id: "tp-51", text: "鏡子", category: "眼睛" },
    ],
  },
  {
    name: "藥品",
    items: [
      { id: "tp-52", text: "胃藥", category: "藥品" },
      { id: "tp-53", text: "頭痛藥", category: "藥品" },
      { id: "tp-54", text: "暈車藥", category: "藥品" },
      { id: "tp-55", text: "保健食品", category: "藥品" },
      { id: "tp-56", text: "感冒藥", category: "藥品" },
      { id: "tp-57", text: "退燒藥", category: "藥品" },
      { id: "tp-58", text: "喉片", category: "藥品" },
      { id: "tp-59", text: "噴喉嚨", category: "藥品" },
      { id: "tp-60", text: "痠痛藥膏 or 貼片", category: "藥品" },
    ],
  },
  {
    name: "生活",
    items: [
      { id: "tp-61", text: "陽傘", category: "生活" },
      { id: "tp-62", text: "防蚊", category: "生活" },
      { id: "tp-63", text: "小包包", category: "生活" },
      { id: "tp-64", text: "小錢包", category: "生活" },
      { id: "tp-65", text: "購物袋", category: "生活" },
      { id: "tp-66", text: "墊子秤", category: "生活" },
      { id: "tp-67", text: "剪刀", category: "生活" },
      { id: "tp-68", text: "脖枕", category: "生活" },
      { id: "tp-69", text: "熱敷", category: "生活" },
      { id: "tp-70", text: "封口器", category: "生活" },
      { id: "tp-71", text: "膠帶", category: "生活" },
      { id: "tp-72", text: "拖鞋", category: "生活" },
      { id: "tp-73", text: "鞋子", category: "生活" },
      { id: "tp-74", text: "小袋子", category: "生活" },
      { id: "tp-75", text: "垃圾袋(塑膠袋)", category: "生活" },
      { id: "tp-76", text: "杯蓋", category: "生活" },
      { id: "tp-77", text: "電池（自拍棒、牙刷）", category: "生活" },
      { id: "tp-78", text: "針線包", category: "生活" },
      { id: "tp-79", text: "眼罩", category: "生活" },
      { id: "tp-80", text: "口罩", category: "生活" },
      { id: "tp-81", text: "ok bon", category: "生活" },
      { id: "tp-82", text: "吹風機", category: "生活" },
    ],
  },
  {
    name: "泳裝",
    items: [
      { id: "tp-83", text: "泳衣", category: "泳裝" },
      { id: "tp-84", text: "蛙鏡", category: "泳裝" },
      { id: "tp-85", text: "遮", category: "泳裝" },
      { id: "tp-86", text: "罩衫", category: "泳裝" },
    ],
  },
  {
    name: "手機相關",
    items: [
      { id: "tp-87", text: "立手機", category: "手機相關" },
      { id: "tp-88", text: "手機掛繩祖", category: "手機相關" },
      { id: "tp-89", text: "行動電源", category: "手機相關" },
      { id: "tp-90", text: "充電線", category: "手機相關" },
      {
        id: "tp-91",
        text: "充電線 type a 轉接頭（有些插座孔）",
        category: "手機相關",
      },
      { id: "tp-92", text: "腳架／自拍棒", category: "手機相關" },
    ],
  },
  {
    name: "很乾很冷",
    items: [
      { id: "tp-93", text: "大量小包衛生紙", category: "很乾很冷" },
      { id: "tp-94", text: "濕紙巾", category: "很乾很冷" },
      { id: "tp-95", text: "隨身小垃圾袋（裝鼻涕）", category: "很乾很冷" },
      { id: "tp-96", text: "小護士（鼻子裡）", category: "很乾很冷" },
    ],
  },
];

export const defaultTemplate: Template = {
  id: "default-template",
  notes: templateNotes,
  categories: templateCategories,
  shoppingItems: [],
};
