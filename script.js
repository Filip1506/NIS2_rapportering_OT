// NIS2-rapportering - forbedret file preview med burger-menu der bevares efter klik

let currentFase = "fase1";
let submitted = { fase1: false, fase2: false, status: false, fase3: false, samlet: false };
let uploadedFiles = { fase1: [], fase2: [], fase3: [], samlet: [] };

// Og bind fil‐inputtet:
handleFileInput("samlet", document.getElementById("samlet-attachment"));

// Bruges til at huske hvilken menu der skal forblive åben efter DOM opdatering
let openMenu = null;

// Initialiser Flatpickr
flatpickr(".datetimepicker", {
    enableTime: true,
    time_24hr: true,
    dateFormat: "Y-m-d H:i",
    locale: "da",
    onChange: function (selectedDates, dateStr, instance) {
        if (instance.element.id === "discovery_time") {
            calculateDeadlines(dateStr);
            updateDeadlineCountdown(dateStr);
        }
    }
});

// Knyt inputfelter til preview
handleFileInput("fase1", document.getElementById("attachment1"));
handleFileInput("fase2", document.getElementById("attachment2"));
handleFileInput("fase3", document.getElementById("attachment3"));

function startReporting() {
    document.getElementById("startScreen").style.display = "none";
    document.getElementById("startModal").style.display = "flex";
}

function handleFileInput(faseId, inputElement) {
    inputElement.addEventListener("change", function (e) {
        uploadedFiles[faseId] = uploadedFiles[faseId].concat(Array.from(e.target.files));
        e.target.value = "";
        updateFileListPreview(faseId);
    });
}

function updateFileListPreview(faseId) {
    const container = document.getElementById(`fileList-${faseId}`);
    const files = uploadedFiles[faseId];
    if (!container || !files) return;

    if (files.length === 0) {
        container.innerHTML = "<p>Ingen filer valgt.</p>";
        return;
    }

    let html = "<ul>";
    files.forEach((file, index) => {
        html += `
            <li class="file-item">
                ${file.name}
                <div class="file-actions">
                    <button class="menu-toggle" onclick="toggleMenu('${faseId}', ${index}, event)">⋮</button>
                    <div class="menu" id="menu-${faseId}-${index}">
                        <button onclick="removeFile('${faseId}', ${index})">🗑 Fjern</button>
                    </div>
                </div>
            </li>`;
    });
    html += "</ul>";
    container.innerHTML = html;

    // Vis menu igen efter DOM re-render
    if (openMenu) {
        const menu = document.getElementById(`menu-${openMenu.faseId}-${openMenu.index}`);
        if (menu) {
            setTimeout(() => {
                menu.classList.add("show");
            }, 10);
        }
        openMenu = null;
    }
}

function toggleMenu(faseId, index, event) {
    event.stopPropagation();
    const menu = document.getElementById(`menu-${faseId}-${index}`);
    const isShown = menu.classList.contains("show");

    document.querySelectorAll(".menu").forEach(m => m.classList.remove("show"));

    if (!isShown) {
        openMenu = { faseId, index };
        updateFileListPreview(faseId);
    } else {
        openMenu = null;
    }
}

document.addEventListener("click", function () {
    document.querySelectorAll(".menu").forEach(m => m.classList.remove("show"));
});

function removeFile(faseId, index) {
    uploadedFiles[faseId].splice(index, 1);
    updateFileListPreview(faseId);
}

function goToFase(faseId) {
    const faser = ["fase1", "fase2", "fase3"];
    faser.forEach(id => {
        document.getElementById(id).style.display = (id === faseId) ? "block" : "none";
    });
    currentFase = faseId;

    if (faseId === "fase3") {
        // i stedet for at vise felterne direkte, åbn modal
        document.getElementById("phase3Modal").style.display = "flex";
    } else {
        // de øvrige faser som før …
        if (faseId === "fase2" || faseId === "fase3") {
            const navn = document.getElementById("responsible").value;
            if (navn) {
                document.getElementById("responsibleDisplay").style.display = "block";
                document.getElementById("responsibleNameDisplay").innerText = navn;
            }
        }
    }
}

