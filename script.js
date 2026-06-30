/**
 * Sistem Pendukung Keputusan Pemilihan Proyektor (Metode SAW)
 * script.js - Core logic, calculations, state, and rendering
 */

// ==========================================
// 1. DEFAULT DATA CONFIGURATION
// ==========================================

const DEFAULT_PROJECTORS = [
    { name: "Epson EB-E01", price: 6500000, brightness: 3300, resolution: 2, lamplife: 12000, power: 210 },
    { name: "BenQ MS550", price: 5800000, brightness: 3600, resolution: 1, lamplife: 15000, power: 200 },
    { name: "Acer X1228i", price: 7200000, brightness: 4500, resolution: 4, lamplife: 10000, power: 240 },
    { name: "ViewSonic PA503S", price: 6000000, brightness: 3800, resolution: 2, lamplife: 15000, power: 220 },
    { name: "Infocus IN114AA", price: 5500000, brightness: 3400, resolution: 3, lamplife: 12000, power: 190 }
];

const DEFAULT_CRITERIA = {
    c1: { code: "C1", name: "Harga", type: "cost", weight: 0.30 },
    c2: { code: "C2", name: "Kecerahan", type: "benefit", weight: 0.25 },
    c3: { code: "C3", name: "Resolusi", type: "benefit", weight: 0.20 },
    c4: { code: "C4", name: "Umur Lampu", type: "benefit", weight: 0.15 },
    c5: { code: "C5", name: "Daya Listrik", type: "cost", weight: 0.10 }
};

// Map resolution scores to text labels
const RESOLUTION_MAP = {
    1: "800 x 600 (SVGA)",
    2: "1024 x 768 (XGA)",
    3: "1280 x 800 (WXGA)",
    4: "1920 x 1080 (Full HD)"
};

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================

let state = {
    projectors: [],
    criteria: {},
    rankings: []
};

/**
 * Initializes the application state by loading from localStorage
 * or setting the default data if empty.
 */
function initData() {
    const localProjectors = localStorage.getItem("spk_projectors");
    const localCriteria = localStorage.getItem("spk_criteria");

    if (localProjectors) {
        state.projectors = JSON.parse(localProjectors);
    } else {
        state.projectors = [...DEFAULT_PROJECTORS];
        localStorage.setItem("spk_projectors", JSON.stringify(state.projectors));
    }

    if (localCriteria) {
        state.criteria = JSON.parse(localCriteria);
    } else {
        state.criteria = JSON.parse(JSON.stringify(DEFAULT_CRITERIA)); // Deep copy
        localStorage.setItem("spk_criteria", JSON.stringify(state.criteria));
    }
}

/**
 * Persists projectors to localStorage
 */
function saveProjectorsToStorage() {
    localStorage.setItem("spk_projectors", JSON.stringify(state.projectors));
}

/**
 * Persists criteria to localStorage
 */
function saveCriteriaToStorage() {
    localStorage.setItem("spk_criteria", JSON.stringify(state.criteria));
}

// ==========================================
// 3. TOAST ALERT NOTIFICATION
// ==========================================

/**
 * Displays a beautiful toast alert in the top-right corner.
 * @param {string} title Toast alert title
 * @param {string} message Toast descriptive body
 * @param {string} type 'success' | 'warning' | 'error'
 */
function showToast(title, message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    // Choose icon based on toast type
    let iconSvg = "";
    if (type === "success") {
        iconSvg = `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    } else if (type === "warning") {
        iconSvg = `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
    } else if (type === "error") {
        iconSvg = `<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }

    toast.innerHTML = `
        ${iconSvg}
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = "toastSlideIn 0.3s reverse forwards";
        toast.addEventListener("animationend", () => {
            toast.remove();
        });
    }, 4000);
}

// ==========================================
// 4. NAVIGATION / ROUTING SYSTEM
// ==========================================

/**
 * Switches the active section shown to the user.
 * @param {string} targetSectionId Section identifier (e.g. 'dashboard')
 */
