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
  faRoute,
  faThumbtack,
  faPlus,
  faPen,
  faSun,
  faTrash,
  faUserGear,
} from "@fortawesome/free-solid-svg-icons";
import { useApp } from "../context/AppContext";
import { FullScreenModal } from "../components/FullScreenModal";
import { Modal } from "../components/Modal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { SwitchControl } from "../components/SwitchControl";
import { generateId } from "../utils/id";
import type { TemplateCategory, TemplateItem } from "../types";
import {
  ItemEditorForm,
  type ItemEditorResult,
} from "../components/ItemEditorForm";
import {
  buildTemplateItemDeleteMessage,
  updateTemplateItem,
} from "./settingsTemplate";
import type { Language } from "../i18n";

type Theme = "light" | "dark";
type SettingsView = "index" | "ui" | "trip" | "template";

interface SettingsPageProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  textScale: number;
  onTextScaleChange: (scale: number) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  hideTripEditButtons: boolean;
  onHideTripEditButtonsChange: (hidden: boolean) => void;
  defaultSkipPreparation: boolean;
  onDefaultSkipPreparationChange: (skip: boolean) => void;
  defaultHideShoppingList: boolean;
  onDefaultHideShoppingListChange: (hidden: boolean) => void;
  onOpenAccountSettings: () => void;
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
  defaultSkipPreparation,
  onDefaultSkipPreparationChange,
  defaultHideShoppingList,
  onDefaultHideShoppingListChange,
  onOpenAccountSettings,
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

  if (view === "trip") {
    return (
      <TripPreferencesPage
        defaultSkipPreparation={defaultSkipPreparation}
        onDefaultSkipPreparationChange={onDefaultSkipPreparationChange}
        defaultHideShoppingList={defaultHideShoppingList}
        onDefaultHideShoppingListChange={onDefaultHideShoppingListChange}
        onOpenTemplate={() => setView("template")}
        onBack={() => setView("index")}
      />
    );
  }

  if (view === "template") {
    return <TemplateSettingsPage onBack={() => setView("trip")} />;
  }

  return (
    <div className="page-container">
      <h2 className="text-xl font-bold mb-4">{t("settings.title")}</h2>
      <div className="settings-list">
        <button
          className="settings-list-item"
          onClick={onOpenAccountSettings}
        >
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faUserGear} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">
              {t("settings.account.title")}
            </div>
            <div className="settings-list-description">
              {t("settings.account.description")}
            </div>
          </div>
          <FontAwesomeIcon
            icon={faChevronRight}
            className="settings-list-chevron"
          />
        </button>
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
          onClick={() => setView("trip")}
        >
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faRoute} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">
              {t("settings.tripPreferences.title")}
            </div>
            <div className="settings-list-description">
              {t("settings.tripPreferences.description")}
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
}: Pick<
  SettingsPageProps,
  | "theme"
  | "onThemeChange"
  | "textScale"
  | "onTextScaleChange"
  | "language"
  | "onLanguageChange"
  | "hideTripEditButtons"
  | "onHideTripEditButtonsChange"
