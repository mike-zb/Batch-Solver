let work;
        let addBufferInterval;
        let solveID = 0;
        let caseNum = 1;
        let depth = 0;
        let numSolutions;
        let subgroupRowID = 3;
        let subgroupRows = 1;
        let sortingRowID = 3;
        let sortingRows = 1;
        let speedBuffer = [];
        let solutionsBuffer = [];
        let debugVars = [];
        let colMask;
        let moveWeights = new Map();

        let startTime = Date.now();
        let failed = [];
        let isIdle = true;
        let totalSTM, totalSQTM, totalESQ;
        let sortCriteria;
        let restoredScrambleRecords = null;
        let restoredIgnoreRecords = null;
        let moveColorSettings = {};
        let colorMenuMove = null;
        let colorMenuFilter = "all";
        let suppressedMoveClick = null;
        let solutionMenuAlgorithm = "";
        const ALG_VISUALIZATION_URL = "https://alg.cubing.net/?setup=x2&type=alg&alg=";
        const MOVE_COLORS = ["#ff5c5c", "#ff8a3d", "#f2c94c", "#6fcf97", "#2dd4bf", "#56ccf2", "#4d9cff", "#6c63ff", "#9b6cff", "#c65cff", "#e056fd", "#ff63b8", "#ffffff", "#c7d0d9", "#8d99a6", "#5c6770"];

        const MOVE_GRID = ["U", "u", "D", "d", "R", "r", "L", "l", "F", "f", "B", "b"];
        const SLICE_MOVES = ["E", "M", "S"];

        function updateSubgroupValue() {
            const selected = [...document.querySelectorAll(".face-move.active")]
                .map(button => button.dataset.move);
            document.querySelector(".subgroup").value = selected.join(" ");
            saveAppState();
        }

        function toggleFaceMove(button) {
            button.classList.toggle("active");
            closeMoveColorMenu();
            updateSubgroupValue();
            refreshSolutionColors();
        }

        function openMoveColorMenuAt(button, clientX, clientY) {
            if (!button.classList.contains("active")) return;
            colorMenuMove = button.dataset.move;
            const menu = document.getElementById("move-color-menu");
            menu.querySelector('[data-filter="cw"]').textContent = colorMenuMove;
            menu.querySelector('[data-filter="ccw"]').textContent = `${colorMenuMove}'`;
            menu.querySelector('[data-filter="double"]').textContent = `${colorMenuMove}2`;
            menu.hidden = false;
            menu.querySelector(".move-color-palette").hidden = true;
            updateMoveColorMenuSelections();
            const left = Math.min(clientX, window.innerWidth - menu.offsetWidth - 8);
            const top = Math.min(clientY, window.innerHeight - menu.offsetHeight - 8);
            menu.style.left = `${Math.max(8, left)}px`;
            menu.style.top = `${Math.max(8, top)}px`;
        }

        function openMoveColorMenu(event, button) {
            if (!button.classList.contains("active")) return;
            event.preventDefault();
            openMoveColorMenuAt(button, event.clientX, event.clientY);
        }

        function addMoveLongPress(button) {
            let timer = null;
            let startX = 0;
            let startY = 0;
            const cancel = () => {
                clearTimeout(timer);
                timer = null;
            };
            button.addEventListener("pointerdown", event => {
                if (event.pointerType !== "touch" || !button.classList.contains("active")) return;
                startX = event.clientX;
                startY = event.clientY;
                timer = setTimeout(() => {
                    suppressedMoveClick = button;
                    openMoveColorMenuAt(button, startX, startY);
                    setTimeout(() => {
                        if (suppressedMoveClick === button) suppressedMoveClick = null;
                    }, 1000);
                }, 500);
            });
            button.addEventListener("pointermove", event => {
                if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) cancel();
            });
            button.addEventListener("pointerup", cancel);
            button.addEventListener("pointercancel", cancel);
        }

        function closeMoveColorMenu() {
            const menu = document.getElementById("move-color-menu");
            if (menu) menu.hidden = true;
        }

        function updateMoveColorIndicators() {
            document.querySelectorAll(".face-move").forEach(button => {
                const setting = moveColorSettings[button.dataset.move];
                button.classList.toggle("has-all-color", Boolean(setting?.all));
                if (setting?.all) {
                    button.style.setProperty("--move-all-color", setting.all);
                    button.style.setProperty("--move-all-text", readableTextColor(setting.all));
                } else {
                    button.style.removeProperty("--move-all-color");
                    button.style.removeProperty("--move-all-text");
                }
            });
        }

        function readableTextColor(color) {
            const value = color.slice(1);
            const red = parseInt(value.slice(0, 2), 16);
            const green = parseInt(value.slice(2, 4), 16);
            const blue = parseInt(value.slice(4, 6), 16);
            return (red * 299 + green * 587 + blue * 114) / 1000 > 155 ? "#11181d" : "#ffffff";
        }

        function updateMoveColorMenuSelections() {
            const setting = moveColorSettings[colorMenuMove] || {};
            document.querySelectorAll("#move-color-menu [data-filter]").forEach(button => {
                const color = setting[button.dataset.filter];
                button.classList.toggle("selected", Boolean(color));
                button.style.backgroundColor = color || "";
                button.style.color = color ? readableTextColor(color) : "";
            });
        }

        function createMoveColorMenu() {
            const menu = document.createElement("div");
            menu.id = "move-color-menu";
            menu.className = "move-color-menu";
            menu.hidden = true;
            menu.innerHTML = `<div class="move-color-filters">
                <button type="button" data-filter="all">All</button><button type="button" data-filter="cw">CW</button>
                <button type="button" data-filter="ccw">CCW</button><button type="button" data-filter="double">Double</button>
                <button type="button" data-filter="clear">Clear</button></div><div class="move-color-palette" hidden></div>`;
            const palette = menu.querySelector(".move-color-palette");
            for (const color of MOVE_COLORS) {
                const swatch = document.createElement("button");
                swatch.type = "button";
                swatch.className = "move-color-swatch";
                swatch.style.backgroundColor = color;
                swatch.title = color;
                swatch.addEventListener("click", () => {
                    if (colorMenuFilter === "all") {
                        moveColorSettings[colorMenuMove] = {all: color};
                    } else {
                        const setting = moveColorSettings[colorMenuMove] || {};
                        delete setting.all;
                        setting[colorMenuFilter] = color;
                        moveColorSettings[colorMenuMove] = setting;
                    }
                    saveAppState();
                    updateMoveColorIndicators();
                    updateMoveColorMenuSelections();
                    refreshSolutionColors();
                    palette.hidden = true;
                });
                palette.appendChild(swatch);
            }
            menu.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
                const filter = button.dataset.filter;
                if (filter === "clear") {
                    delete moveColorSettings[colorMenuMove];
                    saveAppState();
                    updateMoveColorIndicators();
                    refreshSolutionColors();
                    closeMoveColorMenu();
                    return;
                }
                colorMenuFilter = filter;
                palette.hidden = false;
            }));
            document.body.appendChild(menu);
            document.addEventListener("pointerdown", event => {
                if (!menu.hidden && !menu.contains(event.target)) closeMoveColorMenu();
            });
            document.addEventListener("keydown", event => {
                if (event.key === "Escape") closeMoveColorMenu();
            });
        }

        function buildMoveGrid() {
            const grid = document.getElementById("move-grid");
            const faces = document.createElement("div");
            faces.className = "face-move-grid";
            const slices = document.createElement("div");
            slices.className = "slice-move-grid";
            for (const move of MOVE_GRID.concat(SLICE_MOVES)) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "move-button face-move";
                button.dataset.move = move;
                button.textContent = move;
                if (move === "U") button.classList.add("active");
                button.addEventListener("click", event => {
                    if (suppressedMoveClick === button) {
                        suppressedMoveClick = null;
                        event.preventDefault();
                        return;
                    }
                    toggleFaceMove(button);
                });
                button.addEventListener("contextmenu", event => openMoveColorMenu(event, button));
                addMoveLongPress(button);
                (SLICE_MOVES.includes(move) ? slices : faces).appendChild(button);
            }
            grid.append(faces, slices);
            createMoveColorMenu();
            updateSubgroupValue();
        }

        function changeDepth(inputId, delta) {
            const input = document.getElementById(inputId);
            input.value = Math.min(20, Math.max(0, Number(input.value) + delta));
            saveAppState();
        }

        const STORAGE_KEY = "batch-solver-settings-v1";
        let restoringState = true;

        function moveOutputPopovers() {
            const placements = [
                ["imageOptions", "#settings-image-panel"],
                ["sorting-table", ".output-case-sorting"],
                ["esqOptions", "#settings-esq-panel"]
            ];
            for (const [contentId, targetSelector] of placements) {
                const content = document.getElementById(contentId);
                const source = content.closest(".category-popover");
                const target = document.querySelector(targetSelector);
                const panel = content.classList.contains("category-panel") ? content : content.closest(".category-panel");
                target.appendChild(panel);
                if (contentId === "imageOptions" || contentId === "esqOptions") panel.classList.add("settings-embedded-panel");
                source.remove();
            }
            document.querySelector(".run-config")?.remove();
        }

        moveOutputPopovers();
        buildMoveGrid();
        restoringState = false;

        function getCaseSortingState() {
            const types = document.querySelectorAll(".sorting-type");
            const pieces = document.querySelectorAll(".sorting-pieces");
            return [...types].map((type, index) => ({type: type.value, pieces: pieces[index].value}));
        }

        function saveAppState() {
            if (restoringState) return;
            const fields = ["ignore", "solve", "pre-adjustments", "post-adjustments", "sortBy", "secondary-metric", "statVis", "showPostAdj", "maxSolutions", "rankESQ", "esq-gen-select", "generationESQ", "img-select", "faceletColors", "fillColor", "fillOpacity", "overrideMask", "generatedMask"];
            const values = {};
            for (const id of fields) {
                const element = document.getElementById(id);
                values[id] = element.type === "checkbox" ? element.checked : element.value;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                values,
                prune: document.querySelector(".prune").value,
                search: document.querySelector(".search").value,
                faces: [...document.querySelectorAll(".face-move.active")].map(button => button.dataset.move),
                moveColors: moveColorSettings,
                scrambleRecords: [...document.querySelectorAll(".scramble-line-row")].map(row => ({value: row.querySelector(".scramble-line").value, enabled: row.querySelector(".scramble-toggle").checked})),
                ignoreRecords: [...document.querySelectorAll(".ignore-line-row")].map(row => ({value: row.querySelector(".ignore-line").value, enabled: row.querySelector(".ignore-toggle").checked})),
                sorting: getCaseSortingState()
            }));
        }

        function restoreAppState() {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            restoringState = true;
            try {
                const state = JSON.parse(raw);
                moveColorSettings = state.moveColors || {};
                for (const [move, setting] of Object.entries(moveColorSettings)) {
                    if (setting?.filter && setting?.color) moveColorSettings[move] = {[setting.filter]: setting.color};
                }
                updateMoveColorIndicators();
                restoredScrambleRecords = state.scrambleRecords || null;
                restoredIgnoreRecords = state.ignoreRecords || null;
                for (const [id, value] of Object.entries(state.values || {})) {
                    const element = document.getElementById(id);
                    if (!element) continue;
                    if (element.type === "checkbox") element.checked = value;
                    else element.value = value;
                }
                if (document.getElementById("overrideMask").checked && document.getElementById("generatedMask").checked) {
                    document.getElementById("generatedMask").checked = false;
                }
                updateMaskFieldAvailability();
                document.querySelector(".prune").value = Math.min(20, Math.max(0, Number(state.prune ?? 3)));
                document.querySelector(".search").value = Math.min(20, Math.max(0, Number(state.search ?? 5)));
                const legacySlices = Object.entries(state.sliceVariants || {})
                    .filter(([, variants]) => variants.some(Boolean))
                    .map(([move]) => move);
                const storedFaces = [...(state.faces || []), ...legacySlices];
                const hasStoredSubgroup = Array.isArray(state.faces) || state.sliceVariants;
                document.querySelectorAll(".face-move").forEach(button => {
                    button.classList.toggle("active", hasStoredSubgroup ? storedFaces.includes(button.dataset.move) : button.dataset.move === "U");
                });

                const sorting = state.sorting?.length ? state.sorting : [{type: "priority", pieces: ""}];
                while (document.querySelectorAll(".sorting-type").length < sorting.length) {
                    sortButtonHandler(document.querySelector(".add-sorting"));
                }
                document.querySelectorAll(".sorting-type").forEach((type, index) => {
                    type.value = sorting[index].type;
                    document.querySelectorAll(".sorting-pieces")[index].value = sorting[index].pieces;
                });
                visibility("statVis", "statistics-data");
                esqGenSelected(document.getElementById("esq-gen-select"));
                updateFillOpacityLabel();
                updateSubgroupValue();
            } catch (error) {
                console.warn("Stored settings could not be restored.", error);
            } finally {
                restoringState = false;
            }
        }

        restoreAppState();
        renderScrambleEditor();
        renderIgnoreEditor();
        document.addEventListener("input", event => {
            if (event.target.matches("textarea, input, select")) saveAppState();
        });
        document.addEventListener("change", event => {
            if (event.target.matches("textarea, input, select")) saveAppState();
        });
        document.querySelectorAll(".category-popover").forEach(popover => {
            popover.addEventListener("toggle", () => {
                if (!popover.open) return;
                document.querySelectorAll(".category-popover").forEach(other => {
                    if (other !== popover) other.open = false;
                });
            });
        });
        document.querySelector(".settings").addEventListener("toggle", event => {
            if (event.currentTarget.open) selectSettingsCategory("general");
        });
        document.addEventListener("pointerdown", event => {
            document.querySelectorAll(".category-popover[open], .settings[open]").forEach(popover => {
                const panel = popover.querySelector(":scope > .category-panel, :scope > .settings-panel");
                const summary = popover.querySelector(":scope > summary");
                if (panel && !panel.contains(event.target) && !summary.contains(event.target)) popover.open = false;
            });
        });

        function selectSettingsCategory(category) {
            document.querySelectorAll("[data-settings-tab]").forEach(button => button.classList.toggle("active", button.dataset.settingsTab === category));
            document.querySelectorAll("[data-settings-panel]").forEach(panel => panel.hidden = panel.dataset.settingsPanel !== category);
        }

        function visibility(checkboxId, elementId) {
            if (document.getElementById(checkboxId).checked) {
                document.getElementById(elementId).hidden = false;
            } else {
                document.getElementById(elementId).hidden = true;
            }
            saveAppState();
        }

        function previewToggled(c) {
            visibility('previewVis', 'imgPreview')
            visibility('previewVis', 'previewYaw')
            if (c.checked) {
                generateImagePreview();
            }
        }

        function imageSelected(type) {
            imgRot.hidden = type.value.includes("top");
            previewYaw.hidden = type.value.includes("top") || !previewVis.checked;
            generateImagePreview();
        }

        function getMaskString() {
            if (document.getElementById("overrideMask").checked) {
                return document.getElementById("faceletColors").value.slice(0, 54);
            }
            if (document.getElementById("generatedMask").checked) {
                const mask = generateMaskFromIgnore(stripCommentLines(document.getElementById("ignore").value));
                document.getElementById("faceletColors").value = mask;
                return mask;
            }
            return "";
        }

        function updateFillOpacityLabel() {
            const opacity = Math.min(100, Math.max(0, Number(document.getElementById("fillOpacity").value)));
            document.getElementById("fillOpacity").value = opacity;
            document.getElementById("fillOpacityValue").value = `${opacity}%`;
        }

        function syncGeneratedMaskField() {
            if (!document.getElementById("generatedMask").checked) return;
            document.getElementById("faceletColors").value = generateMaskFromIgnore(stripCommentLines(document.getElementById("ignore").value));
        }

        function fillSettingsChanged() {
            updateFillOpacityLabel();
            syncGeneratedMaskField();
            saveAppState();
            generateImagePreview();
        }

        function maskModeChanged(mode) {
            const generated = document.getElementById("generatedMask");
            const override = document.getElementById("overrideMask");
            if (mode === "generated" && generated.checked) override.checked = false;
            if (mode === "override" && override.checked) generated.checked = false;
            updateMaskFieldAvailability();
            syncGeneratedMaskField();
            saveAppState();
            generateImagePreview();
        }

        const FACELET_COLORS = "wwwwwwwwwrrrrrrrrrbbbbbbbbbyyyyyyyyyoooooooooggggggggg";
        const PIECE_FACELETS = {
            UFR: {U: 29, F: 26, R: 15}, UBR: {U: 35, R: 17, B: 51},
            UBL: {U: 33, B: 53, L: 42}, UFL: {U: 27, L: 44, F: 24},
            DFR: {D: 8, R: 9, F: 20}, DBR: {D: 2, R: 11, B: 45},
            DBL: {D: 0, B: 47, L: 36}, DFL: {D: 6, L: 38, F: 18},
            UF: {U: 28, F: 25}, UR: {U: 32, R: 16}, UB: {U: 34, B: 52}, UL: {U: 30, L: 43},
            FR: {F: 23, R: 12}, BR: {B: 48, R: 14}, BL: {B: 50, L: 39}, FL: {F: 21, L: 41},
            DF: {D: 7, F: 19}, DR: {D: 5, R: 10}, DB: {D: 1, B: 46}, DL: {D: 3, L: 37},
            UD: {D: 4, U: 31}, RL: {R: 13, L: 40}, FB: {F: 22, B: 49}
        };

        function generateMaskFromIgnore(ignore) {
            const mask = [...FACELET_COLORS];
            const fillColor = document.getElementById("fillColor").value;
            const aliases = {URB: "UBR", ULF: "UFL", DRB: "DBR", DLF: "DFL"};
            const pieces = ignore.match(/\b[UDFBLR]{2,3}\b/g) || [];
            for (const rawPiece of pieces) {
                const facelets = PIECE_FACELETS[aliases[rawPiece] || rawPiece];
                if (!facelets) continue;
                for (const index of Object.values(facelets)) mask[index] = fillColor;
            }
            return mask.join("");
        }

        function generatedMaskSourceChanged() {
            syncGeneratedMaskField();
            generateImagePreview();
        }

        function updateMaskFieldAvailability() {
            const field = document.getElementById("faceletColors");
            const editable = document.getElementById("overrideMask").checked;
            field.readOnly = !editable;
            field.setAttribute("aria-disabled", String(!editable));
        }

        updateMaskFieldAvailability();

        document.getElementById("ignore-editor").addEventListener("input", generatedMaskSourceChanged);
        document.getElementById("ignore-editor").addEventListener("change", generatedMaskSourceChanged);

        function esqGenSelected(opt) {
            let esqGenField = document.getElementById("generationESQ");
            let esqGenArea = document.getElementById("genESQarea")
            if (opt.value === "default") {
                esqGenField.value = ``;
                esqGenArea.hidden = true;
            } else if (opt.value === "match") {
                esqGenArea.hidden = true;
            } else {
                esqGenArea.hidden = false;
            }
        }

        const THREE_BY_THREE_PUZZLE = `U: (UF UL UB UR) (UFR UFL UBL UBR)
R: (UR BR DR FR) (UFR-1 UBR+1 DBR-1 DFR+1)
F: (UF+1 FR+1 DF+1 FL+1) (UFR+1 DFR-1 DFL+1 UFL-1)
D: (DF DR DB DL) (DFR DBR DBL DFL)
L: (UL FL DL BL) (UFL+1 DFL-1 DBL+1 UBL-1)
B: (UB+1 BL+1 DB+1 BR+1) (UBR-1 UBL+1 DBL-1 DBR+1)
u: (UF UL UB UR) (UFR UFL UBL UBR) (FR+1 FL+1 BL+1 BR+1) (RL FB+1 RL+1)
r: (UR BR DR FR) (UFR-1 UBR+1 DBR-1 DFR+1) (UF+1 UB+1 DB+1 DF+1) (FB UD+1 FB+1)
f: (UF+1 FR+1 DF+1 FL+1) (UFR+1 DFR-1 DFL+1 UFL-1) (UR+1 DR+1 DL+1 UL+1) (UD RL+1 UD+1)
d: (DF DR DB DL) (DFR DBR DBL DFL) (FR+1 BR+1 BL+1 FL+1) (FB RL+1 FB+1)
l: (UL FL DL BL) (UFL+1 DFL-1 DBL+1 UBL-1) (UF+1 DF+1 DB+1 UB+1) (UD FB+1 UD+1)
b: (UB+1 BL+1 DB+1 BR+1) (UBR-1 UBL+1 DBL-1 DBR+1) (UR+1 UL+1 DL+1 DR+1) (RL UD+1 RL+1)
M: (UF+1 DF+1 DB+1 UB+1) (UD FB+1 UD+1)
S: (UR+1 DR+1 DL+1 UL+1) (UD RL+1 UD+1)
E: (FR+1 BR+1 BL+1 FL+1) (FB RL+1 FB+1)
x: (UR BR DR FR) (UFR-1 UBR+1 DBR-1 DFR+1) (UL BL DL FL) (UFL+1 UBL-1 DBL+1 DFL-1) (UF+1 UB+1 DB+1 DF+1) (FB UD+1 FB+1)
y: (UF UL UB UR) (UFR UFL UBL UBR) (DF DL DB DR) (DFR DFL DBL DBR) (FR+1 FL+1 BL+1 BR+1) (RL FB+1 RL+1)
z: (UF+1 FR+1 DF+1 FL+1) (UFR+1 DFR-1 DFL+1 UFL-1) (UB+1 BR+1 DB+1 BL+1) (UBR-1 DBR+1 DBL-1 UBL+1) (UR+1 DR+1 DL+1 UL+1) (UD RL+1 UD+1)`;

        const IMAGE_PALETTE = {
            n: "#000000", d: "#404040", l: "#808080", s: "#BFBFBF",
            w: "#E8E8E8", y: "#D8D900", r: "#A61300", o: "#DB7B00",
            b: "#001E93", g: "#008F0E", m: "#A83DD9", p: "#F33D7B",
            t: "rgba(0,0,0,0)"
        };

        function cubeWithFillPalette() {
            const cube = TTk.TwistyPuzzle(3);
            const fillColor = document.getElementById("fillColor").value;
            const opacity = Math.min(100, Math.max(0, Number(document.getElementById("fillOpacity").value))) / 100;
            const hex = IMAGE_PALETTE[fillColor];
            const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
            const palette = {...IMAGE_PALETTE, [fillColor]: `rgba(${rgb.join(",")},${opacity})`};
            return cube.pzl({...cube.pzl(), palette});
        }

        function cubeImage(fc, setup="", yawOffset=0) {
            let imgType = document.getElementById("img-select").value;
            let cube;
            if (imgType == "3x3x3-top") {
                cube = cubeWithFillPalette().alg(setup);
                cube.context().projection().focalFac(-0.905).near(0.83);
                cube.context().transform().pitch(Math.PI/2).yaw(0);
            } else {
                cube = cubeWithFillPalette().alg(setup);
                cube.context().transform().pitch(parseFloat(document.getElementById("imgPitch").value,10)/180*Math.PI).yaw((yawOffset+parseFloat(document.getElementById("imgYaw").value,10))/180*Math.PI);
            }
            cube = cube.size({width:parseFloat(document.getElementById("imgSize").value,10), height:parseFloat(document.getElementById("imgSize").value,10)})
            if (fc.trim() !== "") {cube = cube.fc(fc)}
            return cube;
        }

        function generateImagePreview() {
            document.getElementById("imgPreview").innerHTML = "";
            let rawYaw = parseInt(document.getElementById("previewYaw").value, 10);
            const SNAP = 25;
            let dispYaw = (rawYaw > SNAP) ? (rawYaw-SNAP) : (rawYaw < -SNAP) ? (rawYaw+SNAP) : 0;
            let cube = cubeImage(getMaskString(), "", dispYaw);
            cube("#imgPreview");
        }

        updateFillOpacityLabel();
        imageSelected(document.getElementById("img-select"));

        function createSolutionTable() {
            document.getElementById("output-grid").insertAdjacentHTML("beforeend", `
                <section class="case-card" data-case="${solveID}">
                    <div class="case-media"><span id="caseNumber${solveID}" class="case-number"></span><span id="caseHeader${solveID}"></span></div>
                    <div id="solutions${solveID}" class="case-solutions"></div>
                </section>`);
        }

        function makeImageCopyable(num) {
            var svg = document.getElementById('caseHeader'+num).children[0]
            svg.setAttribute("stroke", "black")
            var canvas = document.getElementById('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = canvas.height = parseFloat(document.getElementById("imgSize").value,10);
            var data = (new XMLSerializer()).serializeToString(svg);
            var DOMURL = window.URL || window.webkitURL || window;
            var img = new Image();
            var svgBlob = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
            var url = DOMURL.createObjectURL(svgBlob);
            
            img.onload = function () {
                ctx.drawImage(img, 0, 0);
                DOMURL.revokeObjectURL(url);
                var imgURI = canvas.toDataURL('image/png');
                document.getElementById('caseHeader'+num).innerHTML = `<img src=${imgURI} title="#${caseNum}" alt="#${caseNum}"/>`
            };
            img.src = url;
        }

        function getWorkerData() {
            let subgroupData = [];
            let pruneDepths = document.querySelectorAll(".prune");
            let searchDepths = document.querySelectorAll(".search");
            let subgroups = document.querySelectorAll(".subgroup");
            for (let i=0; i<pruneDepths.length; i++) {
                subgroupData.push(
                {subgroup: subgroups[i].value,
                prune: pruneDepths[i].value,
                search: searchDepths[i].value});
            }

            let sortData = [];
            let sortTypes = document.querySelectorAll(".sorting-type");
            let sortPieces = document.querySelectorAll(".sorting-pieces")
            for (let i=0; i<sortTypes.length; i++) {
                sortData.push(
                {type: sortTypes[i].value, 
                pieces: sortPieces[i].value});
            }

            return {puzzle: THREE_BY_THREE_PUZZLE, 
                    ignore: stripCommentLines(document.getElementById('ignore').value),
                    solve: stripCommentLines(document.getElementById('solve').value),
                    preAdjust: document.getElementById('pre-adjustments').value,
                    postAdjust: document.getElementById('post-adjustments').value,
                    subgroups: subgroupData,
                    sorting: sortData,
                    esq: document.getElementById("esq-gen-select").value === "match" ? document.getElementById('rankESQ').value : document.getElementById('generationESQ').value,
                    rankesq: document.getElementById('rankESQ').value,
                    showPost: showPostAdj.checked};
        }

        function stripCommentLines(value) {
            return value
                .split(/\r?\n/)
                .filter(line => !line.trimStart().startsWith("//"))
                .join("\n");
        }

        function isCommentedLine(value) {
            return value.trimStart().startsWith("//");
        }

        function syncScrambleEditor() {
            const lines = [...document.querySelectorAll(".scramble-line-row")].map(row => {
                const value = row.querySelector(".scramble-line").value;
                return row.querySelector(".scramble-toggle").checked ? value : value.split("\n").map(line => `// ${line}`).join("\n");
            });
            document.getElementById("solve").value = lines.join("\n");
            saveAppState();
        }

        function refreshScrambleLine(row) {
            row.classList.toggle("commented", !row.querySelector(".scramble-toggle").checked);
        }

        function createScrambleLine(value = "", enabled = !isCommentedLine(value)) {
            const row = document.createElement("div");
            row.className = "scramble-line-row";
            row.innerHTML = '<input class="scramble-toggle" type="checkbox" aria-label="Enable line"><textarea class="scramble-line" rows="1" wrap="off" spellcheck="false"></textarea>';
            const line = row.querySelector(".scramble-line");
            const toggle = row.querySelector(".scramble-toggle");
            line.value = value.replace(/^(\s*)\/\/\s?/, "$1");
            toggle.checked = enabled;

            toggle.addEventListener("change", () => {
                refreshScrambleLine(row);
                syncScrambleEditor();
            });

            line.addEventListener("input", () => {
                refreshScrambleLine(row);
                syncScrambleEditor();
            });

            line.addEventListener("keydown", event => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    const start = line.selectionStart;
                    const next = createScrambleLine(line.value.slice(start), toggle.checked);
                    line.value = line.value.slice(0, start);
                    row.after(next);
                    refreshScrambleLine(row);
                    syncScrambleEditor();
                    next.querySelector(".scramble-line").focus();
                } else if (event.key === "Backspace" && line.selectionStart === 0 && line.selectionEnd === 0) {
                    const previous = row.previousElementSibling;
                    if (!previous) return;
                    event.preventDefault();
                    const previousLine = previous.querySelector(".scramble-line");
                    const joinAt = previousLine.value.length;
                    previousLine.value += line.value;
                    row.remove();
                    refreshScrambleLine(previous);
                    syncScrambleEditor();
                    previousLine.focus();
                    previousLine.setSelectionRange(joinAt, joinAt);
                }
            });

            refreshScrambleLine(row);
            return row;
        }

        function renderScrambleEditor() {
            const editor = document.getElementById("scramble-editor");
            editor.innerHTML = "";
            const records = restoredScrambleRecords || document.getElementById("solve").value.split(/\r?\n/).map(value => ({value, enabled: !isCommentedLine(value)}));
            for (const record of records) editor.appendChild(createScrambleLine(record.value, record.enabled));
            restoredScrambleRecords = null;
            syncScrambleEditor();
        }

        function syncIgnoreEditor() {
            const lines = [...document.querySelectorAll(".ignore-line-row")].map(row => {
                const value = row.querySelector(".ignore-line").value;
                return row.querySelector(".ignore-toggle").checked ? value : value.split("\n").map(line => `// ${line}`).join("\n");
            });
            document.getElementById("ignore").value = lines.join("\n");
            saveAppState();
        }

        function refreshIgnoreLine(row) {
            row.classList.toggle("commented", !row.querySelector(".ignore-toggle").checked);
        }

        function createIgnoreLine(value = "", enabled = !isCommentedLine(value)) {
            const row = document.createElement("div");
            row.className = "ignore-line-row";
            row.innerHTML = '<input class="ignore-toggle" type="checkbox" aria-label="Enable line"><textarea class="ignore-line" rows="1" wrap="off" spellcheck="false"></textarea>';
            const line = row.querySelector(".ignore-line");
            const toggle = row.querySelector(".ignore-toggle");
            line.value = value.replace(/^(\s*)\/\/\s?/, "$1");
            toggle.checked = enabled;

            toggle.addEventListener("change", () => {
                refreshIgnoreLine(row);
                syncIgnoreEditor();
            });

            line.addEventListener("input", () => {
                refreshIgnoreLine(row);
                syncIgnoreEditor();
            });

            line.addEventListener("keydown", event => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    const start = line.selectionStart;
                    const next = createIgnoreLine(line.value.slice(start), toggle.checked);
                    line.value = line.value.slice(0, start);
                    row.after(next);
                    refreshIgnoreLine(row);
                    syncIgnoreEditor();
                    next.querySelector(".ignore-line").focus();
                } else if (event.key === "Backspace" && line.selectionStart === 0 && line.selectionEnd === 0) {
                    const previous = row.previousElementSibling;
                    if (!previous) return;
                    event.preventDefault();
                    const previousLine = previous.querySelector(".ignore-line");
                    const joinAt = previousLine.value.length;
                    previousLine.value += line.value;
                    row.remove();
                    refreshIgnoreLine(previous);
                    syncIgnoreEditor();
                    previousLine.focus();
                    previousLine.setSelectionRange(joinAt, joinAt);
                }
            });

            refreshIgnoreLine(row);
            return row;
        }

        function renderIgnoreEditor() {
            const editor = document.getElementById("ignore-editor");
            editor.innerHTML = "";
            const records = restoredIgnoreRecords || document.getElementById("ignore").value.split(/\r?\n/).map(value => ({value, enabled: !isCommentedLine(value)}));
            for (const record of records) editor.appendChild(createIgnoreLine(record.value, record.enabled));
            restoredIgnoreRecords = null;
            syncIgnoreEditor();
        }

        function searchButtonHandler() {
            if (isIdle) calc();
            else stopSearch();
        }

        function sortButtonHandler(e) {
            let trow = e.parentNode.parentNode;
            let table = trow.parentNode;
            console.log(trow);
            if (e.className == "button add-sorting") {
                document.querySelector(".remove-sorting").disabled = false;
                let clone = trow.cloneNode(true);
                clone.id = "sorting-row-"+sortingRowID;

                let trowDrop = trow.children[0].children[0].options;
                let cloneDrop = clone.children[0].children[0].options;
                for (let i=0; i<cloneDrop.length; i++) {
                    cloneDrop[i].selected = trowDrop[i].selected;
                }

                table.insertBefore(clone, trow);
                sortingRowID++;
                sortingRows++;
            } else if (e.className == "button remove-sorting") {
                e.parentNode.parentNode.remove();
                sortingRows--;
                if (sortingRows == 1) {
                    document.querySelector(".remove-sorting").disabled = true;
                }
            } else if (e.className == "button up-sorting") {
                rowIndex = Array.from(table.children).indexOf(trow);
                if (rowIndex > 1) {
                    table.insertBefore(table.children[rowIndex], table.children[rowIndex-1]);
                }
            } else if (e.className == "button down-sorting") {
                rowIndex = Array.from(table.children).indexOf(trow);
                if (rowIndex < Array.from(table.children).length-1) {
                    table.insertBefore(table.children[rowIndex+1], table.children[rowIndex]);
                }
            }
            saveAppState();
        }

        function customParseFloat(x) {
            let pFloat = parseFloat(x);
            if (pFloat !== pFloat) {return Infinity} else {return pFloat}
        }

        function compareBufferElements(x, y) {
            if (customParseFloat(x[0]) > customParseFloat(y[0])) {return 1}
            else if (customParseFloat(x[0]) < customParseFloat(y[0])) {return -1}
            let hasSecondaryMetric = (x[1][x[1].length-1] === "]");
            if (hasSecondaryMetric && (parseFloat(x[1].slice(x[1].lastIndexOf("[")+1),10) > parseFloat(y[1].slice(y[1].lastIndexOf("[")+1),10))) {return 1}
            else if (hasSecondaryMetric && (parseFloat(x[1].slice(x[1].lastIndexOf("[")+1),10) < parseFloat(y[1].slice(y[1].lastIndexOf("[")+1),10))) {return -1}
            if (removeParens(x[1]) > removeParens(y[1])) {return 1}
            else if (removeParens(x[1]) < removeParens(y[1])) {return -1}
            else {return 0}
        }

        function getCombinedBuffer() {
            let combinedBuffer = [];
            for (let i=0; i<solutionsBuffer.length; i++) {
                combinedBuffer.push([speedBuffer[i], solutionsBuffer[i]]);
            }
            combinedBuffer.sort(compareBufferElements);
            return combinedBuffer;
        }

        function moveFilterForSuffix(suffix) {
            if (suffix.startsWith("2")) return "double";
            if (suffix === "'") return "ccw";
            return "cw";
        }

        function formatSolution(solution) {
            let escaped = solution
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;");
            escaped = escaped.replace(/\b([URFDLBMESurfdlb])(2'?|')?(?=$|[\s)\]])/g, (token, move, suffix = "") => {
                const setting = moveColorSettings[move];
                const active = [...document.querySelectorAll(".face-move.active")].some(button => button.dataset.move === move);
                const color = setting?.all || setting?.[moveFilterForSuffix(suffix)];
                if (!active || !MOVE_COLORS.includes(color)) return token;
                return `<span class="colored-move" style="color:${color}">${token}</span>`;
            });
            return escaped
                .replace(/^\(([^)]*)\)/, '<span class="pre-auf">($1)</span>')
                .replace(/(\[[^\]]+\])$/, '<span class="secondary-metric">$1</span>');
        }

        function visualizationAlgorithm(solution) {
            return solution.replace(/\s*\[[^\]]+\]\s*$/, "").trim();
        }

        function escapeAttribute(value) {
            return value
                .replaceAll("&", "&amp;")
                .replaceAll('"', "&quot;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;");
        }

        function openAlgVisualization(algorithm) {
            const queryAlgorithm = algorithm.replaceAll("'", "-").replaceAll(" ", "_");
            const opened = window.open(ALG_VISUALIZATION_URL + queryAlgorithm, "_blank", "noopener");
            if (opened) opened.opener = null;
        }

        function solutionFromEvent(event) {
            const item = event.target.closest(".solution-item");
            if (!item || !document.getElementById("output-grid").contains(item)) return "";
            return item.dataset.algorithm || visualizationAlgorithm(item.textContent);
        }

        function closeSolutionActionMenu() {
            const menu = document.getElementById("solution-action-menu");
            if (menu) menu.hidden = true;
        }

        function openSolutionActionMenu(algorithm, clientX, clientY) {
            if (!algorithm) return;
            solutionMenuAlgorithm = algorithm;
            const menu = document.getElementById("solution-action-menu");
            menu.hidden = false;
            const left = Math.min(clientX, window.innerWidth - menu.offsetWidth - 8);
            const top = Math.min(clientY, window.innerHeight - menu.offsetHeight - 8);
            menu.style.left = `${Math.max(8, left)}px`;
            menu.style.top = `${Math.max(8, top)}px`;
            menu.querySelector("button").focus({preventScroll: true});
        }

        function createSolutionActionMenu() {
            const menu = document.createElement("div");
            menu.id = "solution-action-menu";
            menu.className = "solution-action-menu";
            menu.hidden = true;
            menu.setAttribute("role", "menu");
            menu.innerHTML = `<button type="button" role="menuitem" data-solution-action="copy"><img src="copy-icon.png" alt="">Copy</button>
                <button type="button" role="menuitem" data-solution-action="visualize"><img src="visualize-icon.png" alt="">Visualize</button>`;
            menu.addEventListener("click", event => {
                const action = event.target.closest("[data-solution-action]")?.dataset.solutionAction;
                if (action === "copy") navigator.clipboard.writeText(solutionMenuAlgorithm);
                if (action === "visualize") openAlgVisualization(solutionMenuAlgorithm);
                closeSolutionActionMenu();
            });
            document.body.appendChild(menu);
            document.addEventListener("pointerdown", event => {
                if (!menu.hidden && !menu.contains(event.target)) closeSolutionActionMenu();
            });
            document.addEventListener("keydown", event => {
                if (event.key === "Escape") closeSolutionActionMenu();
            });
        }

        function addSolutionMenuInteractions() {
            const output = document.getElementById("output-grid");
            let longPressTimer = null;
            let longPressTarget = null;
            let startX = 0;
            let startY = 0;
            const cancelLongPress = () => {
                clearTimeout(longPressTimer);
                longPressTimer = null;
                longPressTarget = null;
            };
            output.addEventListener("contextmenu", event => {
                const algorithm = solutionFromEvent(event);
                if (!algorithm) return;
                event.preventDefault();
                openSolutionActionMenu(algorithm, event.clientX, event.clientY);
            });
            output.addEventListener("pointerdown", event => {
                if (event.pointerType !== "touch") return;
                const algorithm = solutionFromEvent(event);
                if (!algorithm) return;
                longPressTarget = algorithm;
                startX = event.clientX;
                startY = event.clientY;
                longPressTimer = setTimeout(() => {
                    openSolutionActionMenu(longPressTarget, startX, startY);
                    longPressTimer = null;
                }, 500);
            });
            output.addEventListener("pointermove", event => {
                if (!longPressTimer) return;
                if (Math.hypot(event.clientX - startX, event.clientY - startY) > 10) cancelLongPress();
            });
            output.addEventListener("pointerup", cancelLongPress);
            output.addEventListener("pointercancel", cancelLongPress);
        }

        createSolutionActionMenu();
        addSolutionMenuInteractions();

        function refreshSolutionColors() {
            document.querySelectorAll(".solution-item").forEach(item => {
                item.innerHTML = formatSolution(item.textContent);
            });
        }

        function mergeBuffer() {
            let sortedBuffer = getCombinedBuffer();
            let updatedEntries = [];
            let tableNeedle = 0;
            let bufferNeedle = 0;
            let tableSpeedList = [];
            let tableSolutionList = [];
            document.getElementById("solutions"+solveID).querySelectorAll(".solution-group-row").forEach(group => {
                group.querySelectorAll(".solution-item").forEach(item => {
                    tableSpeedList.push(group.dataset.speed);
                    tableSolutionList.push(item.textContent);
                });
            });
            let maxSolutions = parseInt(document.getElementById("maxSolutions").value, 10);
            let availSolutions = tableSpeedList.length+sortedBuffer.length;
            let solutionsAdded = 0;
            let prevSolution = "";

            function addFromBuffer() {
                let speed = sortedBuffer[bufferNeedle][0];
                let solution = sortedBuffer[bufferNeedle][1];
                if (prevSolution != removeParens(solution)) {
                    updatedEntries.push({speed, solution});
                    prevSolution = removeParens(solution);
                    solutionsAdded++;
                } else {
                    availSolutions--;
                }
                bufferNeedle++;
            }

            function addFromTable() {
                let speed = tableSpeedList[tableNeedle];
                let solution = tableSolutionList[tableNeedle];
                if (prevSolution != removeParens(solution)) {
                    updatedEntries.push({speed, solution});
                    prevSolution = removeParens(solution);
                    solutionsAdded++;
                } else {
                    availSolutions--;
                }
                tableNeedle++;
            }

            while (Math.min(maxSolutions, availSolutions) - solutionsAdded > 0) {
                if (tableNeedle === tableSpeedList.length) {
                    addFromBuffer();
                } else if (bufferNeedle === sortedBuffer.length) {
                    addFromTable();
                } else {
                    if (compareBufferElements(sortedBuffer[bufferNeedle], [tableSpeedList[tableNeedle], tableSolutionList[tableNeedle]]) == -1) {addFromBuffer()} else {addFromTable()}
                }
            }

            let groupedHTML = "";
            for (let index = 0; index < updatedEntries.length;) {
                const speed = String(updatedEntries[index].speed);
                let solutionsHTML = "";
                while (index < updatedEntries.length && String(updatedEntries[index].speed) === speed) {
                    const algorithm = visualizationAlgorithm(updatedEntries[index].solution);
                    solutionsHTML += `<span class="solution-item" data-algorithm="${escapeAttribute(algorithm)}">${formatSolution(updatedEntries[index].solution)}</span>`;
                    index++;
                }
                groupedHTML += `<div class="solution-group-row" data-speed="${speed}">
                    <span class="metric-badge">${speed}</span>
                    <div class="algorithm-group">${solutionsHTML}</div>
                </div>`;
            }
            document.getElementById("solutions"+solveID).innerHTML = `<div class="solution-groups">${groupedHTML}</div>`;
            speedBuffer = [];
            solutionsBuffer = [];
        }

        function addBufferToTable() { // add buffer to table and update statistics
            if (solutionsBuffer.length === 0) {return}
            document.getElementById("clear-button").hidden = false;
            document.getElementById("select-button").hidden = false;
            mergeBuffer();
        }

        function initNextState() {
            solveID++;
            numSolutions = 0;
            createSolutionTable();
        }

        function getFirstLine(fieldStr) {
            let firstNew = fieldStr.indexOf("\n");
            return fieldStr.slice(0,firstNew);
        }

        function removeParens(alg) {
            let accum = "";
            let insideParen = false;
            for (let char of alg) {
                if (char === ")" || char === "]") {
                    insideParen = false;
                } else if (char === "(" || char === "[") {
                    insideParen = true;
                } else if (insideParen == false) {
                    accum += char;
                }
            } 
            return accum.trim();
        }

        function getMCC(alg) {
            return parseFloat(algSpeed(removeParens(alg), false, false, parseFloat(document.getElementById("p1").innerHTML),parseFloat(document.getElementById("p2").innerHTML),parseFloat(document.getElementById("p3").innerHTML),parseFloat(document.getElementById("p4").innerHTML),parseFloat(document.getElementById("p5").innerHTML),parseFloat(document.getElementById("p6").innerHTML),parseFloat(document.getElementById("p7").innerHTML),parseFloat(document.getElementById("p8").innerHTML),parseFloat(document.getElementById("p9").innerHTML),parseFloat(document.getElementById("p10").innerHTML)), 10);
        }

        function getSTM(move) {
            return 1;
        }

        function lastAlpha(move) {
            let needle = move.length-1;
            while (needle >= 0) {
                if (/[a-zA-Z]/.test(move[needle])) {
                    return needle;
                }
                needle--;
            }
            return -1;
        }

        function getSQTM(move) {
            let moveAmount = move.slice(lastAlpha(move)+1).replace("'","");
            if (moveAmount == "") {return 1} else {return parseInt(moveAmount, 10)}
        }

        function getESQ(move) {
            let moveType = move.slice(0, lastAlpha(move)+1)+"_";
            let moveAmount = "_"+move.slice(lastAlpha(move)+1);
            if (moveWeights.has(move)) {return moveWeights.get(move)}
            else if (moveWeights.has(moveType)) {return moveWeights.get(moveType)}
            else if (moveWeights.has(moveAmount)) {return moveWeights.get(moveAmount)}
            else if (moveWeights.has("__")) {return moveWeights.get("__")}
            return 1;
        }

        function getMoveCount(alg, metric) {
            let splitAlg = alg.split(" ");
            let count = 0;
            let insideParen = false;
            for (let move of splitAlg) {
                if (move == "") {
                    continue;
                } else if (move.includes(")") || move.includes("]")) { // modified
                    insideParen = false;
                } else if (move.includes("(") || move.includes("[")) { // modified
                    insideParen = true;
                } else if (insideParen == false) {
                    count += metric(move);
                }
            }
            return Math.round(count*1e3)/1e3;
        }

        function updateStats() {
            let topSolution = document.getElementById("solutions"+solveID).querySelector(".solution-item")?.textContent || "";
            if (topSolution == "") {
                failed.push(caseNum);
            }
            let numCases = parseInt(document.getElementById("info-this-case").innerHTML, 10) + 1;
            let numSucceeded = numCases - failed.length;

            document.getElementById("info-this-case").innerHTML = numCases;
            document.getElementById("info-fails").innerHTML = (failed.length == 0) ? "" : " ("+failed.length+" failed)";
            document.getElementById("info-time").innerHTML = ((Date.now()-startTime)/numCases/1000).toFixed(2)+" sec/case";
            totalSTM += getMoveCount(topSolution, getSTM);
            document.getElementById("info-stm").innerHTML = (totalSTM/numSucceeded).toFixed(2);
            totalSQTM += getMoveCount(topSolution, getSQTM);
            document.getElementById("info-sqtm").innerHTML = (totalSQTM/numSucceeded).toFixed(2);
            totalESQ += getMoveCount(topSolution, getESQ);
            document.getElementById("info-esq").innerHTML = (totalESQ/numSucceeded).toFixed(2);
        }

        function calc() {
            work = new Worker("BatchSolver/worker.js");
            isIdle = false;
            startTime = Date.now();
            failed = [];
            totalSTM = totalSQTM = totalESQ = 0;
            colMask = getMaskString();

            document.getElementById("info-this-case").innerHTML = 0;
            document.getElementById("info-num-cases").innerHTML = 0;
            document.getElementById("info-time").innerHTML = "0.00 sec/case";
            document.getElementById("info-stm").innerHTML = "0.00";
            document.getElementById("info-sqtm").innerHTML = "0.00";
            document.getElementById("info-esq").innerHTML = "0.00";
            document.getElementById("info-fails").innerHTML = "";

            document.getElementById("calc-button").textContent = "■";
            document.getElementById("calc-button").classList.add("is-stopping");
            document.getElementById("calc-button").title = "Stop search";
            document.getElementById("calc-button").setAttribute("aria-label", "Stop search");
            document.getElementById("clear-button").disabled = true;
            document.getElementById("clear-button").hidden = false;
            sortCriteria = document.getElementById("sortBy").value;
            secondaryMetric = document.getElementById("secondary-metric").value;

            initNextState();
            addBufferInterval = setInterval(addBufferToTable, 250);
            work.postMessage(getWorkerData());

            work.onmessage = function(event) {
                if (event.data.type === "stop") {
                    stopSearch();
                    let msg = event.data.value;
                    if (msg !== null) {alert(msg)} else {updateStats()}
                } else if (event.data.type === "depthUpdate") {
                    depth++;
                } else if (event.data.type === "solution") {
                    let solution = event.data.value;
                    let speed = 0;
                    if (sortCriteria == "STM") {
                        speed = getMoveCount(solution, getSTM);
                    } else if (sortCriteria == "SQTM") {
                        speed = getMoveCount(solution, getSQTM);
                    } else if (sortCriteria == "ESQ") {
                        speed = getMoveCount(solution, getESQ);
                    }
                    if (secondaryMetric == "STM") {
                        solution += " [" + getMoveCount(solution, getSTM) + " STM]";
                    } else if (secondaryMetric == "SQTM") {
                        solution += " [" + getMoveCount(solution, getSQTM) + " SQTM]";
                    } else if (secondaryMetric == "ESQ") {
                        solution += " [" + getMoveCount(solution, getESQ) + " ESQ]";
                    }
                    speedBuffer.push(speed);
                    solutionsBuffer.push(solution);
                    numSolutions++;
                } else if (event.data.type === "set-depth") {
                    depth = event.data.value;
                } else if (event.data.type === "next-state") {
                    if (event.data.value.index > 1) {
                        addBufferToTable();
                        updateStats();
                        initNextState();
                    }
                    caseNum = event.data.value.num;
                    document.getElementById("caseNumber"+solveID).textContent = "#"+caseNum;
                    if (document.getElementById("imageVis").checked) {
                        let cube = cubeImage(colMask, event.data.value.setup);
                        cube("#caseHeader"+solveID);
                        makeImageCopyable(solveID)
                    } else {
                        document.getElementById("caseHeader"+solveID).innerHTML = "";
                    }
                } else if (event.data.type === "num-states") {
                    document.getElementById("info-num-cases").innerHTML = event.data.value;
                } else if (event.data.type === "moveWeights") {
                    moveWeights = event.data.value;
                } else if (event.data.type === "debug") {
                    debugVars.push(event.data.value);
                }
            }
        }

        function stopSearch() {
            addBufferToTable();
            clearInterval(addBufferInterval);
            work.terminate();
            isIdle = true;
            document.getElementById("calc-button").textContent = "▶";
            document.getElementById("calc-button").classList.remove("is-stopping");
            document.getElementById("calc-button").title = "Start search";
            document.getElementById("calc-button").setAttribute("aria-label", "Start search");
            document.getElementById("clear-button").disabled = false;
            depth = 0;
        }

        function selectElement(el) { // currently vestigial
            range = document.createRange();
            sel = window.getSelection();
            sel.removeAllRanges();
            try {
                range.selectNodeContents(el);
                sel.addRange(range);
            } catch (e) {
                range.selectNode(el);
                sel.addRange(range);
            }
        }

        function displayTextWidth(text, font) {
            let canvas = displayTextWidth.canvas || (displayTextWidth.canvas = document.createElement("canvas"));
            let context = canvas.getContext("2d");
            context.font = font;
            let metrics = context.measureText(text);
            return metrics.width * 0.17 + 3;
        }

        function exportTable() {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Batch Solver Algs');

            worksheet.addRow([]);
            worksheet.getRow(1).height = 18;

            const cards = [...document.querySelectorAll(".case-card")];
            let column = 0;
            for (let elem of cards) {
                worksheet.mergeCells(1, column+1, 1, column+2);
                let img = elem.querySelector(".case-media img");
                if (img) {
                    worksheet.addImage(workbook.addImage({base64: img.src, extension: 'png'}), {
                        tl: { col: column, row: 0 },
                        ext: { width: img.naturalWidth, height: img.naturalHeight }
                    });
                    if (img.naturalHeight > worksheet.getRow(1).height) worksheet.getRow(1).height = img.naturalHeight;
                }
                column += 2
            }

            let headerRow = [];
            for (let elem of cards) headerRow.push(sortCriteria, "Solutions");
            worksheet.addRow(headerRow);

            let col = 1;
            for (let card of cards) {
                let row = 3;
                for (let group of card.querySelectorAll(".solution-group-row")) {
                    let firstInGroup = true;
                    for (let solution of group.querySelectorAll(".solution-item")) {
                        worksheet.getCell(row, col).value = firstInGroup ? group.dataset.speed : "";
                        worksheet.getCell(row, col + 1).value = solution.innerText;
                        firstInGroup = false;
                        let metricWidth = displayTextWidth(group.dataset.speed, "Calibri");
                        let solutionWidth = displayTextWidth(solution.innerText, "Calibri");
                        if (worksheet.getColumn(col).width == undefined || worksheet.getColumn(col).width < metricWidth) worksheet.getColumn(col).width = metricWidth;
                        if (worksheet.getColumn(col + 1).width == undefined || worksheet.getColumn(col + 1).width < solutionWidth) worksheet.getColumn(col + 1).width = solutionWidth;
                        row++;
                    }
                }
                col += 2;
            }

            workbook.xlsx.writeBuffer().then((data) => {
            const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8' });
            saveAs(blob, 'algs.xlsx');
            });
        }

        function clearOutput() {
            document.getElementById("output-grid").innerHTML = "";
            document.getElementById("clear-button").hidden = true;
            document.getElementById("select-button").hidden = true;
            solveID = 0;
        }

        function copyFails() {
            navigator.clipboard.writeText("#" + failed.join(", "));
            document.getElementById("myTooltip").innerHTML = "Copied";
        }

        function outFails() {
            document.getElementById("myTooltip").innerHTML = "Copy to clipboard";
        }

        document.getElementById("info-fails").addEventListener("click", copyFails, false);
        document.getElementById("info-fails").addEventListener("mouseout", outFails, false);
        document.getElementById("info-fails").addEventListener("touchend", copyFails, false);