function navigateTo(targetSectionId) {
    // Hide all sections, display target
    document.querySelectorAll(".app-section").forEach(sec => {
        sec.classList.remove("active");
    });
    const activeSection = document.getElementById(targetSectionId);
    if (activeSection) {
        activeSection.classList.add("active");
    }

    // Update active state in sidebar
    document.querySelectorAll(".sidebar-menu-item").forEach(item => {
        if (item.getAttribute("data-target") === targetSectionId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    // Update page header title
    const menuLabel = document.querySelector(`.sidebar-menu-item[data-target="${targetSectionId}"] a`);
    if (menuLabel) {
        // Strip text out of icon+text node
        const labelText = menuLabel.textContent.trim();
        document.getElementById("page-header-title").innerText = labelText;
    }

    // Trigger specific page renders/recalculations
    if (targetSectionId === "dashboard") {
        renderDashboardStats();
    } else if (targetSectionId === "projector-data") {
        renderProjectorTable();
    } else if (targetSectionId === "criteria-weight") {
        populateCriteriaForm();
    } else if (targetSectionId === "saw-calculation") {
        renderCalculationSelectors();
    } else if (targetSectionId === "ranking-result") {
        if (state.rankings.length === 0) {
            // Automatically run calculation on all projectors if no results present
            calculateSAW(true);
        }
        renderRankingResult();
    }

    // Scroll back to top
    document.querySelector(".content-body").scrollTop = 0;
}

// Set up UI router event listeners
function setupRouter() {
    document.querySelectorAll(".sidebar-menu-item").forEach(item => {
        item.addEventListener("click", () => {
            const target = item.getAttribute("data-target");
            navigateTo(target);

            // Close mobile sidebar if open
            document.getElementById("sidebar").classList.remove("active");
            document.getElementById("sidebar-backdrop").classList.remove("active");
        });
    });

    // Mobile menu toggle click handlers
    document.getElementById("mobile-toggle").addEventListener("click", () => {
        document.getElementById("sidebar").classList.add("active");
        document.getElementById("sidebar-backdrop").classList.add("active");
    });

    document.getElementById("sidebar-backdrop").addEventListener("click", () => {
        document.getElementById("sidebar").classList.remove("active");
        document.getElementById("sidebar-backdrop").classList.remove("active");
    });
}

// ==========================================
// 5. DASHBOARD FUNCTIONS
// ==========================================

/**
 * Calculates aggregates and displays metrics on dashboard cards.
 */
function renderDashboardStats() {
    const list = state.projectors;
    document.getElementById("stat-total-projectors").innerText = list.length;

    // Average price calculation
    if (list.length > 0) {
        const sumPrice = list.reduce((acc, proj) => acc + proj.price, 0);
        const avgPrice = Math.round(sumPrice / list.length);
        document.getElementById("stat-avg-price").innerText = `Rp ${avgPrice.toLocaleString("id-ID")}`;

        // Max lumens (Brightness)
        const maxBrightness = Math.max(...list.map(p => p.brightness));
        document.getElementById("stat-max-brightness").innerText = `${maxBrightness} lm`;

        // Min power consumption
        const minPower = Math.min(...list.map(p => p.power));
        document.getElementById("stat-min-power").innerText = `${minPower} W`;
    } else {
        document.getElementById("stat-avg-price").innerText = "Rp 0";
        document.getElementById("stat-max-brightness").innerText = "0 lm";
        document.getElementById("stat-min-power").innerText = "0 W";
    }

    // Displays current best projector if computed
    const bestCard = document.getElementById("dashboard-best-card");
    if (state.rankings && state.rankings.length > 0) {
        const best = state.rankings[0];
        document.getElementById("stat-best-projector").innerText = best.name;
        document.getElementById("stat-best-score").innerText = `Skor SAW: ${best.score.toFixed(3)}`;
        bestCard.style.opacity = "1";
    } else {
        document.getElementById("stat-best-projector").innerText = "Belum Dihitung";
        document.getElementById("stat-best-score").innerText = "Jalankan perhitungan SAW";
    }
}

// ==========================================
// 6. CRUD & FILTER OPERATIONS - PROJECTOR DATA
// ==========================================

/**
 * Filters the list of projectors based on search values and dropdown metrics.
 */
function renderProjectorTable() {
    const tbody = document.getElementById("projector-table-body");
    tbody.innerHTML = "";

    const searchVal = document.getElementById("search-projector").value.toLowerCase();
    const filterPrice = document.getElementById("filter-price").value;
    const filterBrightness = document.getElementById("filter-brightness").value;
    const filterResolution = document.getElementById("filter-resolution").value;

    // Filter array
    const filteredList = state.projectors.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchVal);
        const matchPrice = filterPrice ? p.price <= parseInt(filterPrice) : true;
        const matchBrightness = filterBrightness ? p.brightness >= parseInt(filterBrightness) : true;
        const matchResolution = filterResolution ? p.resolution >= parseInt(filterResolution) : true;
        return matchSearch && matchPrice && matchBrightness && matchResolution;
    });

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px 0;">Tidak ada proyektor yang sesuai dengan filter pencarian.</td></tr>`;
        return;
    }

    // Render rows
    filteredList.forEach((proj) => {
        // Find index of projector in master state array
        const masterIndex = state.projectors.findIndex(p => p.name === proj.name);

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 600;">${proj.name}</td>
            <td>Rp ${proj.price.toLocaleString("id-ID")}</td>
            <td>${proj.brightness} lm</td>
            <td>${RESOLUTION_MAP[proj.resolution]}</td>
            <td>${proj.lamplife.toLocaleString("id-ID")} Jam</td>
            <td>${proj.power} W</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="openEditModal(${masterIndex})" title="Edit Proyektor">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="openDeleteDialog(${masterIndex})" title="Hapus Proyektor">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Handles validation and creation of a new projector.
 */
function setupAddProjectorForm() {
    const form = document.getElementById("add-projector-form");
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("add-name").value.trim();
        const price = parseFloat(document.getElementById("add-price").value);
        const brightness = parseFloat(document.getElementById("add-brightness").value);
        const resolution = parseInt(document.getElementById("add-resolution").value);
        const lamplife = parseFloat(document.getElementById("add-lamplife").value);
        const power = parseFloat(document.getElementById("add-power").value);

        // Validation checks
        if (!name) {
            showToast("Gagal Menyimpan", "Nama proyektor tidak boleh kosong.", "error");
            return;
        }

        // Duplicate validation
        const isDuplicate = state.projectors.some(p => p.name.toLowerCase() === name.toLowerCase());
        if (isDuplicate) {
            showToast("Gagal Menyimpan", "Proyektor dengan nama tersebut sudah terdaftar.", "error");
            return;
        }

        if (isNaN(price) || price <= 0 || isNaN(brightness) || brightness <= 0 || 
            isNaN(resolution) || isNaN(lamplife) || lamplife <= 0 || isNaN(power) || power <= 0) {
            showToast("Gagal Menyimpan", "Silakan lengkapi formulir dengan nilai numerik positif.", "error");
            return;
        }

        // Add new projector
        const newProjector = { name, price, brightness, resolution, lamplife, power };
        state.projectors.push(newProjector);
        saveProjectorsToStorage();

        // Clear rankings because a new alternative is added
        state.rankings = [];

        showToast("Proyektor Disimpan", `Berhasil menambahkan ${name} ke database local.`, "success");
        form.reset();
        navigateTo("projector-data");
    });
}

