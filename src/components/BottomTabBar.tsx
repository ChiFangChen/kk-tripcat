import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlane,
  faNoteSticky,
  faGear,
} from "@fortawesome/free-solid-svg-icons";
import type { TabType } from "../types";
import { useTranslation } from "react-i18next";

interface Props {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { key: TabType; label: string; icon: typeof faPlane }[] = [
  { key: "trips", label: "nav.trips", icon: faPlane },
  { key: "notes", label: "nav.notes", icon: faNoteSticky },
  { key: "settings", label: "nav.settings", icon: faGear },
];

export function BottomTabBar({ activeTab, onTabChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab-bar-item ${activeTab === tab.key ? "active" : ""}`}
          onClick={() => onTabChange(tab.key)}
        >
          <FontAwesomeIcon icon={tab.icon} className="text-lg" />
          <span>{t(tab.label)}</span>
        </button>
      ))}
    </div>
  );
}
