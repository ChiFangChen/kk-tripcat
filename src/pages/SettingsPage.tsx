import { useState, type CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";
import {
  faChevronLeft,
  faChevronRight,
  faGear,
  faGlobe,
  faMoon,
  faPalette,
  faThumbtack,
  faPlus,
  faPen,
  faSun,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../context/AppContext";
import { FullScreenModal } from "../components/FullScreenModal";
import { Modal } from "../components/Modal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SwitchControl } from "../components/SwitchControl";
import { generateId } from "../utils/id";
import type { TemplateCategory, TemplateItem } from "../types";
import {
  buildTemplateItemDeleteMessage,
  updateTemplateItem,
} from "./settingsTemplate";
import type { Language } from "../i18n";

type Theme = "light" | "dark";
type SettingsView = "index" | "ui" | "template";

interface SettingsPageProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  textScale: number;
  onTextScaleChange: (scale: number) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  hideTripEditButtons: boolean;
  onHideTripEditButtonsChange: (hidden: boolean) => void;
}

export function SettingsPage({
  theme,
  onThemeChange,
  textScale,
  onTextScaleChange,
  language,
  onLanguageChange,
  hideTripEditButtons,
  onHideTripEditButtonsChange,
}: SettingsPageProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<SettingsView>("index");

  if (view === "ui") {
    return (
      <UiSettingsPage
        theme={theme}
        onThemeChange={onThemeChange}
        textScale={textScale}
        onTextScaleChange={onTextScaleChange}
        language={language}
        onLanguageChange={onLanguageChange}
        hideTripEditButtons={hideTripEditButtons}
        onHideTripEditButtonsChange={onHideTripEditButtonsChange}
        onBack={() => setView("index")}
      />
    );
  }

  if (view === "template") {
    return <TemplateSettingsPage onBack={() => setView("index")} />;
  }

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold mb-4">{t("settings.title")}</h2>
      <div className="settings-list">
        <button className="settings-list-item" onClick={() => setView("ui")}>
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faPalette} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">{t("settings.ui.title")}</div>
            <div className="settings-list-description">
              {t("settings.ui.description")}
            </div>
          </div>
          <FontAwesomeIcon
            icon={faChevronRight}
            className="settings-list-chevron"
          />
        </button>
        <button
          className="settings-list-item"
          onClick={() => setView("template")}
        >
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faGear} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">
              {t("settings.template.menuTitle")}
            </div>
            <div className="settings-list-description">
              {t("settings.template.description")}
            </div>
          </div>
          <FontAwesomeIcon
            icon={faChevronRight}
            className="settings-list-chevron"
          />
        </button>
      </div>
    </div>
  );
}