/**
 * Populates and displays edit modal for a projector.
 * @param {number} index Index of projector in master array
 */
function openEditModal(index) {
    const proj = state.projectors[index];
    document.getElementById("edit-index").value = index;
    document.getElementById("edit-name").value = proj.name;
    document.getElementById("edit-price").value = proj.price;
    document.getElementById("edit-brightness").value = proj.brightness;
    document.getElementById("edit-resolution").value = proj.resolution;
    document.getElementById("edit-lamplife").value = proj.lamplife;
    document.getElementById("edit-power").value = proj.power;

    document.getElementById("edit-modal-overlay").classList.add("active");
}

/**
 * Hides edit modal wrapper.
 */
function closeEditModal() {
    document.getElementById("edit-modal-overlay").classList.remove("active");
}

/**
 * Handles editing submit action.
 */
function setupEditSubmit() {
    document.getElementById("close-edit-modal").addEventListener("click", closeEditModal);
    document.getElementById("cancel-edit-btn").addEventListener("click", closeEditModal);

    document.getElementById("save-edit-btn").addEventListener("click", () => {
        const index = parseInt(document.getElementById("edit-index").value);
        const name = document.getElementById("edit-name").value.trim();
        const price = parseFloat(document.getElementById("edit-price").value);
        const brightness = parseFloat(document.getElementById("edit-brightness").value);
        const resolution = parseInt(document.getElementById("edit-resolution").value);
        const lamplife = parseFloat(document.getElementById("edit-lamplife").value);
        const power = parseFloat(document.getElementById("edit-power").value);

        // Validation
        if (!name) {
            showToast("Gagal Menyimpan", "Nama proyektor tidak boleh kosong.", "error");
            return;
        }

        // Duplicate validation (ignoring current index)
        const isDuplicate = state.projectors.some((p, idx) => p.name.toLowerCase() === name.toLowerCase() && idx !== index);
        if (isDuplicate) {
            showToast("Gagal Menyimpan", "Proyektor dengan nama tersebut sudah terdaftar.", "error");
            return;
        }

        if (isNaN(price) || price <= 0 || isNaN(brightness) || brightness <= 0 || 
            isNaN(resolution) || isNaN(lamplife) || lamplife <= 0 || isNaN(power) || power <= 0) {
            showToast("Gagal Menyimpan", "Silakan lengkapi data dengan nilai numerik positif.", "error");
            return;
        }

        // Update state
        state.projectors[index] = { name, price, brightness, resolution, lamplife, power };
        saveProjectorsToStorage();

        // Clear rankings as metrics changed
        state.rankings = [];

        closeEditModal();
        renderProjectorTable();
        showToast("Perubahan Disimpan", `Berhasil mengupdate data ${name}.`, "success");
    });
}

