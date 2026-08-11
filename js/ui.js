import { CONFIG } from "./config.js";

/* ============================================================
   UI INITIALIZATION
   ============================================================ */

export function initUi(onVicinityChange) {
  const closeButton =
    document.getElementById("pop-close");

  closeButton.addEventListener(
    "click",
    () => {
      document
        .getElementById("popup")
        .classList.remove("open");
    }
  );

  const slider =
    document.getElementById("vicinitySlider");

  const output =
    document.getElementById("vicinityValue");

  function updateVicinity() {
    const feet =
      Number(slider.value);

    CONFIG.vicinityBufferFeet =
      feet;

    output.textContent =
      feet + " ft";

    if (typeof onVicinityChange === "function") {
      onVicinityChange();
    }
  }

  slider.addEventListener(
    "input",
    updateVicinity
  );

  updateVicinity();
}


/* ============================================================
   STATUS
   ============================================================ */

export function setStatus(message) {
  const status =
    document.getElementById("status");

  status.textContent =
    message;

  status.style.display =
    "block";
}


export function hideStatus() {
  document
    .getElementById("status")
    .style.display = "none";
}


/* ============================================================
   FORMATTING
   ============================================================ */

export function fmt(value) {
  return value == null
    ? ""
    : String(value);
}


export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}


export function fmtCurrency(value) {
  const number =
    Number(
      String(value)
        .replace(/[^0-9.\-]/g, "")
    );

  if (!Number.isFinite(number)) {
    return escapeHtml(
      fmt(value)
    );
  }

  return (
    "$" +
    number.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 0
      }
    )
  );
}


export function fmtCurrencyText(value) {
  const number =
    Number(
      String(value)
        .replace(/[^0-9.\-]/g, "")
    );

  if (!Number.isFinite(number)) {
    return fmt(value);
  }

  return (
    "$" +
    number.toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 0
      }
    )
  );
}


function renderValue(field, value) {
  if (
    CONFIG.linkFields.includes(field)
  ) {
    const url =
      fmt(value).trim();

    if (/^https?:\/\//i.test(url)) {
      return (
        `<a href="${escapeHtml(url)}" ` +
        `target="_blank" ` +
        `rel="noopener noreferrer">` +
        `View record ↗</a>`
      );
    }
  }

  if (
    CONFIG.currencyFields.includes(field)
  ) {
    return fmtCurrency(value);
  }

  return escapeHtml(
    fmt(value)
  );
}


/* ============================================================
   PARCEL DETAIL PANEL
   ============================================================ */

export function showDetail(props) {
  const detail =
    document.getElementById("detail");

  const title =
    fmt(
      props[
        CONFIG.fields.address
      ]
    ) || "Parcel";

  let html =
    `<h2>${escapeHtml(title)}</h2>`;

  for (
    const field
    of CONFIG.popupFields
  ) {
    if (
      props[field] == null ||
      String(props[field]).trim() === ""
    ) {
      continue;
    }

    html +=
      `<div class="attr-row">` +
        `<span class="attr-k">` +
          `${escapeHtml(field)}` +
        `</span>` +
        `<span class="attr-v">` +
          `${renderValue(field, props[field])}` +
        `</span>` +
      `</div>`;
  }

  detail.innerHTML =
    html;
}


export function resetDetailPanel() {
  document.getElementById("detail").innerHTML =
    `<p class="empty">
      Street View location selected.
      Click a floating parcel label to inspect the property.
    </p>`;
}


/* ============================================================
   STREET VIEW POPUP
   ============================================================ */

export function showPopup(
  props,
  projection
) {
  const popup =
    document.getElementById("popup");

  document
    .getElementById("pop-title")
    .textContent =
      fmt(
        props[
          CONFIG.fields.address
        ]
      ) || "Parcel";

  const body =
    document.getElementById("pop-body");

  body.innerHTML =
    CONFIG.popupFields
      .filter(
        field =>
          props[field] != null &&
          String(props[field]).trim() !== ""
      )
      .map(
        field =>
          `<div class="prow">` +
            `<span class="k">` +
              `${escapeHtml(field)}` +
            `</span>` +
            `<span class="v">` +
              `${renderValue(field, props[field])}` +
            `</span>` +
          `</div>`
      )
      .join("");

  popup.classList.add("open");

  const stage =
    document.getElementById("stage");

  let x =
    (
      projection?.x ||
      stage.clientWidth / 2
    ) + 14;

  let y =
    (
      projection?.y ||
      stage.clientHeight / 2
    );

  x =
    Math.max(
      10,
      Math.min(
        x,
        stage.clientWidth - 300
      )
    );

  y =
    Math.max(
      10,
      Math.min(
        y,
        stage.clientHeight - 220
      )
    );

  popup.style.left =
    x + "px";

  popup.style.top =
    y + "px";
}


export function closePopup() {
  document
    .getElementById("popup")
    .classList.remove("open");
}
