import { useEffect, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { lockModalScroll } from "../utils/modalScrollLock";

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export function FullScreenModal({ title, onClose, children }: Props) {
  useEffect(() => {
    return lockModalScroll();
  }, []);

  return (
    <div className="fullscreen-modal">
      <div className="fullscreen-modal-header">
        <button onClick={onClose} className="text-sky-600">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h2>{title}</h2>
        <div className="w-8" />
      </div>
      <div className="fullscreen-modal-body">{children}</div>
    </div>
  );
}