/**
 * Opens custom alert prompt to delete projector.
 * @param {number} index Index of projector in master array
 */
function openDeleteDialog(index) {
    const proj = state.projectors[index];
    document.getElementById("delete-index").value = index;
    document.getElementById("delete-modal-title").innerText = `Hapus ${proj.name}?`;
    document.getElementById("delete-modal-overlay").classList.add("active");
}

/**
 * Hides delete confirmation prompt.
 */
function closeDeleteDialog() {
    document.getElementById("delete-modal-overlay").classList.remove("active");
}

/**
 * Handles confirmation deleting action.
 */
function setupDeleteSubmit() {
    document.getElementById("cancel-delete-btn").addEventListener("click", closeDeleteDialog);
    document.getElementById("confirm-delete-btn").addEventListener("click", () => {
        const index = parseInt(document.getElementById("delete-index").value);
        const name = state.projectors[index].name;

        state.projectors.splice(index, 1);
        saveProjectorsToStorage();

        // Reset calculated rankings
        state.rankings = [];

        closeDeleteDialog();
        renderProjectorTable();
        showToast("Proyektor Dihapus", `Berhasil menghapus ${name} dari daftar.`, "success");
    });
}

// Bind search and filter events
function setupFilters() {
    document.getElementById("search-projector").addEventListener("input", renderProjectorTable);
    document.getElementById("filter-price").addEventListener("change", renderProjectorTable);
    document.getElementById("filter-brightness").addEventListener("change", renderProjectorTable);
    document.getElementById("filter-resolution").addEventListener("change", renderProjectorTable);
}

// ==========================================
// 7. CRITERIA & WEIGHT CONFIGURATION
// ==========================================

/**
 * Populates current weights into editable forms.
 */
function populateCriteriaForm() {
    document.getElementById("weight-c1").value = Math.round(state.criteria.c1.weight * 100);
    document.getElementById("weight-c2").value = Math.round(state.criteria.c2.weight * 100);
    document.getElementById("weight-c3").value = Math.round(state.criteria.c3.weight * 100);
    document.getElementById("weight-c4").value = Math.round(state.criteria.c4.weight * 100);
    document.getElementById("weight-c5").value = Math.round(state.criteria.c5.weight * 100);

    calculateFormTotalWeight();
}

/**
 * Displays live validation calculation of weights.
 */
