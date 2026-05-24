import type { Template } from "../types";

export function updateTemplateItem(
  template: Template,
  categoryName: string,
  itemId: string,
  update: { text: string; subcategory?: string },
): Template {
  return {
    ...template,
    categories: template.categories.map((category) =>
      category.name === categoryName
        ? {
            ...category,
            items: category.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    text: update.text,
                    subcategory: update.subcategory?.trim() || undefined,
                  }
                : item,
            ),
          }
        : category,
    ),
  };
}

export function getTemplateItemName(
  template: Template,
  categoryName: string,
  itemId: string,
): string {
  return (
    template.categories
      .find((category) => category.name === categoryName)
      ?.items.find((item) => item.id === itemId)?.text || ""
  );
}

export function buildTemplateItemDeleteMessage(
  template: Template,
  categoryName: string,
  itemId: string,
): string {
  const itemName = getTemplateItemName(template, categoryName, itemId);
  return `確定要刪除準備事項『${itemName}』嗎？`;
}
