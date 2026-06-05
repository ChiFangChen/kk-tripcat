import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";
import type { MouseEvent } from "react";
import { useApp } from "../context/AppContext";

interface Props {
  address?: string;
  googleMapUrl?: string;
  compact?: boolean;
}

export function AddressDisplay({ address, googleMapUrl, compact }: Props) {
  const { t } = useTranslation();
  const { showToast } = useApp();
  if (!address && !googleMapUrl) return null;

  async function copyAddress(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (!address) return;
    await navigator.clipboard.writeText(address);
    showToast({ type: "success", message: t("common.addressCopied") });
  }

  return (
    <div className={compact ? "address-display compact" : "address-display"}>
      {address && (
        <span className="address-display-text">
          {address}
          <button
            type="button"
            className="address-copy-btn"
            onClick={copyAddress}
            title={t("common.copyAddress")}
            aria-label={t("common.copyAddress")}
          >
            <FontAwesomeIcon icon={faCopy} />
          </button>
        </span>
      )}
      {googleMapUrl && (
        <a
          href={googleMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="map-link"
          onClick={(event) => event.stopPropagation()}
        >
          📍 Google Map
        </a>
      )}
    </div>
  );
}