function calculateFormTotalWeight() {
    const c1 = parseInt(document.getElementById("weight-c1").value) || 0;
    const c2 = parseInt(document.getElementById("weight-c2").value) || 0;
    const c3 = parseInt(document.getElementById("weight-c3").value) || 0;
    const c4 = parseInt(document.getElementById("weight-c4").value) || 0;
    const c5 = parseInt(document.getElementById("weight-c5").value) || 0;

    const total = c1 + c2 + c3 + c4 + c5;
    const calcDisplay = document.getElementById("total-weight-calc");
    const msgDisplay = document.getElementById("weight-validation-msg");
    const saveBtn = document.getElementById("save-weights-btn");

    calcDisplay.innerText = `${total}%`;

    if (total === 100) {
        calcDisplay.style.color = "var(--success)";
        msgDisplay.innerText = "Sesuai (Total bobot 100%)";
        msgDisplay.style.color = "var(--success)";
        saveBtn.disabled = false;
        saveBtn.style.opacity = "1";
        saveBtn.style.cursor = "pointer";
    } else {
        calcDisplay.style.color = "var(--error)";
        msgDisplay.innerText = `Total bobot harus 100%. Kurang/Lebih ${Math.abs(100 - total)}%`;
        msgDisplay.style.color = "var(--error)";
        saveBtn.disabled = true;
        saveBtn.style.opacity = "0.6";
        saveBtn.style.cursor = "not-allowed";
    }
}

/**
 * Handles weights form submitting and validation.
 */
function setupCriteriaForm() {
    const form = document.getElementById("criteria-form");
    
    // Bind change listener on weights
    document.querySelectorAll(".weight-input").forEach(input => {
        input.addEventListener("input", calculateFormTotalWeight);
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const c1 = parseInt(document.getElementById("weight-c1").value) || 0;
        const c2 = parseInt(document.getElementById("weight-c2").value) || 0;
        const c3 = parseInt(document.getElementById("weight-c3").value) || 0;
        const c4 = parseInt(document.getElementById("weight-c4").value) || 0;
        const c5 = parseInt(document.getElementById("weight-c5").value) || 0;

        const total = c1 + c2 + c3 + c4 + c5;
        if (total !== 100) {
            showToast("Gagal Menyimpan", "Total pembobotan harus bernilai tepat 100%.", "error");
            return;
        }

        // Update weights in state
        state.criteria.c1.weight = c1 / 100;
        state.criteria.c2.weight = c2 / 100;
        state.criteria.c3.weight = c3 / 100;
        state.criteria.c4.weight = c4 / 100;
        state.criteria.c5.weight = c5 / 100;

        saveCriteriaToStorage();

        // Render weight labels in display layout
        document.getElementById("c1-display-weight").innerText = `${c1}%`;
        document.getElementById("c2-display-weight").innerText = `${c2}%`;
        document.getElementById("c3-display-weight").innerText = `${c3}%`;
        document.getElementById("c4-display-weight").innerText = `${c4}%`;
        document.getElementById("c5-display-weight").innerText = `${c5}%`;

        // Clear rankings as weights changed
        state.rankings = [];

        showToast("Bobot Diperbarui", "Bobot kepentingan kriteria berhasil disimpan ke Local Storage.", "success");
    });
}

// ==========================================
// 8. SAW CALCULATION CORE ENGINE
// ==========================================

/**
 * Renders the projector list in calculation page.
 */