function UiSettingsPage({
  theme,
  onThemeChange,
  textScale,
  onTextScaleChange,
  language,
  onLanguageChange,
  hideTripEditButtons,
  onHideTripEditButtonsChange,
  onBack,
}: SettingsPageProps & { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="page-title-group mb-4">
        <button className="page-back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h2 className="text-xl font-bold">{t("settings.ui.title")}</h2>
      </div>
      <div className="settings-list">
        <div className="settings-list-item">
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={theme === "dark" ? faMoon : faSun} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">{t("settings.ui.theme")}</div>
            <div className="settings-list-description">
              {theme === "dark"
                ? t("settings.ui.darkMode")
                : t("settings.ui.lightMode")}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={`btn btn-sm ${theme === "light" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onThemeChange("light")}
            >
              {t("settings.ui.light")}
            </button>
            <button
              className={`btn btn-sm ${theme === "dark" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onThemeChange("dark")}
            >
              {t("settings.ui.dark")}
            </button>
          </div>
        </div>
        <div className="settings-list-item">
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faGlobe} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">
              {t("settings.ui.language")}
            </div>
            <div className="settings-list-description">
              {language === "zh-TW"
                ? t("settings.ui.traditionalChinese")
                : t("settings.ui.english")}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={`btn btn-sm ${language === "zh-TW" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onLanguageChange("zh-TW")}
            >
              繁中
            </button>
            <button
              className={`btn btn-sm ${language === "en" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onLanguageChange("en")}
            >
              English
            </button>
          </div>
        </div>
        <div className="settings-list-item settings-list-item-stacked">
          <div className="settings-list-row">
            <div className="settings-list-icon">
              <span className="settings-text-size-icon">Aa</span>
            </div>
            <div className="settings-list-content">
              <div className="settings-list-title">
                {t("settings.ui.textSize")}
              </div>
              <div className="settings-list-description">{textScale}%</div>
            </div>
          </div>
          <input
            className="settings-range"
            style={
              { "--range-progress": `${textScale - 100}%` } as CSSProperties
            }
            type="range"
            min="100"
            max="200"
            step="1"
            value={textScale}
            onChange={(e) => onTextScaleChange(Number(e.target.value))}
          />
        </div>
        <div className="settings-list-item">
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faPen} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">
              {t("settings.ui.hideTripEditButtons")}
            </div>
            <div className="settings-list-description">
              {t("settings.ui.hideTripEditButtonsDescription")}
            </div>
          </div>
          <SwitchControl
            checked={hideTripEditButtons}
            ariaLabel={t("settings.ui.hideTripEditButtons")}
            title={t("settings.ui.hideTripEditButtons")}
            onChange={onHideTripEditButtonsChange}
          />
        </div>
      </div>
    </div>
  );
}

function TemplateSettingsPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { state, setTemplate, showToast } = useApp();
  const template = state.template;
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(template.notes);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "category"; categoryName: string }
    | { type: "item"; categoryName: string; itemId: string }
    | { type: "subcategory"; categoryName: string; subcategoryName: string }
    | null
  >(null);

  // Add item state
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [newItemSubcategory, setNewItemSubcategory] = useState("");
  const [creatingNewSub, setCreatingNewSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [editingItem, setEditingItem] = useState<{
    categoryName: string;
    itemId: string;
  } | null>(null);
  const [editItemText, setEditItemText] = useState("");
  const [editItemSubcategory, setEditItemSubcategory] = useState("");
  const [editingItemNewSub, setEditingItemNewSub] = useState(false);

  // Edit category state (rename + manage subcategories)
  const [editingCatName, setEditingCatName] = useState<string | null>(null);
  const [editCatNewName, setEditCatNewName] = useState("");
  const [addingSubTo, setAddingSubTo] = useState(false);
  const [addSubName, setAddSubName] = useState("");
  const [renamingSub, setRenamingSub] = useState<{
    old: string;
    new: string;
  } | null>(null);

  async function saveTemplate(
    nextTemplate: typeof template,
    onSuccess?: () => void,
  ) {
    try {
      await setTemplate(nextTemplate);
      onSuccess?.();
    } catch {
      showToast({
        type: "error",
        message: t("settings.template.syncFailed"),
      });
    }
  }

  function saveNotes() {
    void saveTemplate({ ...template, notes: notesText }, () => {
      setEditingNotes(false);
    });
  }

  function addCategory() {
    if (!newCatName.trim()) return;
    const cat: TemplateCategory = { name: newCatName.trim(), items: [] };
    void saveTemplate(
      { ...template, categories: [...template.categories, cat] },
      () => {
        setNewCatName("");
        setAddingCategory(false);
      },
    );
  }

  function saveRenameCategory() {
    if (!editingCatName || !editCatNewName.trim()) return;
    const updated = template.categories.map((c) =>
      c.name === editingCatName
        ? {
            ...c,
            name: editCatNewName.trim(),
            items: c.items.map((i) => ({
              ...i,
              category: editCatNewName.trim(),
            })),
          }
        : c,
    );
    void saveTemplate({ ...template, categories: updated }, () => {
      setEditingCatName(editCatNewName.trim());
    });
  }

  function deleteCategory(name: string) {
    void saveTemplate({
      ...template,
      categories: template.categories.filter((c) => c.name !== name),
    });
  }

  // Subcategory management
  function getSubcategories(catName: string): string[] {
    const cat = template.categories.find((c) => c.name === catName);
    if (!cat) return [];
    const subs: string[] = [];
    for (const item of cat.items) {
      if (item.subcategory && !subs.includes(item.subcategory))
        subs.push(item.subcategory);
    }
    return subs;
  }

  function renameSubcategory(catName: string) {
    if (!renamingSub || !renamingSub.new.trim()) return;
    const updated = template.categories.map((c) => {
      if (c.name !== catName) return c;
      return {
        ...c,
        items: c.items.map((i) =>
          i.subcategory === renamingSub.old
            ? { ...i, subcategory: renamingSub.new.trim() }
            : i,
        ),
      };
    });
    void saveTemplate({ ...template, categories: updated }, () => {
      setRenamingSub(null);
    });
  }

  function deleteSubcategory(catName: string, subName: string) {
    const updated = template.categories.map((c) => {
      if (c.name !== catName) return c;
      return {
        ...c,
        items: c.items.map((i) =>
          i.subcategory === subName ? { ...i, subcategory: undefined } : i,
        ),
      };
    });
    void saveTemplate({ ...template, categories: updated });
  }

  // Add item with subcategory
  function openAddItem(catName: string) {
    const subs = getSubcategories(catName);
    setAddingItemTo(catName);
    setNewItemText("");
    setNewItemSubcategory(subs.length > 0 ? subs[0] : "");
    setCreatingNewSub(false);
    setNewSubName("");
  }

  function addItem(catName: string) {
    if (!newItemText.trim()) return;
    const subcategory = creatingNewSub
      ? newSubName.trim() || undefined
      : newItemSubcategory || undefined;
    const item: TemplateItem = {
      id: generateId(),
      text: newItemText.trim(),
      category: catName,
      subcategory,
    };
    const updated = template.categories.map((c) =>
      c.name === catName ? { ...c, items: [...c.items, item] } : c,
    );
    void saveTemplate({ ...template, categories: updated }, () => {
      setNewItemText("");
      setAddingItemTo(null);
    });
  }

  function deleteItem(catName: string, itemId: string) {
    const updated = template.categories.map((c) =>
      c.name === catName
        ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
        : c,
    );
    void saveTemplate({ ...template, categories: updated });
  }

  function openEditItem(catName: string, item: TemplateItem) {
    setEditingItem({ categoryName: catName, itemId: item.id });
    setEditItemText(item.text);
    setEditItemSubcategory(item.subcategory || "");
    setEditingItemNewSub(false);
  }

  function saveEditItem() {
    if (!editingItem || !editItemText.trim()) return;
    void saveTemplate(
      updateTemplateItem(
        template,
        editingItem.categoryName,
        editingItem.itemId,
        {
          text: editItemText.trim(),
          subcategory: editItemSubcategory,
        },
      ),
      () => {
        setEditingItem(null);
        setEditItemText("");
        setEditItemSubcategory("");
        setEditingItemNewSub(false);
      },
    );
  }

  // Open edit category
  function openEditCategory(catName: string) {
    setEditingCatName(catName);
    setEditCatNewName(catName);
    setAddingSubTo(false);
    setAddSubName("");
    setRenamingSub(null);
  }

  return (
    <div className="page-container">
      <div className="page-title-group mb-4">
        <button className="page-back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h2 className="text-xl font-bold">{t("settings.template.title")}</h2>
      </div>

      {/* Notes */}
      <div className="card mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-sm">
            <FontAwesomeIcon icon={faThumbtack} className="mr-1" />
            {t("settings.template.notes")}
          </h3>
          <button
            className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
            onClick={() => {
              setNotesText(template.notes);
              setEditingNotes(true);
            }}
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
        </div>
        <p className="text-xs whitespace-pre-wrap text-slate-400 dark:text-slate-500">
          {template.notes || t("common.empty")}
        </p>
      </div>

      {/* Categories */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{t("settings.template.categories")}</h3>
        <button
          className="btn-round-add"
          onClick={() => setAddingCategory(true)}
        >
          <FontAwesomeIcon icon={faPlus} className="text-xs" />
        </button>
      </div>

      {template.categories.map((cat) => (
        <div key={cat.name} className="card mb-2">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-sm">
              {cat.name} ({cat.items.length})
            </h4>
            <div className="flex gap-2">
              <button
                className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                onClick={() => openAddItem(cat.name)}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
              <button
                className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                onClick={() => openEditCategory(cat.name)}
              >
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button
                className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                onClick={() =>
                  setConfirmDelete({ type: "category", categoryName: cat.name })
                }
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </div>
          <div className="text-sm">
            {(() => {
              const subs: string[] = [];
              const grouped: Record<string, typeof cat.items> = {};
              for (const item of cat.items) {
                const sub = item.subcategory || "";
                if (!(sub in grouped)) {
                  grouped[sub] = [];
                  subs.push(sub);
                }
                grouped[sub].push(item);
              }
              const hasSubs = subs.some((s) => s !== "");
              return subs.map((sub) => (
                <div key={sub || "_none"}>
                  {hasSubs && sub && (
                    <p className="text-xs font-medium text-slate-400 mt-2 mb-0.5 first:mt-0">
                      {sub}
                    </p>
                  )}
                  {grouped[sub].map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center py-0.5"
                    >
                      <span className={hasSubs && sub ? "ml-3" : ""}>
                        {item.text}
                      </span>
                      <div className="flex gap-1">
                        <button
                          className="text-slate-400 dark:text-slate-500 text-xs p-1 bg-slate-100 dark:bg-slate-700 rounded"
                          data-e2e-id={`template_item_edit_button--${item.id}`}
                          onClick={() => openEditItem(cat.name, item)}
                        >
                          <FontAwesomeIcon
                            icon={faPen}
                            className="text-[10px]"
                          />
                        </button>
                        <button
                          className="text-slate-400 dark:text-slate-500 text-xs p-1 bg-slate-100 dark:bg-slate-700 rounded"
                          data-e2e-id={`template_item_delete_button--${item.id}`}
                          onClick={() =>
                            setConfirmDelete({
                              type: "item",
                              categoryName: cat.name,
                              itemId: item.id,
                            })
                          }
                        >
                          <FontAwesomeIcon
                            icon={faTrash}
                            className="text-[10px]"
                          />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>
      ))}

      {/* Edit notes modal */}
      {editingNotes && (
        <Modal
          title={t("settings.template.editNotes")}
          onClose={() => setEditingNotes(false)}
        >
          <textarea
            className="form-input"
            rows={5}
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
          />
          <button className="btn btn-primary w-full mt-3" onClick={saveNotes}>
            {t("common.save")}
          </button>
        </Modal>
      )}

      {/* Add category modal */}
      {addingCategory && (
        <Modal
          title={t("settings.template.addCategory")}
          onClose={() => setAddingCategory(false)}
        >
          <input
            className="form-input"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            autoFocus
          />
          <button className="btn btn-primary w-full mt-3" onClick={addCategory}>
            {t("common.add")}
          </button>
        </Modal>
      )}

      {/* Edit category full-screen modal (rename + subcategory management) */}
      {editingCatName && (
        <FullScreenModal
          title={t("settings.template.editNamed", { name: editingCatName })}
          onClose={() => setEditingCatName(null)}
        >
          {/* Rename */}
          <div className="form-group">
            <label className="form-label">
              {t("settings.template.categoryName")}
            </label>
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                value={editCatNewName}
                onChange={(e) => setEditCatNewName(e.target.value)}
              />
              {editCatNewName !== editingCatName && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={saveRenameCategory}
                >
                  {t("common.save")}
                </button>
              )}
            </div>
          </div>

          {/* Subcategories */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label !mb-0">
                {t("settings.template.subcategory")}
              </label>
              <button
                className="btn-round-add !w-6 !h-6"
                onClick={() => {
                  setAddingSubTo(true);
                  setAddSubName("");
                }}
              >
                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
              </button>
            </div>

            {addingSubTo && (
              <div className="flex gap-2 mb-2">
                <input
                  className="form-input flex-1"
                  value={addSubName}
                  onChange={(e) => setAddSubName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && addSubName.trim()) {
                      // Create a placeholder item with this subcategory so it appears
                      const item: TemplateItem = {
                        id: generateId(),
                        text: addSubName.trim(),
                        category: editingCatName,
                        subcategory: addSubName.trim(),
                      };
                      const updated = template.categories.map((c) =>
                        c.name === editingCatName
                          ? { ...c, items: [...c.items, item] }
                          : c,
                      );
                      void saveTemplate(
                        { ...template, categories: updated },
                        () => {
                          setAddSubName("");
                          setAddingSubTo(false);
                        },
                      );
                    }
                  }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (!addSubName.trim()) return;
                    const item: TemplateItem = {
                      id: generateId(),
                      text: addSubName.trim(),
                      category: editingCatName,
                      subcategory: addSubName.trim(),
                    };
                    const updated = template.categories.map((c) =>
                      c.name === editingCatName
                        ? { ...c, items: [...c.items, item] }
                        : c,
                    );
                    void saveTemplate(
                      { ...template, categories: updated },
                      () => {
                        setAddSubName("");
                        setAddingSubTo(false);
                      },
                    );
                  }}
                >
                  {t("common.add")}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAddingSubTo(false)}
                >
                  {t("common.cancel")}
                </button>
              </div>
            )}

            {getSubcategories(editingCatName).length === 0 && !addingSubTo ? (
              <p className="text-xs text-slate-400">
                {t("settings.template.noSubcategories")}
              </p>
            ) : (
              getSubcategories(editingCatName).map((sub) => (
                <div
                  key={sub}
                  className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0"
                >
                  {renamingSub?.old === sub ? (
                    <div className="flex gap-2 flex-1 mr-2">
                      <input
                        className="form-input flex-1 !py-1"
                        value={renamingSub.new}
                        onChange={(e) =>
                          setRenamingSub({
                            ...renamingSub,
                            new: e.target.value,
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && renameSubcategory(editingCatName)
                        }
                        autoFocus
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => renameSubcategory(editingCatName)}
                      >
                        {t("common.save")}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setRenamingSub(null)}
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm">{sub}</span>
                      <div className="flex gap-2">
                        <button
                          className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                          onClick={() => setRenamingSub({ old: sub, new: sub })}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button
                          className="text-slate-500 dark:text-slate-400 text-xs p-1.5 bg-slate-100 dark:bg-slate-700 rounded"
                          onClick={() =>
                            setConfirmDelete({
                              type: "subcategory",
                              categoryName: editingCatName,
                              subcategoryName: sub,
                            })
                          }
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </FullScreenModal>
      )}

      {/* Add item full-screen modal */}
      {addingItemTo && (
        <FullScreenModal
          title={t("settings.template.addItemTo", { name: addingItemTo })}
          onClose={() => setAddingItemTo(null)}
        >
          {(() => {
            const subs = getSubcategories(addingItemTo);
            return (
              <>
                {subs.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">
                      {t("settings.template.subcategory")}
                    </label>
                    {!creatingNewSub ? (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className={`btn btn-sm ${!newItemSubcategory ? "btn-primary" : "btn-secondary"}`}
                          onClick={() => setNewItemSubcategory("")}
                        >
                          {t("common.none")}
                        </button>
                        {subs.map((sub) => (
                          <button
                            key={sub}
                            className={`btn btn-sm ${newItemSubcategory === sub ? "btn-primary" : "btn-secondary"}`}
                            onClick={() => setNewItemSubcategory(sub)}
                          >
                            {sub}
                          </button>
                        ))}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setCreatingNewSub(true)}
                        >
                          <FontAwesomeIcon icon={faPlus} className="mr-1" />
                          {t("settings.template.newSubitem")}
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
                          onClick={() => setCreatingNewSub(false)}
                        >
                          {t("common.cancel")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">
                    {t("settings.template.itemName")}
                  </label>
                  <input
                    className="form-input"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && addItem(addingItemTo)
                    }
                    autoFocus={subs.length === 0}
                  />
                </div>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => addItem(addingItemTo)}
                >
                  {t("common.add")}
                </button>
              </>
            );
          })()}
        </FullScreenModal>
      )}
      {editingItem && (
        <FullScreenModal
          title={t("settings.template.editPreparationItem")}
          onClose={() => setEditingItem(null)}
        >
          {(() => {
            const subs = getSubcategories(editingItem.categoryName);
            return (
              <>
                {subs.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">
                      {t("settings.template.subcategory")}
                    </label>
                    {!editingItemNewSub ? (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className={`btn btn-sm ${!editItemSubcategory ? "btn-primary" : "btn-secondary"}`}
                          data-e2e-id="template_item_subcategory_button--none"
                          onClick={() => setEditItemSubcategory("")}
                        >
                          {t("common.none")}
                        </button>
                        {subs.map((sub) => (
                          <button
                            key={sub}
                            className={`btn btn-sm ${editItemSubcategory === sub ? "btn-primary" : "btn-secondary"}`}
                            data-e2e-id={`template_item_subcategory_button--${sub}`}
                            onClick={() => setEditItemSubcategory(sub)}
                          >
                            {sub}
                          </button>
                        ))}
                        <button
                          className="btn btn-sm btn-secondary"
                          data-e2e-id="template_item_new_subcategory_button"
                          onClick={() => {
                            setEditItemSubcategory("");
                            setEditingItemNewSub(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faPlus} className="mr-1" />
                          {t("settings.template.newSubitem")}
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="form-input flex-1"
                          data-e2e-id="template_item_subcategory_field"
                          value={editItemSubcategory}
                          onChange={(e) =>
                            setEditItemSubcategory(e.target.value)
                          }
                          autoFocus
                        />
                        <button
                          className="btn btn-sm btn-secondary"
                          data-e2e-id="template_item_cancel_new_subcategory_button"
                          onClick={() => setEditingItemNewSub(false)}
                        >
                          {t("common.cancel")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">
                    {t("settings.template.itemName")}
                  </label>
                  <input
                    className="form-input"
                    data-e2e-id="template_item_name_field"
                    value={editItemText}
                    onChange={(e) => setEditItemText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEditItem()}
                    autoFocus={subs.length === 0}
                  />
                </div>
                <button
                  className="btn btn-primary w-full"
                  data-e2e-id="template_item_save_button"
                  onClick={saveEditItem}
                >
                  {t("common.save")}
                </button>
              </>
            );
          })()}
        </FullScreenModal>
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          title={
            confirmDelete.type === "category"
              ? t("settings.template.deleteCategory")
              : confirmDelete.type === "item"
                ? t("settings.template.deleteItem")
                : t("settings.template.deleteSubcategory")
          }
          message={
            confirmDelete.type === "category"
              ? t("settings.template.deleteCategoryConfirm", {
                  name: confirmDelete.categoryName,
                })
              : confirmDelete.type === "item"
                ? buildTemplateItemDeleteMessage(
                    template,
                    confirmDelete.categoryName,
                    confirmDelete.itemId,
                    (name) =>
                      t("settings.template.deleteItemConfirm", { name }),
                  )
                : t("settings.template.deleteSubcategoryConfirm", {
                    name: confirmDelete.subcategoryName,
                  })
          }
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete.type === "category") {
              deleteCategory(confirmDelete.categoryName);
            } else if (confirmDelete.type === "item") {
              deleteItem(confirmDelete.categoryName, confirmDelete.itemId);
            } else {
              deleteSubcategory(
                confirmDelete.categoryName,
                confirmDelete.subcategoryName,
              );
            }
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}
