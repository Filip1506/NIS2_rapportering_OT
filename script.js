let currentFase = "fase1";
let submitted = {};

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

function goToFase(faseId) {
    const faser = ["fase1", "fase2", "fase3"];
    faser.forEach(id => {
        document.getElementById(id).style.display = (id === faseId) ? "block" : "none";
    });
    currentFase = faseId;

    if (faseId === "fase2" || faseId === "fase3") {
        const navn = document.getElementById("responsible").value;
        if (navn) {
            document.getElementById("responsibleDisplay").style.display = "block";
            document.getElementById("responsibleNameDisplay").innerText = navn;
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
    const inputs = form.querySelectorAll(`#${faseId} input, #${faseId} select, #${faseId} textarea`);
    const container = document.getElementById("confirmationSummary");

    let summary = "<ul>";
    inputs.forEach(input => {
        const label = input.previousElementSibling ? input.previousElementSibling.innerText : input.name;
        const value = input.value || "-";
        summary += `<li><strong>${label}</strong>: ${value}</li>`;
    });
    summary += "</ul>";

    container.innerHTML = summary;
    document.getElementById("confirmationModal").style.display = "flex";
}

function submitFase() {
    document.getElementById("confirmationModal").style.display = "none";
    lockInputs(currentFase);
    markFaseAsComplete(currentFase);

    if (currentFase === "fase1") goToFase("fase2");
    else if (currentFase === "fase2") goToFase("fase3");
}

function lockInputs(faseId) {
    const form = document.getElementById("reportForm");
    const elements = form.querySelectorAll(`#${faseId} input, #${faseId} select, #${faseId} textarea`);
    elements.forEach(el => {
        if (el.tagName.toLowerCase() === "select") el.disabled = true;
        else el.readOnly = true;
    });
    submitted[faseId] = true;
}

function markFaseAsComplete(faseId) {
    const stepNum = faseId.replace("fase", "");
    const dot = document.getElementById(`dot${stepNum}`);
    if (dot) {
        dot.classList.add("complete");
        dot.innerText = "✔";
        dot.style.backgroundColor = "#4CAF50";
        dot.style.color = "#fff";
        dot.style.textAlign = "center";
        dot.style.lineHeight = "22px";
        dot.style.fontWeight = "bold";
        dot.style.fontSize = "14px";
    }
}

function closeModal() {
    document.getElementById("confirmationModal").style.display = "none";
}

function closeSummaryModal() {
    document.getElementById("summaryModal").style.display = "none";
}

function showSummaryIfSubmitted(faseId) {
    if (!submitted[faseId]) return;
    const form = document.getElementById("reportForm");
    const inputs = form.querySelectorAll(`#${faseId} input, #${faseId} select, #${faseId} textarea`);
    const container = document.getElementById("summaryContent");

    let summary = `<h4>Indsendt information for ${faseId.replace("fase", "Fase ")}</h4><ul>`;
    inputs.forEach(input => {
        const label = input.previousElementSibling ? input.previousElementSibling.innerText : input.name;
        const value = input.value || "-";
        summary += `<li><strong>${label}</strong>: ${value}</li>`;
    });
    summary += "</ul>";

    container.innerHTML = summary;
    document.getElementById("summaryModal").style.display = "flex";
}

goToFase("fase1");