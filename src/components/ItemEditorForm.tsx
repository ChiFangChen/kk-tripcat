import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

interface CategoryInfo {
  name: string;
  subcategories: string[];
}

export interface ItemEditorResult {
  text: string;
  category?: string;
  subcategory?: string;
}

interface Props {
  categories?: CategoryInfo[];
  subcategories?: string[];
  initialCategory?: string;
  initialSubcategory?: string;
  initialText?: string;
  saveLabel: string;
  onSave: (result: ItemEditorResult) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function ItemEditorForm({
  categories,
  subcategories: subcategoriesProp,
  initialCategory,
  initialSubcategory,
  initialText,
  saveLabel,
  onSave,
  onCancel,
  onDelete,
}: Props) {
  const { t } = useTranslation();

  const [text, setText] = useState(initialText ?? "");
  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory ?? categories?.[0]?.name ?? "",
  );
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [selectedSubcategory, setSelectedSubcategory] = useState<
    string | undefined
  >(initialSubcategory);
  const [creatingSubcategory, setCreatingSubcategory] = useState(false);
  const [newSubName, setNewSubName] = useState("");

  const currentSubs = categories
    ? (categories.find((c) => c.name === selectedCategory)?.subcategories ?? [])
    : (subcategoriesProp ?? []);

  function selectCategory(name: string) {
    setSelectedCategory(name);
    setSelectedSubcategory(undefined);
    setCreatingSubcategory(false);
    setNewSubName("");
  }

  function handleSave() {
    if (!text.trim()) return;
    const category = creatingCategory
      ? newCategoryName.trim() || undefined
      : categories
        ? selectedCategory
        : undefined;
    const subcategory = creatingSubcategory
      ? newSubName.trim() || undefined
      : selectedSubcategory;
    onSave({ text: text.trim(), category, subcategory });
  }

  return (
    <div className="fullscreen-modal-form">
      {/* Category picker */}
      {categories && (
        <div className="form-group">
          <label className="form-label">
            {t("settings.template.category")}
          </label>
          {!creatingCategory ? (
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  className={`btn btn-sm ${selectedCategory === cat.name ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => selectCategory(cat.name)}
                >
                  {cat.name}
                </button>
              ))}
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCreatingCategory(true)}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1" />
                {t("settings.template.newCategory")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCreatingCategory(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Subcategory picker */}
      {!creatingCategory && currentSubs.length > 0 && (
        <div className="form-group">
          <label className="form-label">
            {t("settings.template.shortSubcategory")}
          </label>
          {!creatingSubcategory ? (
            <div className="flex gap-2 flex-wrap">
              <button
                className={`btn btn-sm ${!selectedSubcategory ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSelectedSubcategory(undefined)}
              >
                {t("common.none")}
              </button>
              {currentSubs.map((sub) => (
                <button
                  key={sub}
                  className={`btn btn-sm ${selectedSubcategory === sub ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setSelectedSubcategory(sub)}
                >
                  {sub}
                </button>
              ))}
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCreatingSubcategory(true)}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1" />
                {t("settings.template.newSubcategory")}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                autoFocus
              />
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setCreatingSubcategory(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Item text */}
      <div className="form-group">
        <label className="form-label">
          {t("settings.template.itemContent")}
        </label>
        <input
          className="form-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus={!creatingCategory && currentSubs.length === 0}
        />
      </div>

      {/* Actions */}
      <button className="btn btn-primary w-full" onClick={handleSave}>
        {saveLabel}
      </button>
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          {t("common.cancel")}
        </button>
        {onDelete && (
          <button
            className="btn btn-secondary btn-danger"
            onClick={onDelete}
          >
            <FontAwesomeIcon icon={faTrash} className="mr-1" />
            {t("common.delete")}
          </button>
        )}
      </div>
    </div>
  );
}
