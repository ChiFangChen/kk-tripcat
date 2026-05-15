let activeLockCount = 0;
let originalBodyOverflow = "";
let originalBodyTouchAction = "";
let originalBodyPosition = "";
let originalBodyTop = "";
let originalBodyWidth = "";
let originalHtmlOverflow = "";
let lockedScrollY = 0;

export function lockModalScroll() {
  if (activeLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalBodyTouchAction = document.body.style.touchAction;
    originalBodyPosition = document.body.style.position;
    originalBodyTop = document.body.style.top;
    originalBodyWidth = document.body.style.width;
    originalHtmlOverflow = document.documentElement.style.overflow;
    lockedScrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
  }

  activeLockCount += 1;

  return () => {
    activeLockCount = Math.max(0, activeLockCount - 1);
    if (activeLockCount > 0) return;

    document.body.style.overflow = originalBodyOverflow;
    document.body.style.touchAction = originalBodyTouchAction;
    document.body.style.position = originalBodyPosition;
    document.body.style.top = originalBodyTop;
    document.body.style.width = originalBodyWidth;
    document.documentElement.style.overflow = originalHtmlOverflow;
    window.scrollTo(0, lockedScrollY);
  };
}