function calculateDeadlines(discoveryStr) {
    const discovery = new Date(discoveryStr);
    if (isNaN(discovery)) return;
    const deadline72 = new Date(discovery.getTime() + 72 * 60 * 60 * 1000);
    const deadline30 = new Date(discovery.getTime() + 30 * 24 * 60 * 60 * 1000);

    const format = d => d.toLocaleString("da-DK", { dateStyle: "short", timeStyle: "short" });
    document.getElementById("showDeadline72").innerText = `(Indsendes senest ${format(deadline72)})`;
    document.getElementById("showDeadlineFinal").innerText = `(Indsendes senest ${format(deadline30)})`;
}

function updateDeadlineCountdown(discoveryStr) {
    const deadline = new Date(new Date(discoveryStr).getTime() + 72 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline - now;
    if (diffMs <= 0) {
        document.getElementById("deadlineInfo").innerText = "Deadline for fase 2 er overskredet.";
        return;
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const output = `Der er ${diffDays} dage og ${diffHours} timer til deadline for fase 2.`;
    document.getElementById("deadlineInfo").innerText = output;
}

function confirmSubmission(faseId) {
    currentFase = faseId;
    const form = document.getElementById("reportForm");
    const inputs = form.querySelectorAll(
        `#${faseId} input, #${faseId} select, #${faseId} textarea`
    );
    const container = document.getElementById("confirmationSummary");
    let summary = "<ul>";

    if (faseId === "fase2") {
        // 1) Hent start/slut
        const start = document.getElementById("fase2-start").value;
        const slut = document.getElementById("fase2-slut").value;
        // 2) Beregn varighed
        const varighed = calculateDuration(start, slut);

        // 3) Tilføj start/slut/varighed øverst
        summary += `
            <li><strong>Starttidspunkt:</strong> ${start || "-"}</li>
            <li><strong>Sluttidspunkt:</strong> ${slut || "-"}</li>
            <li><strong>Varighed:</strong> ${varighed}</li>
        `;

        // 4) Resterende felter (minus start/slut)
        inputs.forEach(input => {
            if (
                input.id !== "fase2-start" &&
                input.id !== "fase2-slut" &&
                input.type !== "file"
            ) {
                const label = input.previousElementSibling
                    ? input.previousElementSibling.innerText
                    : input.name;
                const value = input.value || "-";
                summary += `<li><strong>${label}</strong>: ${value}</li>`;
            }
        });

    } else {
        // Standard for fase1 & fase3
        inputs.forEach(input => {
            if (input.type !== "file") {
                const label = input.previousElementSibling
                    ? input.previousElementSibling.innerText
                    : input.name;
                const value = input.value || "-";
                summary += `<li><strong>${label}</strong>: ${value}</li>`;
            }
        });
    }

    // Vedhæftede filer
    const files = uploadedFiles[faseId];
    if (files && files.length) {
        summary += `<li><strong>Vedhæftede filer:</strong><div class='file-link-list'>`;
        files.forEach(file => {
            const url = URL.createObjectURL(file);
            summary += `<a href="${url}" target="_blank">${file.name}</a><br>`;
        });
        summary += `</div></li>`;
    }

    summary += "</ul>";
    container.innerHTML = summary;
    document.getElementById("confirmationModal").style.display = "flex";
}

function submitFase() {
    document.getElementById("confirmationModal").style.display = "none";
    lockInputs(currentFase);

    if (currentFase === "status") {
        // Marker status-dot
        const dotStatus = document.getElementById("dot-status");
        dotStatus.classList.add("complete");
        dotStatus.innerText = "✔";
    } else {
        // Marker fase-dot
        markFaseAsComplete(currentFase);
    }

    // Fortsæt til næste skærm
    if (currentFase === "fase1") goToFase("fase2");
    else if (currentFase === "fase2" || currentFase === "status") goToFase("fase3");
}

function lockInputs(faseId) {
    const form = document.getElementById("reportForm");
    const elements = form.querySelectorAll(`#${faseId} input, #${faseId} select, #${faseId} textarea`);
    elements.forEach(el => {
        if (el.tagName.toLowerCase() === "select") el.disabled = true;
        else if (el.type !== "file") el.readOnly = true;
    });
    submitted[faseId] = true;
}

function markFaseAsComplete(faseId) {
    // 1) find selve dot-elementet
    let dot;
    if (faseId === "status") {
        dot = document.getElementById("dot-status");
    } else {
        const stepNum = faseId.replace("fase", "");
        dot = document.getElementById(`dot${stepNum}`);
    }
    if (!dot) return;

    // 2) find den omkringliggende .timeline-step
    const step = dot.closest(".timeline-step");
    if (!step) return;

    // 3) sæt complete på .timeline-step
    step.classList.add("complete");

    // 4) sæt kun check-ikonet på selve dot’en
    dot.innerText = "✔";
}

function closeModal() {
    document.getElementById("confirmationModal").style.display = "none";
}

function closeSummaryModal() {
    document.getElementById("summaryModal").style.display = "none";
}

/**
 * Viser kvitterings‐modal med indsendte data for fase1, fase2, status, fase3 og samlet
 * @param {string} faseId - enten "fase1", "fase2", "status", "fase3" eller "samlet"
 */
function showSummaryIfSubmitted(faseId) {
    // Hvis formularen ikke er indsendt, gør ingenting
    if (!submitted[faseId]) return;

    const container = document.getElementById("summaryContent");
    let title = "";
    let summary = "";

    if (faseId === "samlet") {
        title = "Kvittering for Samlet rapport";
        // Saml alle de felter du har i din samlet‐formular
        const fields = [
            ["Rapporteringsansvarlig", document.getElementById("samlet-responsible").value],
            ["Tidspunkt for opdagelse", document.getElementById("samlet-discovery_time").value],
            ["Beskrivelse af hændelsen", document.getElementById("samlet-description").value],
            ["Mulig forsætlighed", document.getElementById("samlet-intent").value],
            ["Risiko for spredning", document.getElementById("samlet-spread").value],
            ["Start tidspunkt", document.getElementById("samlet-start").value],
            ["Slut tidspunkt", document.getElementById("samlet-slut").value],
            ["Systemer/tjenester", document.getElementById("samlet-systems").value],
            ["Teknisk årsag", document.getElementById("samlet-technical").value],
            ["Afhjælpende tiltag", document.getElementById("samlet-mitigations").value],
            ["Afsluttende vurdering", document.getElementById("samlet-final_evaluation").value],
            ["Varige konsekvenser", document.getElementById("samlet-consequences").value],
            ["Opfølgning", document.getElementById("samlet-followup").value]
        ];

        summary = "<ul>";
        fields.forEach(([label, val]) => {
            summary += `<li><strong>${label}:</strong> ${val || "-"}</li>`;
        });

        // Vedhæftede filer til samlet
        const files = uploadedFiles["samlet"] || [];
        if (files.length) {
            summary += `<li><strong>Vedhæftede filer:</strong><div class="file-link-list">`;
            files.forEach(f => {
                const url = URL.createObjectURL(f);
                summary += `<a href="${url}" target="_blank">${f.name}</a><br>`;
            });
            summary += "</div></li>";
        }
        summary += "</ul>";

    } else if (faseId === "status") {
        title = "Kvittering for Statusrapport";
        // Netop de felter, du har i status‐formularen
        const reportTime = document.getElementById("status-report-time").value || "-";
        const impact = document.getElementById("status-impact").value || "-";
        const systems = document.getElementById("status-systems").value || "-";
        const mitigations = document.getElementById("status-mitigations").value || "-";
        const nextUpdate = document.getElementById("status-next-update").value || "-";

        summary = `
        <ul>
          <li><strong>Rapportdato og -tidspunkt:</strong> ${reportTime}</li>
          <li><strong>Aktuelt omfang:</strong> ${impact}</li>
          <li><strong>Systemer/tjenesters status:</strong> ${systems}</li>
          <li><strong>Foreløbige afhjælpende tiltag:</strong> ${mitigations}</li>
          <li><strong>Forventet næste opdatering:</strong> ${nextUpdate}</li>
        </ul>
      `;
        // filer til status (hvis du tracker dem):
        const statusFiles = uploadedFiles["status"] || [];
        if (statusFiles.length) {
            summary = summary.replace(
                "</ul>",
                `<li><strong>Vedhæftede filer:</strong><div class="file-link-list">` +
                statusFiles.map(f => {
                    const url = URL.createObjectURL(f);
                    return `<a href="${url}" target="_blank">${f.name}</a><br>`;
                }).join("") +
                `</div></li></ul>`
            );
        }

    } else {
        // Fase 1, 2 eller 3
        const faseNum = faseId.replace("fase", "");
        title = `Kvittering for Fase ${faseNum}`;
        const inputs = document.querySelectorAll(
            `#${faseId} input, #${faseId} select, #${faseId} textarea`
        );
        summary = "<ul>";
        inputs.forEach(input => {
            if (input.type !== "file") {
                const label = input.previousElementSibling
                    ? input.previousElementSibling.innerText
                    : input.name;
                summary += `<li><strong>${label}:</strong> ${input.value || "-"}</li>`;
            }
        });
        // filer til den fase
        const phaseFiles = uploadedFiles[faseId] || [];
        if (phaseFiles.length) {
            summary += `<li><strong>Vedhæftede filer:</strong><div class="file-link-list">`;
            phaseFiles.forEach(f => {
                const url = URL.createObjectURL(f);
                summary += `<a href="${url}" target="_blank">${f.name}</a><br>`;
            });
            summary += "</div></li>";
        }
        summary += "</ul>";
    }

    // Sæt titel og indhold, og vis modal’en
    document.querySelector("#summaryModal .modal-content h3").innerText = title;
    container.innerHTML = summary;
    document.getElementById("summaryModal").style.display = "flex";
}

let selectedReportType = null;

function selectReportType(type) {
    selectedReportType = type;

    // Visuel markering
    document.getElementById("choice-samlet").classList.remove("selected");
    document.getElementById("choice-fase").classList.remove("selected");
    document.getElementById(`choice-${type}`).classList.add("selected");

    // Aktivér knap
    document.getElementById("startConfirmBtn").disabled = false;
}

function calculateDuration(startStr, endStr) {
    if (!startStr || !endStr) return "Ufuldstændig tidsangivelse";

    const start = new Date(startStr);
    const end = new Date(endStr);

    if (isNaN(start) || isNaN(end)) return "Ugyldig datoformat";

    const diffMs = end - start;
    if (diffMs < 0) return "Sluttidspunkt før start";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours} timer og ${diffMinutes} minutter`;
}

const start = document.getElementById("fase2-start").value;
const slut = document.getElementById("fase2-slut").value;
const varighed = calculateDuration(start, slut);

confirmationSummary.innerHTML = `
  <ul>
    <li><strong>Starttidspunkt:</strong> ${start || "-"}</li>
    <li><strong>Sluttidspunkt:</strong> ${slut || "-"}</li>
    <li><strong>Varighed:</strong> ${varighed}</li>
    ...
  </ul>
`;

function confirmStartChoice() {
    const valgt = document.querySelector('input[name="reportType"]:checked').value;
    document.getElementById("startModal").style.display = "none";

    if (valgt === "samlet") {
        currentFase = "samlet";                   // 💥 sæt currentFase her
        document.getElementById("samletRapportForm").style.display = "block";
    } else {
        currentFase = "fase1";                    // 💥 eller her
        document.getElementById("reportForm").style.display = "block";
        goToFase("fase1");
    }
}

function calculateDuration(startStr, endStr) {
    if (!startStr || !endStr) return "Ufuldstændig tidsangivelse";
    const start = new Date(startStr), end = new Date(endStr);
    if (isNaN(start) || isNaN(end)) return "Ugyldig datoformat";
    const diffMs = end - start;
    if (diffMs < 0) return "Sluttidspunkt før start";
    const h = Math.floor(diffMs / (1000 * 60 * 60));
    const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${h} timer og ${m} minutter`;
}

function submitStatusReport() {
    // 1) Skjul status‐formular
    document.getElementById("statusReportForm").style.display = "none";

    // 2) Marker status som sendt
    submitted.status = true;

    // 3) find dot + parent
    const dot = document.getElementById("dot-status");
    const step = dot.closest(".timeline-step");

    // 4) sæt complete på parent, ikke dot
    step.classList.add("complete");
    //    (du behøver ikke dot.style.* — CSS klarer det)
    dot.innerText = "✔";

    // 5) gå videre
    goToFase("fase3");
    closeModal();
}

let phase3Type = null;

function selectPhase3Option(type) {
    phase3Type = type;
    // Visuel markering
    document.getElementById("choice-endelig").classList.remove("selected");
    document.getElementById("choice-status").classList.remove("selected");
    document.getElementById(`choice-${type}`).classList.add("selected");
    // Aktivér knappen
    document.getElementById("phase3ConfirmBtn").disabled = false;
}

function confirmPhase3Choice() {
    // 1) Skjul modal
    document.getElementById("phase3Modal").style.display = "none";

    if (phase3Type === "endelig") {
        // Vis endelig-feltet og gem status-feltet
        document.getElementById("statusReportForm").style.display = "none";
        document.getElementById("fase3").style.display = "block";
    } else {
        // Vis status-formularen og gem endelig-feltet
        document.getElementById("fase3").style.display = "none";
        document.getElementById("statusReportForm").style.display = "block";
    }
}

// 3) Bygger summary for samlet‐formularen og viser modal
function confirmSamletReport() {
    const fields = [
        ["Rapporteringsansvarlig", document.getElementById("samlet-responsible").value],
        ["Tidspunkt for opdagelse", document.getElementById("samlet-discovery_time").value],
        ["Beskrivelse af hændelsen", document.getElementById("samlet-description").value],
        ["Mulig forsætlighed", document.getElementById("samlet-intent").value],
        ["Risiko for spredning", document.getElementById("samlet-spread").value],
        ["Start tidspunkt", document.getElementById("samlet-start").value],
        ["Slut tidspunkt", document.getElementById("samlet-slut").value],
        ["Systemer/tjenester", document.getElementById("samlet-systems").value],
        ["Teknisk årsag", document.getElementById("samlet-technical").value],
        ["Afhjælpende tiltag", document.getElementById("samlet-mitigations").value],
        ["Afsluttende vurdering", document.getElementById("samlet-final_evaluation").value],
        ["Varige konsekvenser", document.getElementById("samlet-consequences").value],
        ["Opfølgning", document.getElementById("samlet-followup").value]
    ];

    let html = "<ul>";
    fields.forEach(([label, val]) => {
        html += `<li><strong>${label}:</strong> ${val || "-"}</li>`;
    });

    // Vedhæftede filer
    const files = uploadedFiles["samlet"];
    if (files.length) {
        html += `<li><strong>Vedhæftede filer:</strong><div class="file-link-list">`;
        files.forEach(f => {
            const url = URL.createObjectURL(f);
            html += `<a href="${url}" target="_blank">${f.name}</a><br>`;
        });
        html += `</div></li>`;
    }

    html += "</ul>";

    // Vis i din eksisterende confirmationModal
    document.getElementById("confirmationSummary").innerHTML = html;
    document.getElementById("confirmationModal").style.display = "flex";

    // Skru knappen om til at kalde submitSamletReport
    const btn = document.querySelector("#confirmationModal .modal-content button");
    btn.textContent = "Bekræft og indsend";
    btn.onclick = submitSamletReport;
}

function submitSamletReport() {
    // Luk confirmation-modal
    closeModal();

    // Lås alle felter i samlet‐formularen
    const elems = document.querySelectorAll(
        "#samletRapportForm input, #samletRapportForm select, #samletRapportForm textarea"
    );
    elems.forEach(el => {
        if (el.tagName.toLowerCase() === "select") el.disabled = true;
        else if (el.type !== "file") el.readOnly = true;
    });

    // Marker som indsendt
    submitted.samlet = true;

    // Vis knap der kan åbne kvitteringen senere
    document.getElementById("viewSamletSummaryBtn").style.display = "inline-block";
}

// Startside
goToFase("fase1");