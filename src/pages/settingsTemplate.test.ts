import { describe, expect, it } from "vitest";
import type { Template } from "../types";
import {
  buildTemplateItemDeleteMessage,
  updateTemplateItem,
} from "./settingsTemplate";

const template: Template = {
  id: "template-1",
  notes: "",
  shoppingItems: [],
  categories: [
    {
      name: "必要",
      items: [
        { id: "item-1", text: "護照", category: "必要" },
        {
          id: "item-2",
          text: "圍巾",
          category: "必要",
          subcategory: "冬季",
        },
      ],
    },
  ],
};

describe("updateTemplateItem", () => {
  it("updates an item text and subcategory inside a category", () => {
    const result = updateTemplateItem(template, "必要", "item-2", {
      text: "手套",
      subcategory: "冬季用品",
    });

    expect(result.categories[0].items[1]).toEqual({
      id: "item-2",
      text: "手套",
      category: "必要",
      subcategory: "冬季用品",
    });
  });

  it("removes an empty subcategory when updating an item", () => {
    const result = updateTemplateItem(template, "必要", "item-2", {
      text: "手套",
      subcategory: "",
    });

    expect(result.categories[0].items[1]).toEqual({
      id: "item-2",
      text: "手套",
      category: "必要",
    });
  });
});

describe("buildTemplateItemDeleteMessage", () => {
  it("includes the item name when deleting a preparation item", () => {
    expect(
      buildTemplateItemDeleteMessage(
        template,
        "必要",
        "item-2",
        (name) => `Delete ${name}?`,
      ),
    ).toBe("Delete 圍巾?");
  });
});
