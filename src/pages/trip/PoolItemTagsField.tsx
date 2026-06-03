import { useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizePoolItemTags } from "./shoppingTypes";

interface PoolItemTagsFieldProps {
  tags?: string[];
  suggestions?: string[];
  onChange: (tags: string[]) => void;
}

export function PoolItemTagsField({
  tags,
  suggestions,
  onChange,
}: PoolItemTagsFieldProps) {
  const { t } = useTranslation();
  const [draftTag, setDraftTag] = useState("");
  const normalizedTags = normalizePoolItemTags(tags);
  const availableSuggestions = normalizePoolItemTags(suggestions).filter(
    (tag) => !normalizedTags.includes(tag),
  );

  function addTag(tag: string) {
    const nextTags = normalizePoolItemTags([...normalizedTags, tag]);
    if (nextTags.length === normalizedTags.length) return;
    onChange(nextTags);
    setDraftTag("");
  }

  function removeTag(tag: string) {
    onChange(normalizedTags.filter((entry) => entry !== tag));
  }

  return (
    <div className="form-group">
      <label className="form-label">{t("shopping.form.categoryTags")}</label>
      {normalizedTags.length > 0 && (
        <div className="pool-tag-row mb-2">
          {normalizedTags.map((tag) => (
            <span key={tag} className="pool-tag-chip pool-tag-chip-selected">
              <span>{tag}</span>
              <button
                type="button"
                className="pool-tag-remove"
                aria-label={t("shopping.form.removeCategoryTag", { tag })}
                onClick={() => removeTag(tag)}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="form-input"
          value={draftTag}
          onChange={(event) => setDraftTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            addTag(draftTag);
          }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => addTag(draftTag)}
        >
          {t("common.add")}
        </button>
      </div>
      {availableSuggestions.length > 0 && (
        <div className="pool-tag-row mt-2">
          {availableSuggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              className="pool-tag-chip pool-tag-chip-suggestion"
              onClick={() => addTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
