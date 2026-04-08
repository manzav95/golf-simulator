const PACKAGES = {
  "3hr": { label: "3 Hour Golf Simulator Rental", price: 600 },
  "4hr": { label: "4 Hour Rental", price: 800 },
  fullday: { label: "Full Day Rental", price: 1200 },
};

const ADDONS = {
  extra_hour: { label: "Extra hour", price: 150 },
  led_lights: { label: "LED lights", price: 100 },
  tournament_mode: { label: "Tournament mode", price: 100 },
};

const DEPOSIT_RATE = 0.5;

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function formatMoney(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function roundCents(value) {
  return Math.round(value * 100) / 100;
}

function digitsOnly(s) {
  return String(s ?? "").replace(/\D/g, "");
}

function isValidEmail(email) {
  const value = String(email ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(phone) {
  const d = digitsOnly(phone);
  return d.length >= 10 && d.length <= 15;
}

function todayISO() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60_000;
  const local = new Date(d.getTime() - tzOffset);
  return local.toISOString().slice(0, 10);
}

function getSelections(form) {
  const pkgKey = $("#package", form)?.value ?? "";
  const addons = $all('input[name="addons"]:checked', form).map((el) => el.value);
  return { pkgKey, addons };
}

function computeTotals({ pkgKey, addons }) {
  const pkg = PACKAGES[pkgKey] ?? null;
  const items = [];

  let subtotal = 0;
  if (pkg) {
    items.push({ label: pkg.label, price: pkg.price });
    subtotal += pkg.price;
  }

  for (const key of addons) {
    const addon = ADDONS[key];
    if (!addon) continue;
    items.push({ label: addon.label, price: addon.price });
    subtotal += addon.price;
  }

  const deposit = roundCents(subtotal * DEPOSIT_RATE);
  const remaining = roundCents(subtotal - deposit);
  return { items, subtotal, deposit, remaining };
}

function renderSummary({ items, subtotal, deposit, remaining }) {
  const summaryList = $("#summaryList");
  const totalEl = $("#summaryTotal");
  const depositEl = $("#summaryDeposit");
  const remainingEl = $("#summaryRemaining");
  const clearPackageBtn = $("#clearPackage");

  if (!summaryList || !totalEl || !depositEl || !remainingEl) return;

  if (items.length === 0) {
    summaryList.innerHTML = `
      <div class="summaryItem">
        <span class="summaryItemName muted">Select a package to begin</span>
        <span class="summaryItemMeta muted">$0</span>
      </div>
    `;
  } else {
    summaryList.innerHTML = items
      .map(
        (it) => `
        <div class="summaryItem">
          <span class="summaryItemName">${escapeHtml(it.label)}</span>
          <span class="summaryItemMeta">${formatMoney(it.price)}</span>
        </div>
      `,
      )
      .join("");
  }

  totalEl.textContent = formatMoney(subtotal);
  depositEl.textContent = formatMoney(deposit);
  remainingEl.textContent = formatMoney(remaining);

  const hasPackage = items.length > 0;
  if (clearPackageBtn instanceof HTMLButtonElement) {
    clearPackageBtn.disabled = !hasPackage;
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setFieldError(form, name, message) {
  const errorEl = form.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
  if (errorEl) errorEl.textContent = message ?? "";
}

function clearErrors(form) {
  $all("[data-error-for]", form).forEach((el) => {
    el.textContent = "";
  });
}

function validate(form) {
  const name = $("#name", form)?.value ?? "";
  const phone = $("#phone", form)?.value ?? "";
  const email = $("#email", form)?.value ?? "";
  const date = $("#date", form)?.value ?? "";
  const pkg = $("#package", form)?.value ?? "";

  clearErrors(form);
  let ok = true;

  if (String(name).trim().length < 2) {
    setFieldError(form, "name", "Please enter your name.");
    ok = false;
  }
  if (!isValidPhone(phone)) {
    setFieldError(form, "phone", "Please enter a valid phone number.");
    ok = false;
  }
  if (!isValidEmail(email)) {
    setFieldError(form, "email", "Please enter a valid email address.");
    ok = false;
  }
  if (!date) {
    setFieldError(form, "date", "Please select an event date.");
    ok = false;
  } else if (date < todayISO()) {
    setFieldError(form, "date", "Please choose a future date.");
    ok = false;
  }
  if (!pkg) {
    setFieldError(form, "package", "Please choose a package.");
    ok = false;
  }

  return ok;
}

function saveLastSubmission(payload) {
  try {
    localStorage.setItem("partee_last_submission", JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function wirePackagePickButtons(form) {
  $all("[data-pick-package]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-pick-package");
      const select = $("#package", form);
      if (select && key) select.value = key;
      updatePricingFromForm(form);
    });
  });
}

function updatePricingFromForm(form) {
  const selections = getSelections(form);
  const totals = computeTotals(selections);
  renderSummary(totals);
}

function main() {
  const form = $("#bookingForm");
  if (!form) return;

  $("#year")?.append(String(new Date().getFullYear()));

  const dateInput = $("#date", form);
  if (dateInput) dateInput.min = todayISO();

  wirePackagePickButtons(form);

  form.addEventListener("change", () => updatePricingFromForm(form));
  form.addEventListener("input", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const name = t.getAttribute("name");
    if (!name) return;
    setFieldError(form, name, "");
  });

  $("#scrollToSubmit")?.addEventListener("click", () => {
    $("#submitBtn")?.scrollIntoView({ behavior: "smooth", block: "center" });
    $("#submitBtn")?.focus({ preventScroll: true });
  });

  $("#clearPackage")?.addEventListener("click", () => {
    const select = $("#package", form);
    if (select) select.value = "";
    $all('input[name="addons"]', form).forEach((el) => {
      if (el instanceof HTMLInputElement) el.checked = false;
    });
    $("#successMessage")?.setAttribute("hidden", "");
    updatePricingFromForm(form);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = validate(form);
    if (!ok) {
      $("#successMessage")?.setAttribute("hidden", "");
      return;
    }

    const { pkgKey, addons } = getSelections(form);
    const totals = computeTotals({ pkgKey, addons });

    const payload = {
      name: $("#name", form)?.value ?? "",
      phone: $("#phone", form)?.value ?? "",
      email: $("#email", form)?.value ?? "",
      date: $("#date", form)?.value ?? "",
      package: pkgKey,
      addons,
      notes: $("#notes", form)?.value ?? "",
      totals,
      createdAt: new Date().toISOString(),
    };

    saveLastSubmission(payload);
    $("#successMessage")?.removeAttribute("hidden");
    $("#successMessage")?.scrollIntoView({ behavior: "smooth", block: "center" });

    form.reset();
    if (dateInput) dateInput.min = todayISO();
    updatePricingFromForm(form);
  });

  updatePricingFromForm(form);
}

document.addEventListener("DOMContentLoaded", main);

