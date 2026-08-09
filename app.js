"use strict";

const FIELD_CONFIG = [
  {
    key: "documentDate",
    label: "Document Date",
    required: false,
    aliases: [
      "document date", "documentdate", "doc date", "docdate", "posting date", "postingdate",
      "transaction date", "transactiondate", "date", "تاريخ المستند", "تاريخ الحركة", "تاريخ الفاتورة"
    ]
  },
  {
    key: "month",
    label: "Month",
    required: false,
    aliases: ["month", "period", "fiscal month", "fiscalmonth", "الشهر", "الفترة"]
  },
  {
    key: "type",
    label: "Type",
    required: false,
    aliases: [
      "type", "trans.type", "transtype", "trans type", "transaction type", "transactiontype",
      "sp.g/l trans.type", "spgl transtype", "sp g/l trans type", "sp. g/l trans.type",
      "نوع", "نوع الحركة", "نوع المستند", "نوع العملية"
    ]
  },
  {
    key: "amount",
    label: "القيمة / Amount",
    required: true,
    aliases: [
      "amount", "value", "net amount", "netamount", "balance", "debit credit", "debitcredit",
      "القيمة", "قيمه", "المبلغ", "مبلغ", "الرصيد", "قيمة"
    ]
  },
  {
    key: "dueDate",
    label: "تاريخ الاستحقاق / Due Date",
    required: false,
    aliases: [
      "due date", "duedate", "payment due date", "paymentduedate",
      "تاريخ الاستحقاق", "استحقاق", "تاريخ السداد", "تاريخ الدفع"
    ]
  },
  {
    key: "reference",
    label: "Reference",
    required: false,
    aliases: [
      "reference", "ref", "document reference", "documentreference", "invoice reference", "invoicereference",
      "مرجع", "رقم المرجع", "رقم المستند", "رقم الفاتورة"
    ]
  },
  {
    key: "account",
    label: "Account",
    required: false,
    aliases: [
      "account", "account code", "accountcode", "customer account", "customeraccount",
      "pharmacy account", "pharmacyaccount", "code", "customer code", "customercode",
      "حساب", "رقم الحساب", "كود", "كود العميل", "كود الصيدلية"
    ]
  },
  {
    key: "name",
    label: "Name",
    required: false,
    aliases: [
      "name", "customer name", "customername", "pharmacy name", "pharmacyname", "client name", "clientname",
      "اسم", "الاسم", "اسم العميل", "اسم الصيدلية", "الصيدلية", "العميل"
    ]
  },
  {
    key: "salesman",
    label: "Salesman",
    required: true,
    aliases: [
      "salesman", "sales man", "representative", "rep", "medical rep", "medicalrep",
      "sales representative", "salesrepresentative", "مندوب", "المندوب", "اسم المندوب", "ممثل المبيعات"
    ]
  }
];

const FIELD_LOOKUP = FIELD_CONFIG.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const state = {
  fileName: "",
  workbookLoaded: false,
  headerRowIndex: -1,
  headerCells: [],
  rawRows: [],
  displayRows: [],
  rawDataRows: [],
  displayDataRows: [],
  rawRowCount: 0,
  columnMap: {},
  rows: [],
  invalidRows: [],
  warnings: [],
  selectedCustomerKey: "",
  currentGroups: [],
  salesmen: [],
  selectedSalesmen: new Set()
};

const ui = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheUi();
  bindEvents();
  renderInitialState();
});

function cacheUi() {
  ui.uploadZone = document.getElementById("uploadZone");
  ui.fileInput = document.getElementById("fileInput");
  ui.fileInfo = document.getElementById("fileInfo");
  ui.statusMessage = document.getElementById("statusMessage");
  ui.validationBox = document.getElementById("validationBox");

  ui.columnMapperPanel = document.getElementById("columnMapperPanel");
  ui.mappingGrid = document.getElementById("mappingGrid");
  ui.applyMappingBtn = document.getElementById("applyMappingBtn");

  ui.salesmanMultiSelect = document.getElementById("salesmanMultiSelect");
  ui.salesmanTrigger = document.getElementById("salesmanTrigger");
  ui.salesmanTriggerText = document.getElementById("salesmanTriggerText");
  ui.salesmanDropdown = document.getElementById("salesmanDropdown");
  ui.salesmanSearch = document.getElementById("salesmanSearch");
  ui.salesmanOptions = document.getElementById("salesmanOptions");
  ui.selectAllSalesmen = document.getElementById("selectAllSalesmen");
  ui.clearSalesmen = document.getElementById("clearSalesmen");
  ui.selectedSalesmenChips = document.getElementById("selectedSalesmenChips");
  ui.activeFiltersText = document.getElementById("activeFiltersText");
  ui.customerFilter = document.getElementById("customerFilter");
  ui.customerSearch = document.getElementById("customerSearch");
  ui.dateFrom = document.getElementById("dateFrom");
  ui.dateTo = document.getElementById("dateTo");
  ui.resetBtn = document.getElementById("resetBtn");

  ui.summaryCards = document.getElementById("summaryCards");
  ui.includedCount = document.getElementById("includedCount");
  ui.customerList = document.getElementById("customerList");
  ui.statementHeader = document.getElementById("statementHeader");
  ui.transactionsBody = document.getElementById("transactionsBody");
  ui.customerTotal = document.getElementById("customerTotal");
  ui.exportPdfBtn = document.getElementById("exportPdfBtn");
  ui.printCurrentBtn = document.getElementById("printCurrentBtn");
}