function renderCalculationSelectors() {
    const tbody = document.getElementById("calculation-table-body");
    tbody.innerHTML = "";

    if (state.projectors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px 0;">Tidak ada proyektor. Tambah proyektor terlebih dahulu.</td></tr>`;
        return;
    }

    state.projectors.forEach((proj, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <label class="checkbox-container" style="margin-bottom: 0;">
                    <input type="checkbox" class="calc-selector" value="${idx}" checked>
                    <span class="checkmark"></span>
                </label>
            </td>
            <td style="font-weight: 600;">${proj.name}</td>
            <td>Rp ${proj.price.toLocaleString("id-ID")}</td>
            <td>${proj.brightness} lm</td>
            <td>${RESOLUTION_MAP[proj.resolution]}</td>
            <td>${proj.lamplife.toLocaleString("id-ID")} Jam</td>
            <td>${proj.power} W</td>
        `;
        tbody.appendChild(tr);
    });

    // Checkbox selector interactions
    const selectAll = document.getElementById("select-all-projectors");
    const selectors = document.querySelectorAll(".calc-selector");

    selectAll.addEventListener("change", () => {
        selectors.forEach(chk => {
            chk.checked = selectAll.checked;
        });
    });

    selectors.forEach(chk => {
        chk.addEventListener("change", () => {
            const allChecked = Array.from(selectors).every(c => c.checked);
            selectAll.checked = allChecked;
        });
    });
}

/**
 * Runs the SAW Algorithm and displays output steps dynamically.
 * @param {boolean} calculateAll If true, ignores selections and calculates for all items.
 */
function calculateSAW(calculateAll = false) {
    let selectedIndices = [];
    if (calculateAll) {
        selectedIndices = state.projectors.map((_, i) => i);
    } else {
        selectedIndices = Array.from(document.querySelectorAll(".calc-selector:checked")).map(c => parseInt(c.value));
    }

    const warningBanner = document.getElementById("calculation-warning");
    const stepsOutput = document.getElementById("saw-steps-output");

    if (selectedIndices.length < 2) {
        if (!calculateAll) {
            warningBanner.style.display = "flex";
            stepsOutput.style.display = "none";
            showToast("Pilih Alternatif", "Centang minimal 2 proyektor untuk dihitung.", "warning");
        }
        return;
    } else {
        if (warningBanner) warningBanner.style.display = "none";
    }

    const selectedProjectors = selectedIndices.map(idx => state.projectors[idx]);

    // ----------------------------------------
    // STEP 1: Decision Matrix (X)
    // ----------------------------------------
    // Construct decision matrix structure
    const decisionMatrixHtml = `
        <thead>
            <tr>
                <th>Alternatif (Proyektor)</th>
                <th>C1 (Harga)</th>
                <th>C2 (Kecerahan)</th>
                <th>C3 (Resolusi)</th>
                <th>C4 (Umur Lampu)</th>
                <th>C5 (Daya)</th>
            </tr>
        </thead>
        <tbody>
            ${selectedProjectors.map(p => `
                <tr>
                    <td style="font-weight: 600;">${p.name}</td>
                    <td>Rp ${p.price.toLocaleString("id-ID")}</td>
                    <td>${p.brightness} lm</td>
                    <td>${p.resolution} (Skor)</td>
                    <td>${p.lamplife.toLocaleString("id-ID")} Jam</td>
                    <td>${p.power} W</td>
                </tr>
            `).join("")}
        </tbody>
    `;
    document.getElementById("step1-table").innerHTML = decisionMatrixHtml;

    // ----------------------------------------
    // STEP 2 & 3: Normalization (R)
    // ----------------------------------------
    // Find min and max for each criteria
    const prices = selectedProjectors.map(p => p.price);
    const brightnesses = selectedProjectors.map(p => p.brightness);
    const resolutions = selectedProjectors.map(p => p.resolution);
    const lamplifes = selectedProjectors.map(p => p.lamplife);
    const powers = selectedProjectors.map(p => p.power);

    const minPrice = Math.min(...prices);
    const maxBrightness = Math.max(...brightnesses);
    const maxResolution = Math.max(...resolutions);
    const maxLamplife = Math.max(...lamplifes);
    const minPower = Math.min(...powers);

    // Compute normalized values
    const normalizedMatrix = selectedProjectors.map(p => {
        return {
            name: p.name,
            c1: minPrice / p.price,                     // Cost: min / value
            c2: p.brightness / maxBrightness,           // Benefit: value / max
            c3: p.resolution / maxResolution,           // Benefit: value / max
            c4: p.lamplife / maxLamplife,               // Benefit: value / max
            c5: minPower / p.power                      // Cost: min / value
        };
    });

    const normalizedMatrixHtml = `
        <thead>
            <tr>
                <th>Alternatif (Proyektor)</th>
                <th>C1 (Harga)</th>
                <th>C2 (Kecerahan)</th>
                <th>C3 (Resolusi)</th>
                <th>C4 (Umur Lampu)</th>
                <th>C5 (Daya)</th>
            </tr>
        </thead>
        <tbody>
            ${normalizedMatrix.map(n => `
                <tr>
                    <td style="font-weight: 600;">${n.name}</td>
                    <td>${n.c1.toFixed(3)}</td>
                    <td>${n.c2.toFixed(3)}</td>
                    <td>${n.c3.toFixed(3)}</td>
                    <td>${n.c4.toFixed(3)}</td>
                    <td>${n.c5.toFixed(3)}</td>
                </tr>
            `).join("")}
        </tbody>
    `;
    document.getElementById("step3-table").innerHTML = normalizedMatrixHtml;

    // ----------------------------------------
    // STEP 4 & 5: Preference Values & Ranking
    // ----------------------------------------
    const w1 = state.criteria.c1.weight;
    const w2 = state.criteria.c2.weight;
    const w3 = state.criteria.c3.weight;
    const w4 = state.criteria.c4.weight;
    const w5 = state.criteria.c5.weight;

    const computedRankings = normalizedMatrix.map(n => {
        const score = (n.c1 * w1) + (n.c2 * w2) + (n.c3 * w3) + (n.c4 * w4) + (n.c5 * w5);
        return {
            name: n.name,
            score: score,
            formula: `(${n.c1.toFixed(3)} × ${w1}) + (${n.c2.toFixed(3)} × ${w2}) + (${n.c3.toFixed(3)} × ${w3}) + (${n.c4.toFixed(3)} × ${w4}) + (${n.c5.toFixed(3)} × ${w5})`
        };
    });

    // Render preference calculations table
    const preferenceHtml = `
        <thead>
            <tr>
                <th>Alternatif (Proyektor)</th>
                <th>Perhitungan Penjumlahan Terbobot (W × R)</th>
                <th>Skor Akhir (V)</th>
            </tr>
        </thead>
        <tbody>
            ${computedRankings.map(v => `
                <tr>
                    <td style="font-weight: 600;">${v.name}</td>
                    <td style="font-family: monospace; font-size: 12px; color: var(--text-muted);">${v.formula}</td>
                    <td style="font-weight: 700; color: var(--primary);">${v.score.toFixed(4)}</td>
                </tr>
            `).join("")}
        </tbody>
    `;
    document.getElementById("step4-table").innerHTML = preferenceHtml;

    // Sort rankings descending
    computedRankings.sort((a, b) => b.score - a.score);
    state.rankings = computedRankings;

    if (!calculateAll) {
        stepsOutput.style.display = "block";
        showToast("SAW Selesai Dihitung", "Lihat langkah-langkah detail di bawah tabel.", "success");
        
        // Scroll calculation step into view smoothly
        setTimeout(() => {
            stepsOutput.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
    }
}

// Bind SAW Calculation button actions
function setupSAWCalculations() {
    document.getElementById("start-calculation-btn").addEventListener("click", () => {
        calculateSAW(false);
    });

    document.getElementById("view-rankings-btn").addEventListener("click", () => {
        navigateTo("ranking-result");
    });
}

// ==========================================
// 9. RESULT & GRAPH VISUALIZATION
// ==========================================

/**
 * Renders rankings list and paints HTML5 Canvas chart.
 */
function renderRankingResult() {
    const tbody = document.getElementById("ranking-table-body");
    tbody.innerHTML = "";

    if (state.rankings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 32px 0;">Belum ada hasil ranking. Jalankan perhitungan di tab "Perhitungan SAW".</td></tr>`;
        
        // Clear recommendation header
        document.getElementById("best-projector-name").innerText = "Belum Ada Data";
        document.getElementById("best-projector-score").innerText = "0.000";
        return;
    }

    // Populate recommendation banner with Rank 1 item
    const best = state.rankings[0];
    document.getElementById("best-projector-name").innerText = best.name;
    document.getElementById("best-projector-score").innerText = best.score.toFixed(4);

    // Populate rankings table
    state.rankings.forEach((rank, idx) => {
        const tr = document.createElement("tr");
        let badgeColor = "var(--secondary)";
        if (idx === 0) badgeColor = "#d97706"; // Gold
        else if (idx === 1) badgeColor = "#475569"; // Silver
        else if (idx === 2) badgeColor = "#b45309"; // Bronze

        tr.innerHTML = `
            <td style="text-align: center;">
                <span class="weight-badge" style="background-color: ${badgeColor}; color: white; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;">
                    ${idx + 1}
                </span>
            </td>
            <td style="font-weight: 600;">${rank.name}</td>
            <td style="font-weight: 700; color: var(--primary);">${rank.score.toFixed(4)}</td>
            <td style="color: var(--text-muted); font-size: 13px;">
                ${idx === 0 ? "Pilihan Utama (Rekomendasi Terbaik)" : `Prioritas Pilihan ke-${idx + 1}`}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Render Canvas Chart
    renderCanvasChart();
}

/**
 * Draws vertical bar chart of preference scores using pure HTML5 Canvas.
 */
function renderCanvasChart() {
    const canvas = document.getElementById("rankingChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    
    // Reset sizes to prevent drawing glitches and ensure crisp quality on high-density displays
    const rect = canvas.parentNode.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 320;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (state.rankings.length === 0) {
        ctx.fillStyle = "#64748b";
        ctx.font = "14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk divisualisasikan.", width / 2, height / 2);
        return;
    }

    // Chart margins
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Draw baseline axes
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw gridlines and Y-axis scale (Scores range 0.0 to 1.0)
    const yGridCount = 5;
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= yGridCount; i++) {
        const val = i / yGridCount;
        const y = height - padding.bottom - (val * chartHeight);

        // Gridline
        ctx.beginPath();
        ctx.strokeStyle = i === 0 ? "#cbd5e1" : "#f1f5f9";
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Y-Axis label
        ctx.fillText(val.toFixed(1), padding.left - 10, y);
    }

    // Draw X-axis bars (alternatives)
    const barCount = state.rankings.length;
    const spacing = 20;
    const totalSpacing = spacing * (barCount - 1);
    const barWidth = (chartWidth - totalSpacing) / barCount;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    state.rankings.forEach((rank, idx) => {
        const x = padding.left + (idx * (barWidth + spacing));
        const barHeight = rank.score * chartHeight;
        const y = height - padding.bottom - barHeight;

        // Custom Gradient fill for the bar
        const gradient = ctx.createLinearGradient(x, y, x, height - padding.bottom);
        // Highlight Rank 1 with different color gradient
        if (idx === 0) {
            gradient.addColorStop(0, "#fbbf24"); // Amber
            gradient.addColorStop(1, "#d97706");
        } else {
            gradient.addColorStop(0, "#60a5fa"); // Primary Blue
            gradient.addColorStop(1, "#2563eb");
        }

        ctx.fillStyle = gradient;

        // Draw bar shape (rounded top corner)
        const radius = Math.min(6, barHeight);
        ctx.beginPath();
        ctx.moveTo(x, height - padding.bottom);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, height - padding.bottom);
        ctx.closePath();
        ctx.fill();

        // Draw score text on top of the bar
        ctx.fillStyle = idx === 0 ? "#b45309" : "#1e3a8a";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.fillText(rank.score.toFixed(3), x + (barWidth / 2), y - 16);

        // Draw X-axis label (truncate long text)
        ctx.fillStyle = "#334155";
        ctx.font = "11px Inter, sans-serif";
        let label = rank.name;
        if (barWidth < 90 && label.length > 10) {
            label = label.substring(0, 8) + "..";
        }
        ctx.fillText(label, x + (barWidth / 2), height - padding.bottom + 8);
    });
}

/**
 * Hooks up window print triggers for PDF export.
 */
function setupPDFExport() {
    document.getElementById("export-pdf-btn").addEventListener("click", () => {
        // Redraw canvas chart just before printing to guarantee proper dimensions
        renderCanvasChart();
        // Fire native browser print dialog
        window.print();
    });
}

// ==========================================
// 10. SYSTEM INITIALIZATION
// ==========================================

// Ensure DOM components are loaded before operations
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load data
    initData();

    // 2. Set current date on header
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("current-date-time").innerText = new Date().toLocaleDateString("id-ID", options);

    // 3. Set up listeners
    setupRouter();
    setupFilters();
    setupAddProjectorForm();
    setupEditSubmit();
    setupDeleteSubmit();
    setupCriteriaForm();
    setupSAWCalculations();
    setupPDFExport();

    // 4. Navigate to initial page
    navigateTo("dashboard");
});
