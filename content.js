(() => {
  "use strict";

  if (window.top !== window || document.getElementById("glm-root")) return;

  const state = {
    books: [],
    selected: new Set(),
    query: "",
    shelf: "all",
    sort: "title",
    running: false,
    addResults: [],
    shelfOverrides: new Map(),
  };

  const SHELVES = [
    ["read", "Read"],
    ["currently-reading", "Currently reading"],
    ["to-read", "Want to read"],
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const escapeHtml = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const safeHref = (value) => {
    try {
      const url = new URL(value, location.origin);
      return url.origin === location.origin ? url.href : "#";
    } catch {
      return "#";
    }
  };
  const normalize = (value) => (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  function text(root, selectors) {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      if (node?.textContent.trim()) return node.textContent.trim();
    }
    return "";
  }

  function parseShelf(row) {
    const shelfCell = row.querySelector("td.field.shelves, td.shelves, [data-field-name='shelves']");
    const shelfLinks = [...(shelfCell?.querySelectorAll("a") || [])]
      .map((link) => `${link.dataset.shelfName || ""} ${link.textContent || ""} ${link.href || ""}`)
      .join(" ");
    const value = `${shelfCell?.dataset.shelfName || ""} ${shelfCell?.textContent || ""} ${shelfLinks}`;
    const normalized = normalize(value);
    if (/currently reading|en cours/.test(normalized)) return "currently-reading";
    if (/to read|a lire|want to read/.test(normalized)) return "to-read";
    if (/(^| )read( |$)|(^| )lu( |$)/.test(normalized)) return "read";
    return normalized || "other";
  }

  function parseBook(row, index) {
    const titleLink = row.querySelector("td.field.title a, td.title a, a.bookTitle");
    const image = row.querySelector("td.field.cover img, td.cover img, img.bookCover");
    const deleteLink = row.querySelector("a.deleteLink[data-method], a.deleteLink");
    const idMatch = (row.id || "").match(/(\d+)/)
      || titleLink?.href.match(/\/book\/show\/(\d+)/);
    const title = titleLink?.textContent.trim() || text(row, [".title"]);
    const author = text(row, ["td.field.author a", "td.author a", "a.authorName"]);
    return {
      key: idMatch?.[1] || `row-${index}`,
      title,
      author,
      cover: image?.currentSrc || image?.src || "",
      href: titleLink?.href || "#",
      shelf: parseShelf(row),
      row,
      deleteUrl: deleteLink?.href || "",
    };
  }

  function scanBooks() {
    const rows = [...document.querySelectorAll("tr.bookalike.review, tr[id^='review_']")];
    state.books = rows.map(parseBook).filter((book) => book.title).map((book) => {
      const updatedShelf = state.shelfOverrides.get(book.key);
      return updatedShelf ? { ...book, shelf: updatedShelf } : book;
    });
    return state.books.length;
  }

  function filteredBooks() {
    const needle = normalize(state.query);
    return state.books
      .filter((book) => state.shelf === "all" || book.shelf === state.shelf)
      .filter((book) => !needle || normalize(`${book.title} ${book.author}`).includes(needle))
      .sort((a, b) => {
        const field = state.sort === "author" ? "author" : "title";
        return a[field].localeCompare(b[field], "fr", { numeric: true });
      });
  }

  const root = document.createElement("div");
  root.id = "glm-root";
  root.innerHTML = `
    <button class="glm-launch" type="button" title="Open library manager">
      <span aria-hidden="true">B</span><span>Library</span>
    </button>
    <section class="glm-app" hidden aria-label="Goodreads Library Manager">
      <header class="glm-header">
        <div>
          <p class="glm-kicker">GOODREADS LIBRARY MANAGER</p>
          <h1>My library</h1>
          <p class="glm-summary"></p>
        </div>
        <div class="glm-header-actions">
          <button class="glm-add-open" type="button">+ Add books</button>
          <button class="glm-icon-button glm-diagnostics" type="button" title="Download shelf diagnostics" aria-label="Download shelf diagnostics">&#9881;</button>
          <button class="glm-icon-button glm-export" type="button" title="Export filtered view to CSV" aria-label="Export filtered view to CSV">&#8681;</button>
          <button class="glm-icon-button glm-expand" type="button" title="Expand panel" aria-label="Expand panel">&#x26F6;</button>
          <button class="glm-icon-button glm-close" type="button" title="Close" aria-label="Close">&#10005;</button>
        </div>
      </header>
      <div class="glm-toolbar">
        <label class="glm-search">
          <span aria-hidden="true">&#9906;</span>
          <input type="search" placeholder="Title, author or series..." autocomplete="off">
        </label>
        <select class="glm-shelf-filter" aria-label="Filter by shelf">
          <option value="all">All shelves</option>
          <option value="read">Read</option>
          <option value="currently-reading">Currently reading</option>
          <option value="to-read">Want to read</option>
        </select>
        <button class="glm-load-all" type="button" title="Reload Goodreads with every book on one page">Load all</button>
        <button class="glm-select-results" type="button">Select results</button>
        <button class="glm-clear-selection" type="button">Clear</button>
      </div>
      <div class="glm-notice" hidden></div>
      <section class="glm-add-panel" hidden>
        <div class="glm-add-heading">
          <div><strong>Quick add</strong><span>Search Goodreads by title, author or ISBN.</span></div>
          <button class="glm-add-close glm-icon-button" type="button" aria-label="Close quick add">&#10005;</button>
        </div>
        <div class="glm-add-controls">
          <input class="glm-add-search" type="search" placeholder="Search for a book..." autocomplete="off">
          <select class="glm-add-shelf" aria-label="Shelf for new books">
            <option value="read">Read</option>
            <option value="currently-reading">Currently reading</option>
            <option value="to-read">Want to read</option>
          </select>
        </div>
        <div class="glm-add-results"></div>
      </section>
      <nav class="glm-list-sort" aria-label="Sort library">
        <button class="is-active" type="button" data-sort="title">Title A-Z</button>
        <button type="button" data-sort="author">Author A-Z</button>
      </nav>
      <main class="glm-grid" aria-live="polite"></main>
      <footer class="glm-bulk" hidden>
        <strong><span class="glm-selected-count">0</span> selected</strong>
        <div class="glm-bulk-actions">
          <span>Move to</span>
          <button type="button" data-shelf="read">Read</button>
          <button type="button" data-shelf="currently-reading">Currently reading</button>
          <button type="button" data-shelf="to-read">Want to read</button>
          <button class="glm-delete" type="button">Delete</button>
        </div>
      </footer>
    </section>`;
  document.body.appendChild(root);

  const app = root.querySelector(".glm-app");
  const grid = root.querySelector(".glm-grid");
  const notice = root.querySelector(".glm-notice");
  const bulk = root.querySelector(".glm-bulk");
  const addPanel = root.querySelector(".glm-add-panel");
  const addResults = root.querySelector(".glm-add-results");
  const dragSelection = { active: false, mode: true, moved: false, suppressClick: false, lastKey: "" };

  function shelfLabel(value) {
    return SHELVES.find(([key]) => key === value)?.[1] || value || "Other";
  }

  function updateSelectionUi() {
    root.querySelector(".glm-selected-count").textContent = state.selected.size;
    bulk.hidden = state.selected.size === 0;
  }

  function render() {
    const books = filteredBooks();
    root.querySelector(".glm-summary").textContent = `${state.books.length} books loaded · ${books.length} shown`;
    grid.replaceChildren();

    if (!books.length) {
      const empty = document.createElement("div");
      empty.className = "glm-empty";
      empty.innerHTML = "<strong>No books found</strong><span>Change the search or shelf filter.</span>";
      grid.appendChild(empty);
      updateSelectionUi();
      return;
    }

    const fragment = document.createDocumentFragment();
    books.forEach((book) => {
      const card = document.createElement("article");
      card.className = "glm-card";
      card.dataset.key = book.key;
      if (state.selected.has(book.key)) card.classList.add("is-selected");
      card.innerHTML = `
        <label class="glm-check" title="Select">
          <input type="checkbox" ${state.selected.has(book.key) ? "checked" : ""}>
          <span></span>
        </label>
        <div class="glm-card-copy">
          <a class="glm-title" href="${safeHref(book.href)}" target="_blank" rel="noreferrer">${escapeHtml(book.title)}</a>
          <span class="glm-author">${escapeHtml(book.author || "Unknown author")}</span>
        </div>
        <span class="glm-badge">${escapeHtml(shelfLabel(book.shelf))}</span>
        <a class="glm-thumbnail" href="${safeHref(book.href)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(book.title)}">
          ${book.cover ? `<img src="${escapeHtml(book.cover)}" alt="" loading="lazy">` : ""}
        </a>`;
      card.querySelector(".glm-check").addEventListener("click", (event) => event.preventDefault());
      const applyDragMode = () => {
        if (dragSelection.mode) state.selected.add(book.key);
        else state.selected.delete(book.key);
        card.classList.toggle("is-selected", dragSelection.mode);
        card.querySelector("input").checked = dragSelection.mode;
        updateSelectionUi();
      };
      card.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        dragSelection.active = true;
        dragSelection.moved = false;
        dragSelection.lastKey = book.key;
        dragSelection.mode = !state.selected.has(book.key);
        applyDragMode();
      });
      card.addEventListener("pointermove", () => {
        if (!dragSelection.active) return;
        if (dragSelection.lastKey === book.key) return;
        dragSelection.moved = true;
        dragSelection.lastKey = book.key;
        applyDragMode();
      });
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
    updateSelectionUi();
  }

  function showNotice(message, kind = "info") {
    notice.hidden = false;
    notice.className = `glm-notice is-${kind}`;
    notice.textContent = message;
  }

  function hideNotice() {
    notice.hidden = true;
  }

  function normalizeSearchBook(item) {
    const author = typeof item.author === "string" ? item.author : item.author?.name;
    const id = item.bookId || item.book_id || item.id || item.book?.id;
    return {
      id: String(id || "").match(/\d+/)?.[0] || "",
      title: item.title || item.bookTitle || item.book?.title || "Untitled",
      author: author || item.authorName || item.book?.author?.name || "Unknown author",
    };
  }

  function renderAddResults() {
    addResults.replaceChildren();
    if (!state.addResults.length) {
      addResults.innerHTML = '<p class="glm-add-empty">Type at least two characters to search.</p>';
      return;
    }
    state.addResults.forEach((book) => {
      const row = document.createElement("article");
      row.className = "glm-add-result";
      row.innerHTML = `
        <div><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)}</span></div>
        <button type="button">Add</button>`;
      row.querySelector("button").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = "Adding...";
        try {
          await addBook(book.id, root.querySelector(".glm-add-shelf").value);
          button.textContent = "Added";
          button.classList.add("is-added");
          showNotice(`${book.title} was added. Reload the library to see it.`, "success");
        } catch (error) {
          button.disabled = false;
          button.textContent = "Retry";
          showNotice(`Could not add ${book.title}: ${error.message}`, "error");
        }
      });
      addResults.appendChild(row);
    });
  }

  let searchTimer;
  async function searchGoodreads(query) {
    if (normalize(query).length < 2) {
      state.addResults = [];
      renderAddResults();
      return;
    }
    addResults.innerHTML = '<p class="glm-add-empty">Searching Goodreads...</p>';
    try {
      const response = await fetch(`/book/auto_complete?format=json&q=${encodeURIComponent(query)}`, {
        credentials: "same-origin",
        headers: { "Accept": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : payload.items || payload.books || [];
      state.addResults = items.map(normalizeSearchBook).filter((book) => book.id).slice(0, 12);
      renderAddResults();
    } catch (error) {
      state.addResults = [];
      addResults.innerHTML = `<p class="glm-add-empty is-error">Search failed: ${escapeHtml(error.message)}</p>`;
    }
  }

  async function addBook(bookId, shelf) {
    if (!bookId) throw new Error("missing book ID");
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (!token) throw new Error("Goodreads security token not found");
    const body = new URLSearchParams({
      book_id: bookId,
      "review[shelf]": shelf,
      authenticity_token: token,
    });
    const response = await fetch("/review/create", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRF-Token": token,
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept": "text/javascript, text/html, application/json, */*",
      },
      body,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  function findShelfEditor(row) {
    return row.querySelector(
      "td.field.shelves .editField, td.field.shelves .editLink, td.field.shelves a[onclick], td.shelves .editField"
    );
  }

  async function waitFor(getter, timeout = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const value = getter();
      if (value) return value;
      await sleep(100);
    }
    return null;
  }

  function labelForInput(input) {
    const explicit = input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    return normalize(explicit?.textContent || input.closest("label")?.textContent || input.value);
  }

  function shelfInputCandidates(book) {
    const controls = [...document.querySelectorAll("input[type='checkbox'], input[type='radio']")];
    return controls.filter((input) => {
      const context = `${input.id} ${input.name} ${input.className} ${input.value} ${labelForInput(input)}`;
      const container = input.closest("form, [id], [class*='shelf'], [class*='Shelf']");
      const belongsToBook = book.row.contains(input)
        || (book.key && normalize(`${context} ${container?.id || ""}`).includes(normalize(book.key)));
      return belongsToBook || /shelf|read|currently|want|to read/.test(normalize(context));
    }).sort((a, b) => {
      const score = (input) => (book.row.contains(input) ? 4 : 0)
        + (input.getClientRects().length ? 2 : 0)
        + (book.key && normalize(`${input.id} ${input.name} ${input.closest("form, [id]")?.id || ""}`).includes(normalize(book.key)) ? 1 : 0);
      return score(b) - score(a);
    });
  }

  function matchesShelf(input, targetShelf) {
    const label = labelForInput(input);
    const value = normalize(input.value);
    const wanted = normalize(targetShelf.replaceAll("-", " "));
    return value === normalize(targetShelf) || label === wanted
      || (targetShelf === "read" && /(^| )read( |$)/.test(`${value} ${label}`))
      || (targetShelf === "to-read" && /to read|want to read/.test(`${value} ${label}`))
      || (targetShelf === "currently-reading" && /currently reading/.test(`${value} ${label}`));
  }

  function matchesShelfText(value, targetShelf) {
    const label = normalize(value);
    if (targetShelf === "read") return label === "read";
    if (targetShelf === "to-read") return /^(to read|want to read)$/.test(label);
    return targetShelf === "currently-reading" && label === "currently reading";
  }

  function shelfMenuActions(book) {
    const selector = [
      ".floatingBox a", ".floatingBox button", ".floatingBox label",
      "[class*='shelfChooser'] a", "[class*='shelfChooser'] button", "[class*='shelfChooser'] label",
      "[role='menu'] a", "[role='menu'] button", "[role='menuitem']",
      "td.field.shelves a", "td.field.shelves button", "td.shelves a", "td.shelves button",
    ].join(",");
    return [...document.querySelectorAll(selector)].filter((element) => {
      if (root.contains(element) || element === findShelfEditor(book.row)) return false;
      return element.getClientRects().length > 0;
    });
  }

  async function changeShelf(book, targetShelf) {
    const editor = findShelfEditor(book.row);
    if (!editor) throw new Error("shelf editor not found");
    editor.click();

    const choice = await waitFor(() => {
      const input = shelfInputCandidates(book).find((candidate) => matchesShelf(candidate, targetShelf));
      if (input) return { element: input, input: true };
      const action = shelfMenuActions(book).find((candidate) => matchesShelfText(candidate.textContent, targetShelf));
      return action ? { element: action, input: false } : null;
    });
    if (!choice) {
      const detected = shelfInputCandidates(book).map(labelForInput).filter(Boolean).slice(0, 5);
      throw new Error(`shelf option not found${detected.length ? ` (found: ${detected.join(", ")})` : ""}`);
    }
    if (!choice.input || !choice.element.checked) choice.element.click();

    const save = book.row.querySelector(
      "td.field.shelves button[type='submit'], td.field.shelves input[type='submit'], td.field.shelves .saveButton"
    );
    if (save) save.click();
    else if (choice.input) choice.element.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(650);
    book.shelf = targetShelf;
    state.shelfOverrides.set(book.key, targetShelf);
  }

  async function downloadDiagnostics() {
    scanBooks();
    const book = state.books.find((candidate) => state.selected.has(candidate.key)) || state.books[0];
    if (!book) {
      showNotice("No Goodreads book row found for diagnostics.", "error");
      return;
    }
    const editor = findShelfEditor(book.row);
    if (editor) editor.click();
    await sleep(700);
    const controls = shelfInputCandidates(book).map((input) => ({
      tag: input.tagName.toLowerCase(),
      type: input.type,
      id: input.id,
      name: input.name,
      value: input.value,
      label: labelForInput(input),
      checked: input.checked,
      inBookRow: book.row.contains(input),
      parentId: input.closest("form, [id]")?.id || "",
      parentClass: String(input.closest("form, [class]")?.className || "").slice(0, 200),
    }));
    const menuActions = shelfMenuActions(book).map((element) => ({
      tag: element.tagName.toLowerCase(),
      text: normalize(element.textContent).slice(0, 100),
      id: element.id,
      class: String(element.className || "").slice(0, 200),
      hrefPath: element.href ? new URL(element.href, location.origin).pathname : "",
      role: element.getAttribute("role") || "",
    }));
    const report = {
      extensionVersion: chrome.runtime.getManifest().version,
      pagePath: location.pathname,
      bookRowId: book.row.id,
      shelfCellFound: Boolean(book.row.querySelector("td.field.shelves, td.shelves, [data-field-name='shelves']")),
      editorFound: Boolean(editor),
      editorTag: editor?.tagName.toLowerCase() || "",
      editorId: editor?.id || "",
      editorClass: String(editor?.className || ""),
      controls,
      menuActions,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "goodreads-library-diagnostics.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showNotice(`Diagnostics downloaded (${controls.length} controls, ${menuActions.length} menu actions).`, "success");
  }

  async function deleteBook(book) {
    if (!book.deleteUrl) throw new Error("delete link not found");
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (!token) throw new Error("Goodreads security token not found");
    const response = await fetch(book.deleteUrl, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRF-Token": token,
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "text/javascript, text/html, application/json, */*",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.shelfOverrides.delete(book.key);
    book.row.remove();
  }

  async function runBulk(label, worker) {
    if (state.running) return;
    const selected = state.books.filter((book) => state.selected.has(book.key));
    if (!selected.length) return;
    state.running = true;
    root.classList.add("is-running");
    let completed = 0;
    const failures = [];
    for (const book of selected) {
      showNotice(`${label} ${completed + 1}/${selected.length} · ${book.title}`);
      try {
        await worker(book);
        completed += 1;
      } catch (error) {
        failures.push(`${book.title}: ${error.message}`);
      }
      await sleep(350);
    }
    state.running = false;
    root.classList.remove("is-running");
    state.selected.clear();
    scanBooks();
    render();
    if (failures.length) {
      showNotice(`${completed} completed, ${failures.length} failed. First error: ${failures[0]}`, "error");
    } else {
      showNotice(`${completed} books updated.`, "success");
    }
  }

  function csvCell(value) {
    return `"${String(value || "").replaceAll('"', '""')}"`;
  }

  function exportCsv() {
    const rows = [["Title", "Author", "Shelf", "Goodreads URL"], ...filteredBooks().map((book) => [
      book.title, book.author, book.shelf, book.href,
    ])];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "goodreads-library-view.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function fullLibraryUrl() {
    const url = new URL(location.href);
    url.searchParams.delete("shelf");
    url.searchParams.delete("page");
    url.searchParams.set("per_page", "infinite");
    return url;
  }

  function needsFullLibraryLoad() {
    const url = new URL(location.href);
    return url.searchParams.get("per_page") !== "infinite" || url.searchParams.has("shelf");
  }

  function loadFullLibraryAndReopen() {
    sessionStorage.setItem("glm-open-after-load", "1");
    location.assign(fullLibraryUrl().href);
  }

  function openManager() {
    if (needsFullLibraryLoad()) {
      loadFullLibraryAndReopen();
      return;
    }
    scanBooks();
    app.hidden = false;
    hideNotice();
    render();
  }

  function closeManager() {
    app.hidden = true;
  }

  function toggleManager() {
    if (app.hidden) openManager();
    else closeManager();
  }

  root.querySelector(".glm-launch").addEventListener("click", openManager);
  root.querySelector(".glm-close").addEventListener("click", closeManager);
  root.querySelector(".glm-expand").addEventListener("click", (event) => {
    const expanded = app.classList.toggle("is-expanded");
    event.currentTarget.title = expanded ? "Restore panel" : "Expand panel";
    event.currentTarget.setAttribute("aria-label", expanded ? "Restore panel" : "Expand panel");
  });
  root.querySelector(".glm-export").addEventListener("click", exportCsv);
  root.querySelector(".glm-diagnostics").addEventListener("click", downloadDiagnostics);
  root.querySelector(".glm-add-open").addEventListener("click", () => {
    addPanel.hidden = false;
    renderAddResults();
    root.querySelector(".glm-add-search").focus();
  });
  root.querySelector(".glm-add-close").addEventListener("click", () => {
    addPanel.hidden = true;
  });
  root.querySelector(".glm-add-search").addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchGoodreads(event.target.value), 300);
  });
  root.querySelector(".glm-load-all").addEventListener("click", () => {
    loadFullLibraryAndReopen();
  });
  root.querySelector(".glm-search input").addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
  root.querySelector(".glm-shelf-filter").addEventListener("change", (event) => {
    state.shelf = event.target.value;
    render();
  });
  root.querySelectorAll(".glm-list-sort [data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sort = button.dataset.sort;
      root.querySelectorAll(".glm-list-sort [data-sort]").forEach((option) => {
        option.classList.toggle("is-active", option === button);
      });
      render();
    });
  });
  root.querySelector(".glm-select-results").addEventListener("click", () => {
    filteredBooks().forEach((book) => state.selected.add(book.key));
    render();
  });
  root.querySelector(".glm-clear-selection").addEventListener("click", () => {
    state.selected.clear();
    render();
  });
  root.querySelectorAll("[data-shelf]").forEach((button) => {
    button.addEventListener("click", () => runBulk("Updating", (book) => changeShelf(book, button.dataset.shelf)));
  });
  root.querySelector(".glm-delete").addEventListener("click", () => {
    const count = state.selected.size;
    if (!confirm(`Permanently remove ${count} books from your Goodreads library?`)) return;
    const answer = prompt(`This cannot be undone. Type DELETE to confirm ${count} removals.`);
    if (answer !== "DELETE") return;
    runBulk("Deleting", deleteBook);
  });

  document.addEventListener("pointerup", () => {
    if (!dragSelection.active) return;
    dragSelection.active = false;
    dragSelection.lastKey = "";
    dragSelection.suppressClick = dragSelection.moved;
    setTimeout(() => { dragSelection.suppressClick = false; }, 50);
  });
  document.addEventListener("pointercancel", () => {
    dragSelection.active = false;
    dragSelection.lastKey = "";
  });
  root.addEventListener("click", (event) => {
    if (dragSelection.suppressClick && event.target.closest(".glm-card a")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "GLM_TOGGLE") return;
    toggleManager();
    sendResponse({ open: !app.hidden, books: state.books.length });
  });

  if (!scanBooks()) {
    root.querySelector(".glm-launch").title = "Open a shelf in My Books to load your books";
  }
  if (sessionStorage.getItem("glm-open-after-load") === "1") {
    sessionStorage.removeItem("glm-open-after-load");
    openManager();
  }
})();