function bindEvents() {
  ui.uploadZone.addEventListener("click", () => ui.fileInput.click());

  ui.uploadZone.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      ui.fileInput.click();
    }
  });

  ui.uploadZone.addEventListener("dragover", event => {
    event.preventDefault();
    ui.uploadZone.classList.add("is-dragover");
  });

  ui.uploadZone.addEventListener("dragleave", () => {
    ui.uploadZone.classList.remove("is-dragover");
  });

  ui.uploadZone.addEventListener("drop", event => {
    event.preventDefault();
    ui.uploadZone.classList.remove("is-dragover");
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  ui.fileInput.addEventListener("change", event => {
    const file = event.target.files && event.target.files[0];
    if (file) handleFile(file);
  });

  ui.applyMappingBtn.addEventListener("click", applyManualMapping);

  ui.salesmanTrigger.addEventListener("click", event => {
    event.stopPropagation();
    const willOpen = ui.salesmanDropdown.classList.contains("is-hidden");
    ui.salesmanDropdown.classList.toggle("is-hidden", !willOpen);
    ui.salesmanMultiSelect.classList.toggle("is-open", willOpen);
    ui.salesmanTrigger.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) ui.salesmanSearch.focus();
  });

  ui.salesmanSearch.addEventListener("input", renderSalesmanOptions);
  ui.salesmanOptions.addEventListener("change", event => {
    const checkbox = event.target.closest("input[data-salesman]");
    if (!checkbox) return;
    checkbox.checked ? state.selectedSalesmen.add(checkbox.dataset.salesman) : state.selectedSalesmen.delete(checkbox.dataset.salesman);
    onSalesmenSelectionChanged();
  });
  ui.selectAllSalesmen.addEventListener("click", () => {
    getVisibleSalesmen().forEach(name => state.selectedSalesmen.add(name));
    onSalesmenSelectionChanged();
  });
  ui.clearSalesmen.addEventListener("click", () => {
    state.selectedSalesmen.clear();
    onSalesmenSelectionChanged();
  });
  ui.selectedSalesmenChips.addEventListener("click", event => {
    const button = event.target.closest("button[data-remove-salesman]");
    if (!button) return;
    state.selectedSalesmen.delete(button.dataset.removeSalesman);
    onSalesmenSelectionChanged();
  });
  document.addEventListener("click", event => {
    if (!ui.salesmanMultiSelect.contains(event.target)) closeSalesmanDropdown();
  });

  ui.customerFilter.addEventListener("change", () => {
    state.selectedCustomerKey = ui.customerFilter.value;
    renderPreview();
  });

  ui.customerSearch.addEventListener("input", () => {
    if (!ui.customerFilter.value) state.selectedCustomerKey = "";
    renderPreview();
  });

  ui.dateFrom.addEventListener("change", () => {
    state.selectedCustomerKey = "";
    renderPreview();
  });

  ui.dateTo.addEventListener("change", () => {
    state.selectedCustomerKey = "";
    renderPreview();
  });

  ui.resetBtn.addEventListener("click", resetFilters);

  ui.customerList.addEventListener("click", event => {
    const item = event.target.closest("[data-customer-key]");
    if (!item) return;
    state.selectedCustomerKey = item.dataset.customerKey;
    ui.customerFilter.value = state.selectedCustomerKey;
    renderPreview();
  });

  ui.exportPdfBtn.addEventListener("click", exportPdf);
  ui.printCurrentBtn.addEventListener("click", printCurrentCustomer);
}

function renderInitialState() {
  ui.exportPdfBtn.disabled = true;
  ui.printCurrentBtn.disabled = true;
  renderSummary([]);
  renderActiveFilters([]);
}

function handleFile(file) {
  clearMessages();

  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  if (!isExcel) {
    showStatus("error", "يرجى رفع ملف Excel بصيغة .xlsx أو .xls فقط.");
    return;
  }

  if (typeof XLSX === "undefined") {
    showStatus("error", "مكتبة قراءة Excel غير محملة. تحقق من اتصال الإنترنت أو روابط CDN.");
    return;
  }

  resetDataOnly();
  state.fileName = file.name;
  showStatus("warning", "جاري قراءة الملف...");

  const reader = new FileReader();

  reader.onload = event => {
    try {
      const buffer = event.target.result;
      const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
        raw: true
      });

      if (!workbook.SheetNames.length) {
        throw new Error("ملف Excel لا يحتوي على أوراق عمل.");
      }

      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];

      state.rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
        raw: true
      });

      state.displayRows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
        raw: false
      });

      prepareWorkbookData();
      renderColumnMapper();

      try {
        parseRowsWithCurrentMapping();
        finalizeSuccessfulParse("تم رفع الملف بنجاح.");
      } catch (mappingError) {
        state.rows = [];
        state.invalidRows = [];
        state.warnings = [];
        state.currentGroups = [];
        showStatus("warning", `${mappingError.message || "يرجى مراجعة ربط الأعمدة."} يمكنك تعديل ربط الأعمدة ثم الضغط على تطبيق ربط الأعمدة.`);
        renderValidation();
        renderPreview();
        ui.exportPdfBtn.disabled = true;
      }
    } catch (error) {
      resetDataOnly();
      showStatus("error", error.message || "تعذر قراءة ملف Excel.");
      renderValidation();
      renderPreview();
    }
  };

  reader.onerror = () => {
    showStatus("error", "تعذر قراءة الملف من الجهاز.");
  };

  reader.readAsArrayBuffer(file);
}

function prepareWorkbookData() {
  if (!Array.isArray(state.rawRows) || state.rawRows.length === 0) {
    throw new Error("الملف فارغ ولا يحتوي على بيانات.");
  }

  const sourceRows = state.displayRows.length ? state.displayRows : state.rawRows;
  const headerResult = detectHeaderRow(sourceRows);

  if (headerResult.index < 0) {
    throw new Error("لم يتم العثور على صف عناوين واضح داخل الملف.");
  }

  state.workbookLoaded = true;
  state.headerRowIndex = headerResult.index;
  state.headerCells = normalizeHeaderCells(sourceRows[headerResult.index]);
  state.columnMap = headerResult.columnMap;
  state.rawDataRows = state.rawRows.slice(state.headerRowIndex + 1);
  state.displayDataRows = state.displayRows.slice(state.headerRowIndex + 1);
  state.rawRowCount = state.rawDataRows.filter((row, index) => {
    const displayRow = state.displayDataRows[index] || row;
    return rowHasContent(row) || rowHasContent(displayRow);
  }).length;
}

function detectHeaderRow(rows) {
  let best = {
    index: -1,
    score: -999,
    columnMap: {}
  };

  const scanLimit = Math.min(rows.length, 30);

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const headerCells = normalizeHeaderCells(row);
    const nonEmpty = headerCells.filter(cell => cell.text).length;
    if (nonEmpty < 4) continue;

    const columnMap = autoMapColumns(headerCells);
    const aliasHits = Object.values(columnMap).filter(value => value !== "").length;
    const textScore = headerCells.filter(cell => cell.text && !looksLikeMostlyNumericOrDate(cell.text)).length;
    const requiredHits = ["amount", "salesman", "account", "name"].filter(key => columnMap[key] !== "" && columnMap[key] !== undefined).length;
    const score = (aliasHits * 8) + (requiredHits * 10) + textScore - Math.abs(rowIndex - 1);

    if (score > best.score) {
      best = {
        index: rowIndex,
        score,
        columnMap
      };
    }
  }

  if (best.index < 0) {
    return {
      index: -1,
      score: 0,
      columnMap: {}
    };
  }

  return best;
}

function normalizeHeaderCells(row) {
  return (row || []).map((value, index) => {
    const text = cleanText(value);
    return {
      index,
      text,
      normalized: normalizeHeader(text)
    };
  }).filter(cell => cell.text !== "");
}

function autoMapColumns(headerCells) {
  const map = {};
  FIELD_CONFIG.forEach(field => {
    map[field.key] = "";
  });

  FIELD_CONFIG.forEach(field => {
    const match = findBestHeaderMatch(field, headerCells);
    if (match !== null && match !== undefined) {
      map[field.key] = String(match);
    }
  });

  return map;
}

function findBestHeaderMatch(field, headerCells) {
  const aliasSet = new Set(field.aliases.map(alias => normalizeHeader(alias)));

  for (const cell of headerCells) {
    if (aliasSet.has(cell.normalized)) return cell.index;
  }

  for (const cell of headerCells) {
    for (const alias of aliasSet) {
      if (alias && (cell.normalized.includes(alias) || alias.includes(cell.normalized))) {
        return cell.index;
      }
    }
  }

  return null;
}

