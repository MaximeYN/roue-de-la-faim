import { describe, it, expect, vi } from "vitest";
import { renderCuisineOptions, renderResultCard, renderError, setScanButtonEnabled, renderScanHint } from "../src/ui.js";

describe("renderCuisineOptions", () => {
  it("adds Tous first then the given tags", () => {
    const select = document.createElement("select");
    renderCuisineOptions(select, ["italian", "korean"]);
    expect([...select.options].map((o) => o.value)).toEqual(["Tous", "italian", "korean"]);
  });
});

describe("renderResultCard", () => {
  const restaurant = { name: "Bap Time", cuisine: "korean", phone: "", website: "", openingHours: "", lat: null, lon: null };

  it("shows the name and cuisine", () => {
    const container = document.createElement("div");
    renderResultCard(container, restaurant, []);
    expect(container.querySelector("h2").textContent).toBe("Bap Time");
    expect(container.querySelector(".cuisine").textContent).toBe("korean");
  });

  it("shows a placeholder message when there are no avis", () => {
    const container = document.createElement("div");
    renderResultCard(container, restaurant, []);
    expect(container.querySelector(".no-avis").textContent).toBe("Aucun avis pour l'instant.");
  });

  it("lists avis when present", () => {
    const container = document.createElement("div");
    renderResultCard(container, restaurant, [{ restaurantName: "Bap Time", auteur: "Max", note: "5", commentaire: "Top" }]);
    const items = container.querySelectorAll(".avis-list li");
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain("Max");
    expect(items[0].textContent).toContain("Top");
  });

  it("escapes HTML in a commentaire to prevent injection", () => {
    const container = document.createElement("div");
    renderResultCard(container, restaurant, [
      { restaurantName: "Bap Time", auteur: "Max", note: "5", commentaire: "<img src=x onerror=alert(1)>" },
    ]);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".avis-list li").textContent).toContain("<img");
  });
});

describe("renderResultCard website link", () => {
  const base = { name: "Resto", cuisine: "", phone: "", openingHours: "", lat: null, lon: null };

  it("renders a safe http(s) website as a link", () => {
    const container = document.createElement("div");
    renderResultCard(container, { ...base, website: "https://example.com" }, []);
    const link = container.querySelector("a[href]");
    expect(link.getAttribute("href")).toBe("https://example.com");
  });

  it("drops a javascript: website instead of rendering it as a link", () => {
    const container = document.createElement("div");
    renderResultCard(container, { ...base, website: "javascript:alert(1)" }, []);
    expect(container.querySelector("a[href]")).toBeNull();
  });

  it("does not allow a website value to break out of the href attribute", () => {
    const container = document.createElement("div");
    renderResultCard(container, { ...base, website: 'https://x.com/" onmouseover="alert(1)' }, []);
    const link = container.querySelector("a[href]");
    expect(link.getAttribute("onmouseover")).toBeNull();
  });
});

describe("renderError", () => {
  it("renders the message and wires the retry button", () => {
    const container = document.createElement("div");
    const onRetry = vi.fn();
    renderError(container, "Panne réseau", onRetry);
    expect(container.textContent).toContain("Panne réseau");
    container.querySelector(".retry-button").click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("setScanButtonEnabled", () => {
  it("disables and enables the button", () => {
    const button = document.createElement("button");
    setScanButtonEnabled(button, false);
    expect(button.disabled).toBe(true);
    setScanButtonEnabled(button, true);
    expect(button.disabled).toBe(false);
  });
});

describe("renderScanHint", () => {
  it("shows a message when disabled and clears it when enabled", () => {
    const hint = document.createElement("p");
    renderScanHint(hint, false);
    expect(hint.textContent).toBe("Aucun resto pour ce type de cuisine.");
    renderScanHint(hint, true);
    expect(hint.textContent).toBe("");
  });
});
