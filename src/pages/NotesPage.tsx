import type { NoteTabType } from "../types";
import { TipsSection } from "./notes/TipsSection";
import { PoolSection } from "./notes/PoolSection";
import { useTranslation } from "react-i18next";
import { usePersistentState } from "../hooks/usePersistentState";

export function NotesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = usePersistentState<NoteTabType>(
    "notesTab",
    "tips",
  );

  return (
    <div>
      <div className="trip-tabs notes-tabs">
        <button
          className={`trip-tab ${activeTab === "tips" ? "active" : ""}`}
          onClick={() => setActiveTab("tips")}
        >
          {t("notes.tips")}
        </button>
        <button
          className={`trip-tab ${activeTab === "pool" ? "active" : ""}`}
          onClick={() => setActiveTab("pool")}
        >
          {t("notes.pool")}
        </button>
      </div>
      <div className="page-container">
        {activeTab === "tips" && <TipsSection />}
        {activeTab === "pool" && <PoolSection />}
      </div>
    </div>
  );
}