function renderColumnMapper() {
  if (!state.workbookLoaded) {
    ui.columnMapperPanel.classList.add("is-hidden");
    ui.mappingGrid.innerHTML = "";
    return;
  }

  ui.columnMapperPanel.classList.remove("is-hidden");
  const options = state.headerCells.map(cell => {
    const label = `${toExcelColumnName(cell.index)} — ${cell.text}`;
    return `<option value="${escapeAttr(String(cell.index))}">${escapeHtml(label)}</option>`;
  }).join("");

  ui.mappingGrid.innerHTML = FIELD_CONFIG.map(field => {
    const selectedIndex = state.columnMap[field.key] ?? "";
    const statusClass = selectedIndex !== "" ? "ok" : (field.required ? "warn" : "warn");
    const statusLabel = selectedIndex !== "" ? "مرتبط" : (field.required ? "مطلوب" : "اختياري");

    return `
      <label class="field">
        <span>${escapeHtml(field.label)}</span>
        <select data-map-field="${escapeAttr(field.key)}">
          <option value="">لا يوجد / تجاهل</option>
          ${options}
        </select>
        <em class="mapping-status ${statusClass}">${statusLabel}</em>
      </label>
    `;
  }).join("");

  FIELD_CONFIG.forEach(field => {
    const select = ui.mappingGrid.querySelector(`[data-map-field="${field.key}"]`);
    if (select) select.value = state.columnMap[field.key] ?? "";
  });
}

function applyManualMapping() {
  clearMessages();

  if (!state.workbookLoaded) {
    showStatus("error", "يرجى رفع ملف Excel أولاً.");
    return;
  }

  FIELD_CONFIG.forEach(field => {
    const select = ui.mappingGrid.querySelector(`[data-map-field="${field.key}"]`);
    state.columnMap[field.key] = select ? select.value : "";
  });

  try {
    parseRowsWithCurrentMapping();
    finalizeSuccessfulParse("تم تطبيق ربط الأعمدة بنجاح.");
    renderColumnMapper();
  } catch (error) {
    showStatus("error", error.message || "تعذر تطبيق ربط الأعمدة.");
    renderValidation();
    renderPreview();
  }
}

function parseRowsWithCurrentMapping() {
  state.rows = [];
  state.invalidRows = [];
  state.warnings = [];
  state.selectedCustomerKey = "";
  state.currentGroups = [];

  validateColumnMap();

  let lastCustomerContext = null;

  state.rawDataRows.forEach((rawRow, index) => {
    const displayRow = state.displayDataRows[index] || rawRow;
    if (!rowHasContent(rawRow) && !rowHasContent(displayRow)) return;

    const excelRowNumber = state.headerRowIndex + index + 2;
    const normalized = normalizeTransactionRow(rawRow, displayRow, excelRowNumber, lastCustomerContext);

    if (normalized.isInvalid) {
      state.invalidRows.push(normalized);
      return;
    }

    state.rows.push(normalized);

    if (normalized.account || normalized.name) {
      lastCustomerContext = {
        customerKey: normalized.customerKey,
        account: normalized.account,
        name: normalized.name,
        salesman: normalized.salesman
      };
    }
  });

  if (!state.rows.length) {
    throw new Error("لا يوجد أي عميل/صيدلية صالحة داخل الملف بعد ربط الأعمدة.");
  }
}

function validateColumnMap() {
  const missingCore = [];

  if (!hasMappedColumn("amount")) missingCore.push("القيمة / Amount");
  if (!hasMappedColumn("salesman")) missingCore.push("Salesman");
  if (!hasMappedColumn("account") && !hasMappedColumn("name")) missingCore.push("Account أو Name");

  if (missingCore.length) {
    throw new Error(`الربط غير مكتمل. الأعمدة المطلوبة: ${missingCore.join("، ")}`);
  }
}

function hasMappedColumn(fieldKey) {
  return state.columnMap[fieldKey] !== "" && state.columnMap[fieldKey] !== undefined && state.columnMap[fieldKey] !== null;
}

function normalizeTransactionRow(rawRow, displayRow, excelRowNumber, lastCustomerContext) {
  let account = cleanText(getCellValue(displayRow, "account"));
  let name = cleanText(getCellValue(displayRow, "name"));
  let salesman = cleanText(getCellValue(displayRow, "salesman"));

  const documentDateRaw = getCellValue(rawRow, "documentDate");
  const documentDateDisplay = cleanText(getCellValue(displayRow, "documentDate"));
  const dueDateRaw = getCellValue(rawRow, "dueDate");
  const dueDateDisplay = cleanText(getCellValue(displayRow, "dueDate"));
  const month = cleanText(getCellValue(displayRow, "month"));
  const type = cleanText(getCellValue(displayRow, "type"));
  const reference = cleanText(getCellValue(displayRow, "reference"));

  const totalInfo = getReportTotalInfo({ month, type, reference });

  if ((!account && !name) && totalInfo.isTotal && lastCustomerContext) {
    account = lastCustomerContext.account;
    name = lastCustomerContext.name;
    salesman = salesman || lastCustomerContext.salesman;
  }

  if (!salesman && lastCustomerContext && (account === lastCustomerContext.account || name === lastCustomerContext.name)) {
    salesman = lastCustomerContext.salesman;
  }

  const amountRawValue = getCellValue(rawRow, "amount");
  const amountDisplayValue = cleanText(getCellValue(displayRow, "amount"));
  const amountResult = parseAmount(amountRawValue !== "" ? amountRawValue : amountDisplayValue);

  if (!account && !name) {
    return {
      isInvalid: true,
      excelRowNumber,
      reason: "لا يوجد Account أو Name لتحديد الصيدلية."
    };
  }

  if (!amountResult.isValid) {
    state.warnings.push({
      row: excelRowNumber,
      message: "قيمة Amount غير صالحة أو فارغة؛ ستظهر كما هي إن كانت موجودة ولن يتم إنشاء Total محسوب."
    });
  }

  const documentDateResult = parseDateValue(documentDateRaw, documentDateDisplay);
  const dueDateResult = parseDateValue(dueDateRaw, dueDateDisplay);
  const key = account ? `account:${account}` : `name:${name}`;

  return {
    isInvalid: false,
    excelRowNumber,
    customerKey: key,
    account,
    name,
    salesman,
    documentDate: documentDateResult.display,
    documentDateSort: documentDateResult.sort,
    month,
    type,
    amount: amountResult.value,
    amountDisplay: amountDisplayValue || cleanText(amountRawValue) || formatAmount(amountResult.value),
    dueDate: dueDateResult.display,
    dueDateSort: dueDateResult.sort,
    reference,
    isReportTotal: totalInfo.isTotal,
    reportTotalLabel: totalInfo.label,
    reportTotalLevel: totalInfo.level
  };
}

function getCellValue(row, fieldKey) {
  const indexValue = state.columnMap[fieldKey];
  if (indexValue === "" || indexValue === undefined || indexValue === null) return "";
  const index = Number(indexValue);
  if (!Number.isInteger(index)) return "";
  return row[index] ?? "";
}

function finalizeSuccessfulParse(message) {
  populateSalesmanFilter();
  populateCustomerFilter();
  renderFileInfo();
  renderValidation();
  resetFilters(false);
  renderPreview();
  showStatus("success", message);
  ui.exportPdfBtn.disabled = state.rows.length === 0;
}