> & { onBack: () => void }) {
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

function TripPreferencesPage({
  defaultSkipPreparation,
  onDefaultSkipPreparationChange,
  defaultHideShoppingList,
  onDefaultHideShoppingListChange,
  onOpenTemplate,
  onBack,
}: {
  defaultSkipPreparation: boolean;
  onDefaultSkipPreparationChange: (skip: boolean) => void;
  defaultHideShoppingList: boolean;
  onDefaultHideShoppingListChange: (hidden: boolean) => void;
  onOpenTemplate: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="page-title-group mb-4">
        <button className="page-back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h2 className="text-xl font-bold">
          {t("settings.tripPreferences.title")}
        </h2>
      </div>
      <div className="settings-list">
        <div className="settings-section-title">
          {t("settings.tripPreferences.preparationSection")}
        </div>
        <div className="settings-list-item">
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faThumbtack} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">
              {t("settings.tripPreferences.defaultSkipPreparation")}
            </div>
            <div className="settings-list-description">
              {t(
                "settings.tripPreferences.defaultSkipPreparationDescription",
              )}
            </div>
          </div>
          <SwitchControl
            checked={defaultSkipPreparation}
            ariaLabel={t(
              "settings.tripPreferences.defaultSkipPreparation",
            )}
            title={t("settings.tripPreferences.defaultSkipPreparation")}
            onChange={onDefaultSkipPreparationChange}
          />
        </div>
        <button className="settings-list-item" onClick={onOpenTemplate}>
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faThumbtack} />
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
        <div className="settings-section-title">
          {t("settings.tripPreferences.shoppingSection")}
        </div>
        <div className="settings-list-item">
          <div className="settings-list-icon">
            <FontAwesomeIcon icon={faGear} />
          </div>
          <div className="settings-list-content">
            <div className="settings-list-title">
              {t("settings.tripPreferences.defaultHideShoppingList")}
            </div>
            <div className="settings-list-description">
              {t(
                "settings.tripPreferences.defaultHideShoppingListDescription",
              )}
            </div>
          </div>
          <SwitchControl
            checked={defaultHideShoppingList}
            ariaLabel={t(
              "settings.tripPreferences.defaultHideShoppingList",
            )}
            title={t("settings.tripPreferences.defaultHideShoppingList")}
            onChange={onDefaultHideShoppingListChange}
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
  const [newCatSubs, setNewCatSubs] = useState<string[]>([]);
  const [newCatSubInput, setNewCatSubInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "category"; categoryName: string }
    | { type: "item"; categoryName: string; itemId: string }
    | { type: "subcategory"; categoryName: string; subcategoryName: string }
    | null
  >(null);

  // Edit subcategory via FullScreenModal (from card list)
  const [editingSubFromCard, setEditingSubFromCard] = useState<{
    categoryName: string;
    subcategoryName: string;
  } | null>(null);
  const [editSubNewName, setEditSubNewName] = useState("");

  // Add/edit item state
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{
    categoryName: string;
    itemId: string;
  } | null>(null);

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

  function openAddCategory() {
    setNewCatName("");
    setNewCatSubs([]);
    setNewCatSubInput("");
    setAddingCategory(true);
  }

  function addNewCatSub() {
    const name = newCatSubInput.trim();
    if (!name || newCatSubs.includes(name)) return;
    setNewCatSubs((prev) => [...prev, name]);
    setNewCatSubInput("");
  }

  function addCategory() {
    if (!newCatName.trim()) return;
    const cat: TemplateCategory = { name: newCatName.trim(), subcategories: newCatSubs, items: [] };
    void saveTemplate(
      { ...template, categories: [...template.categories, cat] },
      () => {
        setNewCatName("");
        setNewCatSubs([]);
        setNewCatSubInput("");
        setAddingCategory(false);
      },
    );
  }

  function saveRenameCategory() {
    if (!editingCatName || !editCatNewName.trim()) return;
    const updated = template.categories.map((c) =>
      c.name === editingCatName
        ? { ...c, name: editCatNewName.trim() }
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
    return cat?.subcategories ?? [];
  }

  function addSubcategory() {
    if (!editingCatName || !addSubName.trim()) return;
    const name = addSubName.trim();
    const updated = template.categories.map((c) =>
      c.name === editingCatName && !c.subcategories.includes(name)
        ? { ...c, subcategories: [...c.subcategories, name] }
        : c,
    );
    void saveTemplate({ ...template, categories: updated }, () => {
      setAddSubName("");
      setAddingSubTo(false);
    });
  }

  function saveEditSubFromCard() {
    if (!editingSubFromCard || !editSubNewName.trim()) return;
    const { categoryName, subcategoryName: oldName } = editingSubFromCard;
    const newName = editSubNewName.trim();
    if (newName === oldName) {
      setEditingSubFromCard(null);
      return;
    }
    const updated = template.categories.map((c) => {
      if (c.name !== categoryName) return c;
      return {
        ...c,
        subcategories: c.subcategories.map((s) => (s === oldName ? newName : s)),
        items: c.items.map((i) =>
          i.subcategory === oldName ? { ...i, subcategory: newName } : i,
        ),
      };
    });
    void saveTemplate({ ...template, categories: updated }, () => {
      setEditingSubFromCard(null);
    });
  }

  function renameSubcategory(catName: string) {
    if (!renamingSub || !renamingSub.new.trim()) return;
    const newName = renamingSub.new.trim();
    const updated = template.categories.map((c) => {
      if (c.name !== catName) return c;
      return {
        ...c,
        subcategories: c.subcategories.map((s) =>
          s === renamingSub.old ? newName : s,
        ),
        items: c.items.map((i) =>
          i.subcategory === renamingSub.old
            ? { ...i, subcategory: newName }
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
        subcategories: c.subcategories.filter((s) => s !== subName),
        items: c.items.map((i) =>
          i.subcategory === subName ? { ...i, subcategory: undefined } : i,
        ),
      };
    });
    void saveTemplate({ ...template, categories: updated });
  }

  function handleAddItem(catName: string, result: ItemEditorResult) {
    const item: TemplateItem = {
      id: generateId(),
      text: result.text,
      subcategory: result.subcategory,
    };
    const updated = template.categories.map((c) => {
      if (c.name !== catName) return c;
      const newSubs =
        result.subcategory && !c.subcategories.includes(result.subcategory)
          ? [...c.subcategories, result.subcategory]
          : c.subcategories;
      return { ...c, subcategories: newSubs, items: [...c.items, item] };
    });
    void saveTemplate({ ...template, categories: updated }, () => {
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

  function handleEditItem(result: ItemEditorResult) {
    if (!editingItem) return;
    const targetCat = result.category || editingItem.categoryName;
    const sameCategory = targetCat === editingItem.categoryName;

    if (sameCategory) {
      void saveTemplate(
        updateTemplateItem(
          template,
          editingItem.categoryName,
          editingItem.itemId,
          { text: result.text, subcategory: result.subcategory ?? "" },
        ),
        () => setEditingItem(null),
      );
    } else {
      const updatedItem: TemplateItem = {
        id: editingItem.itemId,
        text: result.text,
        subcategory: result.subcategory,
      };
      const updated = template.categories.map((c) => {
        if (c.name === editingItem.categoryName) {
          return { ...c, items: c.items.filter((i) => i.id !== editingItem.itemId) };
        }
        if (c.name === targetCat) {
          const newSubs =
            result.subcategory && !c.subcategories.includes(result.subcategory)
              ? [...c.subcategories, result.subcategory]
              : c.subcategories;
          return { ...c, subcategories: newSubs, items: [...c.items, updatedItem] };
        }
        return c;
      });
      void saveTemplate({ ...template, categories: updated }, () =>
        setEditingItem(null),
      );
    }
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
          onClick={openAddCategory}
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
                onClick={() => setAddingItemTo(cat.name)}
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
                    <div className="flex justify-between items-center mt-3 mb-1 first:mt-1 pl-1 border-l-2 border-slate-300 dark:border-slate-600">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">
                        {sub}
                      </p>
                      <div className="flex gap-1">
                        <button
                          className="text-slate-400 dark:text-slate-500 text-xs p-1 rounded hover:text-slate-600 dark:hover:text-slate-300"
                          onClick={() => {
                            setEditingSubFromCard({
                              categoryName: cat.name,
                              subcategoryName: sub,
                            });
                            setEditSubNewName(sub);
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faPen}
                            className="text-[10px]"
                          />
                        </button>
                        <button
                          className="text-slate-400 dark:text-slate-500 text-xs p-1 rounded hover:text-red-500"
                          onClick={() =>
                            setConfirmDelete({
                              type: "subcategory",
                              categoryName: cat.name,
                              subcategoryName: sub,
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
                          onClick={() =>
                            setEditingItem({
                              categoryName: cat.name,
                              itemId: item.id,
                            })
                          }
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
        <FullScreenModal
          title={t("settings.template.addCategory")}
          onClose={() => setAddingCategory(false)}
        >
          <div className="form-group">
            <label className="form-label">
              {t("settings.template.categoryName")}
            </label>
            <input
              className="form-input"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("settings.template.subcategory")}
            </label>
            {newCatSubs.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {newCatSubs.map((sub) => (
                  <span
                    key={sub}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 rounded"
                  >
                    {sub}
                    <button
                      className="text-slate-400 hover:text-slate-600"
                      onClick={() =>
                        setNewCatSubs((prev) => prev.filter((s) => s !== sub))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="form-input flex-1"
                value={newCatSubInput}
                onChange={(e) => setNewCatSubInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNewCatSub()}
                placeholder={t("settings.template.newSubcategory")}
              />
              <button
                className="btn btn-sm btn-secondary"
                onClick={addNewCatSub}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>

          <button className="btn btn-primary w-full" onClick={addCategory}>
            {t("common.add")}
          </button>
        </FullScreenModal>
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
                      addSubcategory();
                    }
                  }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={addSubcategory}
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

      {/* Edit subcategory from card */}
      {editingSubFromCard && (
        <FullScreenModal
          title={t("settings.template.editNamed", {
            name: editingSubFromCard.subcategoryName,
          })}
          onClose={() => setEditingSubFromCard(null)}
        >
          <div className="form-group">
            <label className="form-label">
              {t("settings.template.subcategory")}
            </label>
            <input
              className="form-input"
              value={editSubNewName}
              onChange={(e) => setEditSubNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveEditSubFromCard()}
              autoFocus
            />
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary w-full"
              onClick={saveEditSubFromCard}
            >
              {t("common.save")}
            </button>
          </div>
        </FullScreenModal>
      )}

      {/* Add item */}
      {addingItemTo && (
        <FullScreenModal
          title={t("settings.template.addItemTo", { name: addingItemTo })}
          onClose={() => setAddingItemTo(null)}
        >
          <ItemEditorForm
            subcategories={getSubcategories(addingItemTo)}
            saveLabel={t("common.add")}
            onSave={(r) => handleAddItem(addingItemTo, r)}
            onCancel={() => setAddingItemTo(null)}
          />
        </FullScreenModal>
      )}

      {/* Edit item */}
      {editingItem &&
        (() => {
          const cat = template.categories.find(
            (c) => c.name === editingItem.categoryName,
          );
          const item = cat?.items.find((i) => i.id === editingItem.itemId);
          if (!item) return null;
          const categoryInfos = template.categories.map((c) => ({
            name: c.name,
            subcategories: c.subcategories,
          }));
          return (
            <FullScreenModal
              title={t("settings.template.editPreparationItem")}
              onClose={() => setEditingItem(null)}
            >
              <ItemEditorForm
                categories={categoryInfos}
                initialCategory={editingItem.categoryName}
                initialText={item.text}
                initialSubcategory={item.subcategory}
                saveLabel={t("common.save")}
                onSave={handleEditItem}
                onCancel={() => setEditingItem(null)}
                onDelete={() =>
                  setConfirmDelete({
                    type: "item",
                    categoryName: editingItem.categoryName,
                    itemId: editingItem.itemId,
                  })
                }
              />
            </FullScreenModal>
          );
        })()}
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
