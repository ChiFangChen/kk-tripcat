import { useState } from "react";
import type { NoteTabType } from "../types";
import { TipsSection } from "./notes/TipsSection";
import { PoolSection } from "./notes/PoolSection";

export function NotesPage() {
  const [activeTab, setActiveTab] = useState<NoteTabType>("tips");

  return (
    <div>
      <div className="trip-tabs">
        <button
          className={`trip-tab ${activeTab === "tips" ? "active" : ""}`}
          onClick={() => setActiveTab("tips")}
        >
          Experiences & Tips
        </button>
        <button
          className={`trip-tab ${activeTab === "pool" ? "active" : ""}`}
          onClick={() => setActiveTab("pool")}
        >
          Pool
        </button>
      </div>
      <div className="page-container">
        {activeTab === "tips" && <TipsSection />}
        {activeTab === "pool" && <PoolSection />}
      </div>
    </div>
  );
}