function getReportTotalInfo(row) {
  const month = cleanText(row.month);
  const type = cleanText(row.type);
  const reference = cleanText(row.reference);
  const joined = `${month} ${type} ${reference}`.trim();
  const hasTotalMarker = /\btotal\b/i.test(joined) || /إجمالي|اجمالي|الإجمالي|المجموع|مجموع/i.test(joined);

  if (!hasTotalMarker) {
    return {
      isTotal: false,
      label: "",
      level: "detail"
    };
  }

  const label = [month, type]
    .filter(Boolean)
    .join(" · ")
    .replace(/\s+/g, " ")
    .trim() || "Total";

  let level = "report-total";
  if (/\btotal\b/i.test(month) || /إجمالي|اجمالي|المجموع|مجموع/i.test(month)) level = "month-total";
  if (/\btotal\b/i.test(type) || /إجمالي|اجمالي|المجموع|مجموع/i.test(type)) level = "category-total";

  return {
    isTotal: true,
    label,
    level
  };
}

function rowHasContent(row) {
  return Array.isArray(row) && row.some(cell => cleanText(cell) !== "");
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\u200f|\u200e|\u202a|\u202b|\u202c/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[._\-\/\\()\[\]:]+/g, "")
    .replace(/\s+/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\w\u0600-\u06FF]/g, "");
}

function looksLikeMostlyNumericOrDate(value) {
  const text = convertArabicDigits(cleanText(value));
  if (!text) return false;
  if (/^\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}/.test(text)) return true;
  const numericText = text.replace(/[,\s.\-+]/g, "");
  return numericText.length > 0 && /^\d+$/.test(numericText) && numericText.length >= Math.max(2, text.length - 4);
}

function parseAmount(value) {
  const raw = value;

  if (value === null || value === undefined || cleanText(value) === "") {
    return {
      value: 0,
      raw,
      isValid: false
    };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      value,
      raw,
      isValid: true
    };
  }

  let text = convertArabicDigits(cleanText(value));
  let negative = false;

  if (/^\(.+\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  text = text
    .replace(/\u066B/g, ".")
    .replace(/\u066C/g, ",")
    .replace(/[^\d,.\-+]/g, "");

  if (text.startsWith("-")) negative = true;
  text = text.replace(/[+\-]/g, "");

  const commaCount = (text.match(/,/g) || []).length;
  const dotCount = (text.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    text = text.replace(/,/g, "");
  } else if (commaCount === 1 && dotCount === 0) {
    const parts = text.split(",");
    const decimals = parts[1] || "";
    if (decimals.length === 3 && parts[0].length > 1) {
      text = parts.join("");
    } else {
      text = parts.join(".");
    }
  } else if (commaCount > 1 && dotCount === 0) {
    text = text.replace(/,/g, "");
  }

  const parsed = Number(text);

  if (!Number.isFinite(parsed)) {
    return {
      value: 0,
      raw,
      isValid: false
    };
  }

  return {
    value: negative ? -Math.abs(parsed) : parsed,
    raw,
    isValid: true
  };
}

function parseDateValue(rawValue, displayValue) {
  const displayText = cleanText(displayValue);

  if ((rawValue === null || rawValue === undefined || cleanText(rawValue) === "") && !displayText) {
    return {
      display: "",
      sort: Number.POSITIVE_INFINITY
    };
  }

  if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
    return {
      display: displayText || formatDateDisplay(rawValue),
      sort: startOfDay(rawValue).getTime()
    };
  }

  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    const parsedExcelDate = XLSX.SSF.parse_date_code(rawValue);
    if (parsedExcelDate) {
      const date = new Date(parsedExcelDate.y, parsedExcelDate.m - 1, parsedExcelDate.d);
      return {
        display: displayText || formatDateDisplay(date),
        sort: startOfDay(date).getTime()
      };
    }
  }

  const text = convertArabicDigits(displayText || cleanText(rawValue));
  const match = text.match(/(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})/);

  if (match) {
    let first = Number(match[1]);
    let second = Number(match[2]);
    let third = Number(match[3]);

    let year;
    let month;
    let day;

    if (String(match[1]).length === 4) {
      year = first;
      month = second;
      day = third;
    } else {
      day = first;
      month = second;
      year = third;
    }

    if (year < 100) year += year >= 70 ? 1900 : 2000;

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return {
        display: displayText || formatDateDisplay(date),
        sort: startOfDay(date).getTime()
      };
    }
  }

  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) {
    return {
      display: displayText || formatDateDisplay(fallback),
      sort: startOfDay(fallback).getTime()
    };
  }

  return {
    display: displayText || text,
    sort: Number.POSITIVE_INFINITY
  };
}

function convertArabicDigits(value) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

  return String(value).replace(/[٠-٩۰-۹]/g, digit => {
    const arabicIndex = arabicDigits.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);

    const persianIndex = persianDigits.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);

    return digit;
  });
}

