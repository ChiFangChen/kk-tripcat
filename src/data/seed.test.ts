import { describe, expect, it } from "vitest";
import { defaultTemplate } from "./seed";

describe("defaultTemplate", () => {
  it("matches the default preparation template for new users", () => {
    expect(defaultTemplate.notes).toBe(
      [
        "*只能托運：武器／刀具／棍棒／液體>100ml／噴罐／長長的東西／蜂鳴器",
        "*只能手提：鋰電池（ex: CR2032）",
      ].join("\n"),
    );

    expect(defaultTemplate.categories.map((category) => category.name)).toEqual(
      [
        "必要",
        "穿著",
        "打扮",
        "盥洗用具",
        "保養",
        "眼睛",
        "藥品",
        "生活",
        "泳裝",
        "手機相關",
        "滑雪",
      ],
    );

    expect(
      defaultTemplate.categories.map((category) => ({
        name: category.name,
        itemCount: category.items.length,
      })),
    ).toEqual([
      { name: "必要", itemCount: 14 },
      { name: "穿著", itemCount: 9 },
      { name: "打扮", itemCount: 3 },
      { name: "盥洗用具", itemCount: 5 },
      { name: "保養", itemCount: 3 },
      { name: "眼睛", itemCount: 4 },
      { name: "藥品", itemCount: 5 },
      { name: "生活", itemCount: 7 },
      { name: "泳裝", itemCount: 5 },
      { name: "手機相關", itemCount: 5 },
      { name: "滑雪", itemCount: 13 },
    ]);

    const totalItems = defaultTemplate.categories.reduce(
      (sum, category) => sum + category.items.length,
      0,
    );
    expect(totalItems).toBe(73);

    expect(defaultTemplate.categories[1].items.slice(-2)).toEqual([
      {
        id: "tp-22",
        text: "圍巾",
        category: "穿著",
        subcategory: "冬季",
      },
      {
        id: "tp-23",
        text: "手套",
        category: "穿著",
        subcategory: "冬季",
      },
    ]);

    expect(defaultTemplate.categories[10].items.slice(-3)).toEqual([
      {
        id: "tp-71",
        text: "手腕",
        category: "滑雪",
        subcategory: "護具",
      },
      {
        id: "tp-72",
        text: "屁股",
        category: "滑雪",
        subcategory: "護具",
      },
      {
        id: "tp-73",
        text: "膝蓋",
        category: "滑雪",
        subcategory: "護具",
      },
    ]);

    expect(defaultTemplate.shoppingItems).toEqual([]);
  });
});
