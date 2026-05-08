import { describe, expect, it } from "vitest";
import { emitGlobalToast, subscribeGlobalToast } from "./toastBus";

describe("toast bus", () => {
  it("notifies the current global toast subscriber", () => {
    const messages: string[] = [];
    const unsubscribe = subscribeGlobalToast((toast) => {
      messages.push(toast.message);
    });

    emitGlobalToast({ type: "error", message: "部分圖片刪除失敗" });
    unsubscribe();
    emitGlobalToast({ type: "info", message: "不應該收到" });

    expect(messages).toEqual(["部分圖片刪除失敗"]);
  });
});