function formatDateDisplay(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function populateSalesmanFilter() {
  state.salesmen = [...new Set(state.rows.map(row => row.salesman).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ar"));
  state.selectedSalesmen = new Set([...state.selectedSalesmen].filter(name => state.salesmen.includes(name)));
  renderSalesmanOptions();
  renderSelectedSalesmen();
}

function getVisibleSalesmen() {
  const query = cleanText(ui.salesmanSearch.value).toLowerCase();
  return state.salesmen.filter(name => !query || name.toLowerCase().includes(query));
}

function renderSalesmanOptions() {
  const visible = getVisibleSalesmen();
  ui.salesmanOptions.innerHTML = visible.length ? visible.map(name => `
    <label class="salesman-option">
      <input type="checkbox" data-salesman="${escapeAttr(name)}" ${state.selectedSalesmen.has(name) ? "checked" : ""}>
      <span>${escapeHtml(name)}</span>
    </label>`).join("") : `<div class="empty-state">لا يوجد مندوب مطابق.</div>`;
}

function renderSelectedSalesmen() {
  const selected = [...state.selectedSalesmen];
  ui.salesmanTriggerText.textContent = selected.length === 0 ? "كل المندوبين" : selected.length === 1 ? selected[0] : `${formatInteger(selected.length)} مندوبي مبيعات`;
  ui.selectedSalesmenChips.innerHTML = selected.map(name => `
    <span class="selection-chip">${escapeHtml(name)}<button type="button" data-remove-salesman="${escapeAttr(name)}" aria-label="إزالة ${escapeAttr(name)}">×</button></span>`).join("");
}

function onSalesmenSelectionChanged() {
  ui.customerFilter.value = "";
  state.selectedCustomerKey = "";
  renderSalesmanOptions();
  renderSelectedSalesmen();
  populateCustomerFilter();
  renderPreview();
}

function closeSalesmanDropdown() {
  ui.salesmanDropdown.classList.add("is-hidden");
  ui.salesmanMultiSelect.classList.remove("is-open");
  ui.salesmanTrigger.setAttribute("aria-expanded", "false");
}

function populateCustomerFilter() {
  const selectedCustomer = ui.customerFilter.value;
  const customers = groupRows(
    state.selectedSalesmen.size
      ? state.rows.filter(row => state.selectedSalesmen.has(row.salesman))
      : state.rows
  );

  ui.customerFilter.innerHTML = `
    <option value="">كل الصيدليات</option>
    ${customers.map(customer => `
      <option value="${escapeAttr(customer.key)}">
        ${escapeHtml(customer.displayName)}${customer.account ? ` - ${escapeHtml(customer.account)}` : ""}
      </option>
    `).join("")}
  `;

  if (selectedCustomer && customers.some(customer => customer.key === selectedCustomer)) {
    ui.customerFilter.value = selectedCustomer;
  }
}

function resetFilters(shouldRender = true) {
  state.selectedSalesmen.clear();
  ui.salesmanSearch.value = "";
  renderSalesmanOptions();
  renderSelectedSalesmen();
  ui.customerFilter.value = "";
  ui.customerSearch.value = "";
  ui.dateFrom.value = "";
  ui.dateTo.value = "";
  state.selectedCustomerKey = "";
  populateCustomerFilter();
  if (shouldRender) renderPreview();
}

function getFilteredRows() {
  const selectedCustomer = ui.customerFilter.value;
  const searchText = cleanText(ui.customerSearch.value).toLowerCase();
  const dateFrom = ui.dateFrom.value ? new Date(`${ui.dateFrom.value}T00:00:00`).getTime() : null;
  const dateTo = ui.dateTo.value ? new Date(`${ui.dateTo.value}T23:59:59`).getTime() : null;

  const baseRows = state.rows.filter(row => {
    if (state.selectedSalesmen.size && !state.selectedSalesmen.has(row.salesman)) return false;
    if (selectedCustomer && row.customerKey !== selectedCustomer) return false;

    if (!selectedCustomer && searchText) {
      const haystack = `${row.name} ${row.account}`.toLowerCase();
      if (!haystack.includes(searchText)) return false;
    }

    return true;
  });

  if (dateFrom === null && dateTo === null) {
    return baseRows;
  }

  const matchingCustomerKeys = new Set();

  baseRows.forEach(row => {
    if (row.isReportTotal) return;
    const rowDate = Number.isFinite(row.documentDateSort) ? row.documentDateSort : null;
    if (rowDate === null) return;
    if (dateFrom !== null && rowDate < dateFrom) return;
    if (dateTo !== null && rowDate > dateTo) return;
    matchingCustomerKeys.add(row.customerKey);
  });

  return baseRows.filter(row => {
    if (row.isReportTotal) return matchingCustomerKeys.has(row.customerKey);
    const rowDate = Number.isFinite(row.documentDateSort) ? row.documentDateSort : null;
    if (rowDate === null) return false;
    if (dateFrom !== null && rowDate < dateFrom) return false;
    if (dateTo !== null && rowDate > dateTo) return false;
    return true;
  });
}

function groupRows(rows) {
  const map = new Map();

  rows.forEach(row => {
    if (!map.has(row.customerKey)) {
      map.set(row.customerKey, {
        key: row.customerKey,
        account: row.account,
        name: row.name,
        displayName: row.name || row.account || "صيدلية غير معروفة",
        salesman: row.salesman,
        rows: [],
        reportTotals: []
      });
    }

    const customer = map.get(row.customerKey);
    customer.rows.push(row);

    if (row.isReportTotal) {
      customer.reportTotals.push(row);
    }

    if (!customer.salesman && row.salesman) {
      customer.salesman = row.salesman;
    }
  });

  return [...map.values()]
    .map(customer => {
      customer.rows.sort(compareTransactions);
      customer.reportTotals.sort(compareReportTotals);
      return customer;
    })
    .sort((a, b) => {
      const nameCompare = a.displayName.localeCompare(b.displayName, "ar");
      if (nameCompare !== 0) return nameCompare;
      return String(a.account).localeCompare(String(b.account), "ar");
    });
}

function compareTransactions(a, b) {
  if (a.isReportTotal !== b.isReportTotal) {
    return a.isReportTotal ? 1 : -1;
  }

  const dateA = Number.isFinite(a.documentDateSort) ? a.documentDateSort : Number.POSITIVE_INFINITY;
  const dateB = Number.isFinite(b.documentDateSort) ? b.documentDateSort : Number.POSITIVE_INFINITY;
  if (dateA !== dateB) return dateA - dateB;

  const dueA = Number.isFinite(a.dueDateSort) ? a.dueDateSort : Number.POSITIVE_INFINITY;
  const dueB = Number.isFinite(b.dueDateSort) ? b.dueDateSort : Number.POSITIVE_INFINITY;
  if (dueA !== dueB) return dueA - dueB;

  if (a.reportTotalLevel !== b.reportTotalLevel) {
    const rank = {
      detail: 1,
      "month-total": 2,
      "category-total": 3,
      "report-total": 4
    };
    return (rank[a.reportTotalLevel] || 9) - (rank[b.reportTotalLevel] || 9);
  }

  return String(a.reference || a.reportTotalLabel).localeCompare(String(b.reference || b.reportTotalLabel), "ar");
}

function compareReportTotals(a, b) {
  const rank = {
    "category-total": 1,
    "report-total": 2,
    "month-total": 3,
    detail: 4
  };
  const rankDiff = (rank[a.reportTotalLevel] || 9) - (rank[b.reportTotalLevel] || 9);
  if (rankDiff !== 0) return rankDiff;
  return String(a.reportTotalLabel).localeCompare(String(b.reportTotalLabel), "ar");
}

function renderPreview() {
  const filteredRows = getFilteredRows();
  const groups = groupRows(filteredRows);
  state.currentGroups = groups;

  if (ui.customerFilter.value) {
    state.selectedCustomerKey = ui.customerFilter.value;
  }

  if (!groups.some(customer => customer.key === state.selectedCustomerKey)) {
    state.selectedCustomerKey = groups[0] ? groups[0].key : "";
  }

  renderSummary(groups);
  renderCustomerList(groups);
  renderSelectedCustomer(groups);
  renderActiveFilters(groups);

  ui.exportPdfBtn.disabled = !groups.length;
  ui.printCurrentBtn.disabled = !groups.length;
}

function renderSummary(groups) {
  const rowCount = groups.reduce((sum, customer) => sum + customer.rows.length, 0);
  const selectedSalesmen = [...state.selectedSalesmen];

  ui.summaryCards.innerHTML = `
    <article class="summary-card">
      <span>عدد الصيدليات</span>
      <strong>${formatInteger(groups.length)}</strong>
    </article>
    <article class="summary-card">
      <span>عدد الصفوف المعروضة</span>
      <strong>${formatInteger(rowCount)}</strong>
    </article>
    <article class="summary-card">
      <span>إجماليات التقرير</span>
      <strong>${escapeHtml(getOverallReportTotalsLabel(groups))}</strong>
    </article>
    <article class="summary-card">
      <span>المندوبون المختارون</span>
      <strong>${escapeHtml(selectedSalesmen.length ? (selectedSalesmen.length === 1 ? selectedSalesmen[0] : `${formatInteger(selectedSalesmen.length)} مندوبي مبيعات`) : "كل المندوبين")}</strong>
    </article>
  `;
}

function renderCustomerList(groups) {
  ui.includedCount.textContent = formatInteger(groups.length);

  if (!state.rows.length) {
    ui.customerList.innerHTML = `<div class="empty-state">لم يتم رفع ملف بعد.</div>`;
    return;
  }

  if (!groups.length) {
    ui.customerList.innerHTML = `<div class="empty-state">لا توجد بيانات حسب الفلاتر المختارة.</div>`;
    return;
  }

  ui.customerList.innerHTML = groups.map(customer => `
    <button
      class="customer-item ${customer.key === state.selectedCustomerKey ? "is-active" : ""}"
      type="button"
      data-customer-key="${escapeAttr(customer.key)}"
    >
      <strong>${escapeHtml(customer.displayName)}</strong>
      <span>
        حساب: ${escapeHtml(customer.account || "-")} ·
        صفوف: ${formatInteger(customer.rows.length)} ·
        ${escapeHtml(getCustomerReportTotalsLabel(customer))}
      </span>
    </button>
  `).join("");
}

function renderSelectedCustomer(groups) {
  const customer = groups.find(item => item.key === state.selectedCustomerKey);

  if (!customer) {
    ui.statementHeader.innerHTML = `
      <div>
        <p>كشف حساب الصيدلية</p>
        <h3>لا توجد بيانات</h3>
      </div>
    `;

    ui.transactionsBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">لا توجد بيانات للعرض.</td>
      </tr>
    `;

    ui.customerTotal.innerHTML = `إجماليات التقرير: <strong>لا يوجد</strong>`;
    return;
  }

  ui.statementHeader.innerHTML = `
    <div>
      <p>كشف حساب الصيدلية</p>
      <h3>${escapeHtml(customer.displayName)}</h3>
    </div>
    <div class="statement-meta">
      <span class="meta-pill">الحساب: ${escapeHtml(customer.account || "-")}</span>
      <span class="meta-pill">المندوب: ${escapeHtml(customer.salesman || "-")}</span>
      <span class="meta-pill">الصفوف: ${formatInteger(customer.rows.length)}</span>
    </div>
  `;

  ui.transactionsBody.innerHTML = customer.rows.map(row => `
    <tr class="${row.isReportTotal ? "is-total-row" : ""}">
      <td>${escapeHtml(row.documentDate || "-")}</td>
      <td>${escapeHtml(row.type || "-")}</td>
      <td class="amount-cell ${row.amount > 0 ? "amount-positive" : row.amount < 0 ? "amount-negative" : ""}">
        ${escapeHtml(row.amountDisplay || formatAmount(row.amount))}
      </td>
      <td>${escapeHtml(row.dueDate || "-")}</td>
      <td>${escapeHtml(row.month || "-")}</td>
      <td>${escapeHtml(row.reference || "-")}</td>
    </tr>
  `).join("");

  ui.customerTotal.innerHTML = renderReportTotalsHtml(customer, "screen");
}

function renderActiveFilters(groups) {
  const parts = [];
  if (state.selectedSalesmen.size) parts.push(`${formatInteger(state.selectedSalesmen.size)} مندوب`);
  if (ui.customerFilter.value) parts.push("صيدلية محددة");
  if (cleanText(ui.customerSearch.value)) parts.push(`بحث: ${cleanText(ui.customerSearch.value)}`);
  if (ui.dateFrom.value || ui.dateTo.value) parts.push(`الفترة: ${ui.dateFrom.value || "البداية"} — ${ui.dateTo.value || "اليوم"}`);
  parts.push(`${formatInteger(groups.length)} صيدلية ضمن النتيجة`);
  ui.activeFiltersText.textContent = parts.join(" · ");
}

async function printCurrentCustomer() {
  clearMessages();
  const customer = state.currentGroups.find(item => item.key === state.selectedCustomerKey);
  if (!customer) {
    showStatus("error", "اختر صيدلية من قائمة المعاينة أولاً.");
    return;
  }
  try {
    await printGroups([customer], `statement-${sanitizeFilename(customer.displayName || customer.account)}-${new Date().toISOString().slice(0, 10)}.pdf`);
    showStatus("success", "تم تجهيز الصيدلية الحالية للطباعة أو الحفظ كملف PDF.");
  } catch (error) {
    showStatus("error", error.message || "تعذر تجهيز الصيدلية للطباعة.");
  }
}

async function printGroups(groups, filename) {
  const exportDate = formatDateDisplay(new Date());
  const pages = buildPdfPages(groups);
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("المتصفح منع فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.");
  printWindow.document.open();
  printWindow.document.write(buildPrintableDocument(pages, exportDate, filename));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 450);
}

async function exportPdf() {
  clearMessages();

  if (!state.rows.length) {
    showStatus("error", "يرجى رفع ملف Excel أولاً.");
    return;
  }

  const groups = state.currentGroups.length ? state.currentGroups : groupRows(getFilteredRows());

  if (!groups.length) {
    showStatus("error", "لا توجد بيانات حسب الفلاتر المختارة.");
    return;
  }

  if (typeof html2pdf === "undefined") {
    showStatus("error", "مكتبة إنشاء PDF غير محملة. تحقق من اتصال الإنترنت ثم أعد المحاولة.");
    return;
  }

  const originalLabel = ui.exportPdfBtn.innerHTML;

  try {
    ui.exportPdfBtn.disabled = true;
    ui.exportPdfBtn.classList.add("is-loading");
    ui.exportPdfBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>جاري تجهيز PDF...</span>`;
    showStatus("warning", "جاري تجهيز ملف PDF بحجم A4...");

    await downloadGroupsPdf(groups, buildPdfFilename());

    showStatus("success", "تم تنزيل ملف PDF بحجم A4 بنجاح.");
  } catch (error) {
    console.error(error);
    showStatus("error", error.message || "تعذر إنشاء ملف PDF.");
  } finally {
    ui.exportPdfBtn.innerHTML = originalLabel;
    ui.exportPdfBtn.classList.remove("is-loading");
    ui.exportPdfBtn.disabled = !state.currentGroups.length;
  }
}

async function downloadGroupsPdf(groups, filename) {
  const exportDate = formatDateDisplay(new Date());
  const pages = buildPdfPages(groups);
  const printableDocument = buildPrintableDocument(pages, exportDate, filename);
  const parsedDocument = new DOMParser().parseFromString(printableDocument, "text/html");
  const renderHost = document.createElement("div");
  const printStyles = document.createElement("style");

  renderHost.className = "pdf-render-host";
  renderHost.setAttribute("aria-hidden", "true");
  renderHost.innerHTML = parsedDocument.body.innerHTML;
  printStyles.textContent = parsedDocument.querySelector("style").textContent;

  document.head.appendChild(printStyles);
  document.body.appendChild(renderHost);

  try {
    await waitForRender();

    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true
        },
        pagebreak: {
          mode: ["css", "legacy"],
          before: ".print-page:not(:first-child)"
        }
      })
      .from(renderHost)
      .save();
  } finally {
    renderHost.remove();
    printStyles.remove();
  }
}

function buildPdfPages(groups) {
  const pages = [];
  const firstPageRows = 24;
  const continuationRows = 28;

  groups.forEach(customer => {
    const chunks = [];
    let cursor = 0;

    if (!customer.rows.length) return;

    chunks.push(customer.rows.slice(cursor, cursor + firstPageRows));
    cursor += firstPageRows;

    while (cursor < customer.rows.length) {
      chunks.push(customer.rows.slice(cursor, cursor + continuationRows));
      cursor += continuationRows;
    }

    chunks.forEach((rows, index) => {
      pages.push({
        customer,
        rows,
        partNumber: index + 1,
        totalParts: chunks.length,
        isContinuation: index > 0,
        isLastPart: index === chunks.length - 1
      });
    });
  });

  return pages;
}

function buildPrintableDocument(pages, exportDate, title) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title.replace(/\.pdf$/i, ""))}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #172526;
      font-family: Tahoma, Arial, sans-serif;
      direction: rtl;
    }

    .print-page {
      width: 210mm;
      height: 297mm;
      padding: 11mm;
      background: #ffffff;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }

    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .statement-card {
      height: 100%;
      border: 1px solid #d8e3e4;
      border-radius: 7mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    .statement-header {
      padding: 8mm 8mm 5mm;
      border-bottom: 1px solid #d8e3e4;
      background: linear-gradient(135deg, #f5fbfb, #ffffff);
    }

    .title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8mm;
      margin-bottom: 6mm;
    }

    .title-row h1 {
      margin: 0;
      color: #0f2728;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 900;
    }

    .title-row p {
      margin: 2mm 0 0;
      color: #607172;
      font-size: 10px;
      font-weight: 700;
    }

    .export-date {
      padding: 3mm 4mm;
      border: 1px solid #d8e3e4;
      border-radius: 999px;
      color: #067777;
      background: #e6f6f6;
      font-size: 9.5px;
      font-weight: 900;
      white-space: nowrap;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1.35fr 0.75fr 1fr 0.85fr;
      gap: 3mm;
    }

    .meta-box {
      min-width: 0;
      padding: 3mm;
      border: 1px solid #d8e3e4;
      border-radius: 4mm;
      background: rgba(255, 255, 255, 0.82);
    }

    .meta-box span {
      display: block;
      margin-bottom: 1.5mm;
      color: #687b7c;
      font-size: 8.5px;
      font-weight: 700;
    }

    .meta-box strong {
      display: block;
      color: #172526;
      font-size: 10px;
      line-height: 1.45;
      word-break: break-word;
      font-weight: 900;
    }

    .table-zone {
      flex: 1;
      padding: 5mm 8mm 3mm;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th,
    td {
      border: 1px solid #dfe8e9;
      padding: 2.05mm 1.65mm;
      font-size: 8.4px;
      line-height: 1.35;
      vertical-align: top;
      word-break: break-word;
    }

    th {
      background: #f0f7f7;
      color: #172526;
      font-weight: 900;
    }

    tbody tr:nth-child(even) td {
      background: #fbfdfd;
    }

    .amount {
      direction: ltr;
      text-align: right;
      font-weight: 900;
    }

    .total-row td {
      background: #eaf7f7 !important;
      color: #0f2728;
      font-weight: 900;
      border-top: 1.5px solid #8dcaca;
      border-bottom: 1.5px solid #8dcaca;
    }

    .statement-footer {
      padding: 4mm 8mm 7mm;
      border-top: 1px solid #d8e3e4;
      background: #fbfdfd;
      min-height: 22mm;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .totals-box {
      min-width: 58mm;
      max-width: 100%;
      padding: 3mm 4mm;
      border-radius: 4mm;
      background: #e6f6f6;
      color: #0f2728;
      font-size: 9.5px;
      font-weight: 900;
      line-height: 1.6;
    }

    .total-item {
      display: block;
      margin-top: 1.2mm;
      direction: rtl;
    }

    .total-value {
      direction: ltr;
      display: inline-block;
    }

    .pdf-render-host {
      position: fixed;
      top: 0;
      left: -10000px;
      width: 210mm;
      background: #ffffff;
      z-index: -1;
    }

    @media screen {
      body {
        background: #eef4f5;
      }

      .print-page {
        margin: 12px auto;
        box-shadow: 0 16px 44px rgba(15, 39, 40, 0.12);
      }
    }
  </style>
</head>
<body>
  ${pages.map(page => renderPrintPage(page, exportDate)).join("")}
</body>
</html>`;
}

function renderPrintPage(page, exportDate) {
  const customer = page.customer;

  return `
    <section class="print-page">
      <div class="statement-card">
        <header class="statement-header">
          <div class="title-row">
            <div>
              <h1>كشف حساب</h1>
              <p>Customer Account Statement${page.isContinuation ? " · متابعة" : ""}</p>
            </div>
            <div class="export-date">تاريخ التصدير / Export Date&nbsp;&nbsp; ${escapeHtml(exportDate)}</div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <span>اسم الصيدلية / Customer</span>
              <strong>${escapeHtml(customer.displayName)}</strong>
            </div>
            <div class="meta-box">
              <span>رقم الحساب / Account</span>
              <strong>${escapeHtml(customer.account || "-")}</strong>
            </div>
            <div class="meta-box">
              <span>المندوب / Salesman</span>
              <strong>${escapeHtml(customer.salesman || "-")}</strong>
            </div>
            <div class="meta-box">
              <span>عدد الصفوف / Rows</span>
              <strong>${formatInteger(customer.rows.length)}</strong>
            </div>
          </div>
        </header>

        <main class="table-zone">
          <table>
            <thead>
              <tr>
                <th style="width: 22mm;">Document Date</th>
                <th style="width: 30mm;">Type</th>
                <th style="width: 23mm;">القيمة</th>
                <th style="width: 22mm;">تاريخ الاستحقاق</th>
                <th style="width: 16mm;">Month</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              ${page.rows.map(row => `
                <tr class="${row.isReportTotal ? "total-row" : ""}">
                  <td>${escapeHtml(row.documentDate || "-")}</td>
                  <td>${escapeHtml(row.type || "-")}</td>
                  <td class="amount">${escapeHtml(row.amountDisplay || formatAmount(row.amount))}</td>
                  <td>${escapeHtml(row.dueDate || "-")}</td>
                  <td>${escapeHtml(row.month || "-")}</td>
                  <td>${escapeHtml(row.reference || "-")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </main>

        <footer class="statement-footer">
          ${page.isLastPart ? renderPrintTotalsHtml(customer) : ""}
        </footer>
      </div>
    </section>
  `;
}

function renderPrintTotalsHtml(customer) {
  const totals = getTopLevelReportTotals(customer);

  if (!totals.length) {
    return `<div class="totals-box">إجماليات التقرير: لا توجد صفوف Total في الملف</div>`;
  }

  return `
    <div class="totals-box">
      <strong>إجماليات التقرير:</strong>
      ${totals.map(row => `
        <span class="total-item">
          ${escapeHtml(row.reportTotalLabel || "Total")}: <span class="total-value">${escapeHtml(row.amountDisplay || formatAmount(row.amount))}</span>
        </span>
      `).join("")}
    </div>
  `;
}

function getOverallReportTotalsLabel(groups) {
  if (!groups.length) return "لا يوجد";

  if (groups.length === 1) {
    return getCustomerReportTotalsLabel(groups[0]);
  }

  const totalRowsCount = groups.reduce((sum, customer) => sum + customer.reportTotals.length, 0);
  return totalRowsCount ? `${formatInteger(totalRowsCount)} صف Total من التقرير` : "لا توجد صفوف Total";
}

function getCustomerReportTotalsLabel(customer) {
  if (!customer || !customer.reportTotals || !customer.reportTotals.length) {
    return "لا توجد صفوف Total";
  }

  const topLevelTotals = getTopLevelReportTotals(customer);
  const source = topLevelTotals.length ? topLevelTotals : customer.reportTotals;

  if (source.length === 1) {
    return `${source[0].reportTotalLabel || "Total"}: ${source[0].amountDisplay || formatAmount(source[0].amount)}`;
  }

  return `${formatInteger(source.length)} إجماليات من التقرير`;
}

function getTopLevelReportTotals(customer) {
  if (!customer || !Array.isArray(customer.reportTotals)) return [];

  const categoryTotals = customer.reportTotals.filter(row => row.reportTotalLevel === "category-total");
  if (categoryTotals.length) return categoryTotals;

  return customer.reportTotals.filter(row => row.isReportTotal);
}

function renderReportTotalsHtml(customer, mode) {
  const totals = getTopLevelReportTotals(customer);

  if (!totals.length) {
    return mode === "pdf"
      ? `<strong>إجماليات التقرير:</strong><br><span>لا توجد صفوف Total في الملف</span>`
      : `إجماليات التقرير: <strong>لا توجد صفوف Total في الملف</strong>`;
  }

  const rowsHtml = totals.map(row => {
    return `<span class="report-total-item"><b>${escapeHtml(row.reportTotalLabel || "Total")}</b>: ${escapeHtml(row.amountDisplay || formatAmount(row.amount))}</span>`;
  }).join("");

  if (mode === "pdf") {
    return `<strong>إجماليات التقرير:</strong>${rowsHtml}`;
  }

  return `
    <div class="report-totals-title">إجماليات التقرير كما وردت في ملف Excel:</div>
    <div class="report-totals-list">${rowsHtml}</div>
  `;
}

function renderFileInfo() {
  const customersCount = groupRows(state.rows).length;
  const salesmenCount = new Set(state.rows.map(row => row.salesman).filter(Boolean)).size;
  const reportTotalsCount = state.rows.filter(row => row.isReportTotal).length;
  const mappedCount = FIELD_CONFIG.filter(field => hasMappedColumn(field.key)).length;

  ui.fileInfo.classList.remove("is-hidden");
  ui.fileInfo.innerHTML = `
    <strong>الملف:</strong> ${escapeHtml(state.fileName)}
    <br />
    <strong>صف العناوين المكتشف:</strong> ${formatInteger(state.headerRowIndex + 1)}
    <br />
    <strong>الأعمدة المرتبطة:</strong> ${formatInteger(mappedCount)} من ${formatInteger(FIELD_CONFIG.length)}
    <br />
    <strong>إجمالي الصفوف المحملة:</strong> ${formatInteger(state.rawRowCount)}
    <br />
    <strong>عدد الصيدليات المكتشفة:</strong> ${formatInteger(customersCount)}
    <br />
    <strong>عدد المندوبين المكتشفين:</strong> ${formatInteger(salesmenCount)}
    <br />
    <strong>صفوف Total من التقرير:</strong> ${formatInteger(reportTotalsCount)}
  `;
}

function renderValidation() {
  const messages = [];

  if (state.invalidRows.length) {
    messages.push(...state.invalidRows.slice(0, 60).map(item => {
      return `الصف ${item.excelRowNumber}: ${item.reason}`;
    }));
  }

  if (state.warnings.length) {
    messages.push(...state.warnings.slice(0, 120).map(item => {
      return `الصف ${item.row}: ${item.message}`;
    }));
  }

  const unmappedOptional = FIELD_CONFIG
    .filter(field => !field.required && !hasMappedColumn(field.key))
    .map(field => field.label);

  if (unmappedOptional.length) {
    messages.push(`أعمدة اختيارية غير مرتبطة ولن تظهر في الكشف: ${unmappedOptional.join("، ")}`);
  }

  const remaining =
    Math.max(0, state.invalidRows.length - 60) +
    Math.max(0, state.warnings.length - 120);

  if (remaining > 0) {
    messages.push(`يوجد ${formatInteger(remaining)} تنبيهاً إضافياً لم يتم عرضه لتقليل الازدحام.`);
  }

  if (!messages.length) {
    ui.validationBox.classList.add("is-hidden");
    ui.validationBox.innerHTML = "";
    return;
  }

  ui.validationBox.classList.remove("is-hidden");
  ui.validationBox.innerHTML = `
    <h3>تنبيهات التحقق</h3>
    <ul>
      ${messages.map(message => `<li>${escapeHtml(message)}</li>`).join("")}
    </ul>
  `;
}

function resetDataOnly() {
  state.fileName = "";
  state.workbookLoaded = false;
  state.headerRowIndex = -1;
  state.headerCells = [];
  state.rawRows = [];
  state.displayRows = [];
  state.rawDataRows = [];
  state.displayDataRows = [];
  state.rawRowCount = 0;
  state.columnMap = {};
  state.rows = [];
  state.invalidRows = [];
  state.warnings = [];
  state.selectedCustomerKey = "";
  state.currentGroups = [];
  state.salesmen = [];
  state.selectedSalesmen.clear();

  ui.fileInfo.classList.add("is-hidden");
  ui.fileInfo.innerHTML = "";
  ui.exportPdfBtn.disabled = true;
  ui.printCurrentBtn.disabled = true;
  renderColumnMapper();
  populateSalesmanFilter();
  populateCustomerFilter();
}

function clearMessages() {
  ui.statusMessage.classList.add("is-hidden");
  ui.statusMessage.classList.remove("success", "error", "warning");
  ui.statusMessage.textContent = "";
}

function showStatus(type, message) {
  ui.statusMessage.classList.remove("is-hidden", "success", "error", "warning");
  ui.statusMessage.classList.add(type);
  ui.statusMessage.textContent = message;
}

function waitForRender() {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function buildPdfFilename() {
  const selectedSalesmen = [...state.selectedSalesmen];
  const selectedCustomer = cleanText(ui.customerFilter.value);
  const date = new Date().toISOString().slice(0, 10);

  if (selectedCustomer) {
    const customer = state.currentGroups.find(item => item.key === selectedCustomer);
    const name = customer ? sanitizeFilename(customer.displayName || customer.account) : "customer";
    return `statement-${name}-${date}.pdf`;
  }

  if (selectedSalesmen.length === 1) {
    return `statements-${sanitizeFilename(selectedSalesmen[0])}-${date}.pdf`;
  }

  if (selectedSalesmen.length > 1) {
    return `statements-${selectedSalesmen.length}-salesmen-${date}.pdf`;
  }

  return `statements-all-customers-${date}.pdf`;
}

function sanitizeFilename(value) {
  return cleanText(value)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 70) || "file";
}

function toExcelColumnName(index) {
  let dividend = Number(index) + 1;
  let columnName = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return columnName;
}

function formatInteger(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
