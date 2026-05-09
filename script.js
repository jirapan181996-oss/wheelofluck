const canvas = document.querySelector("#wheelCanvas");
const ctx = canvas.getContext("2d");
const spinButton = document.querySelector("#spinButton");
const winnerName = document.querySelector("#winnerName");
const entriesInput = document.querySelector("#entriesInput");
const applyEntries = document.querySelector("#applyEntries");
const resetEntries = document.querySelector("#resetEntries");
const shuffleButton = document.querySelector("#shuffleButton");
const removeWinnerToggle = document.querySelector("#removeWinnerToggle");
const historyList = document.querySelector("#historyList");
const clearHistory = document.querySelector("#clearHistory");
const adminToggle = document.querySelector("#adminToggle");
const adminDialog = document.querySelector("#adminDialog");
const spinMode = document.querySelector("#spinMode");
const targetWinner = document.querySelector("#targetWinner");
const landingOrderInput = document.querySelector("#landingOrderInput");
const spinDuration = document.querySelector("#spinDuration");
const spinRevolutions = document.querySelector("#spinRevolutions");

const defaultEntries = [
  "Ava",
  "Ben",
  "Chai",
  "Dana",
  "Eli",
  "Fern",
  "Gabe",
  "Hana",
  "Ivy",
  "Jules"
];

const palette = ["#e84f36", "#0a7a75", "#f4b942", "#325c9f", "#90be6d", "#a65fbd", "#f07f3c", "#35a7a0"];
let allEntries = [...defaultEntries];
let entries = [...defaultEntries];
let rotation = 0;
let isSpinning = false;
let history = [];
let landingOrderText = "";
let landingOrderPosition = 0;
let guaranteedTargetName = entries[0];

function parseEntries(value) {
  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 80);
}

function syncEntryControls() {
  const selectedName = guaranteedTargetName || entries[Number(targetWinner.value)] || entries[0];
  entriesInput.value = entries.join("\n");
  targetWinner.innerHTML = "";

  entries.forEach((entry, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = entry;
    option.selected = entry === selectedName;
    targetWinner.append(option);
  });
}

function drawWheel() {
  const { width, height } = canvas;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 18;
  const segment = (Math.PI * 2) / entries.length;

  ctx.clearRect(0, 0, width, height);

  entries.forEach((entry, index) => {
    const start = -Math.PI / 2 + rotation + index * segment;
    const end = start + segment;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = palette[index % palette.length];
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + segment / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${labelFontSize(entry, segment)}px Inter, system-ui, sans-serif`;
    ctx.shadowColor = "rgba(16, 24, 40, 0.22)";
    ctx.shadowBlur = 3;
    ctx.fillText(entry, radius - 52, 0, radius * 0.52);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 1, 0, Math.PI * 2);
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = "#101828";
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
}

function labelFontSize(label, segment) {
  const base = entries.length > 22 ? 24 : entries.length > 14 ? 30 : 38;
  const longNameAdjustment = Math.max(0, label.length - 12) * 1.2;
  return Math.max(16, Math.min(base, 42 - longNameAdjustment + segment * 2));
}

function normalizeAngle(angle) {
  const circle = Math.PI * 2;
  return ((angle % circle) + circle) % circle;
}

function selectedIndexFromRotation(angle = rotation) {
  const segment = (Math.PI * 2) / entries.length;
  const normalized = normalizeAngle(-angle);
  return Math.floor(normalized / segment) % entries.length;
}

function targetRotationForIndex(index) {
  const segment = (Math.PI * 2) / entries.length;
  const safeOffset = 0.01 + Math.random() * 0.98;
  return normalizeAngle(-(index + safeOffset) * segment);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function findEntryIndex(name) {
  return entries.findIndex((entry) => entry.toLowerCase() === name.toLowerCase());
}

function ensureEntryAvailable(name) {
  const existingIndex = findEntryIndex(name);
  if (existingIndex >= 0) return existingIndex;

  entries.push(name);
  syncEntryControls();
  return entries.length - 1;
}

function landingOrderNames() {
  const currentOrderText = landingOrderInput.value;
  if (currentOrderText !== landingOrderText) {
    landingOrderText = currentOrderText;
    landingOrderPosition = 0;
  }

  return parseEntries(currentOrderText);
}

function chooseTargetIndex() {
  if (spinMode.value === "guaranteed") {
    const selectedEntry = entries[Number(targetWinner.value)] || entries[0];
    guaranteedTargetName = guaranteedTargetName || selectedEntry;
    return ensureEntryAvailable(guaranteedTargetName);
  }

  if (spinMode.value === "landing-order") {
    const order = landingOrderNames();

    if (order.length) {
      const targetName = order[Math.min(landingOrderPosition, order.length - 1)];
      landingOrderPosition += 1;
      return ensureEntryAvailable(targetName);
    }

    const selectedEntry = entries[Number(targetWinner.value)] || entries[0];
    return ensureEntryAvailable(selectedEntry);
  }

  return Math.floor(Math.random() * entries.length);
}

function spinWheel() {
  if (isSpinning || entries.length < 2) return;

  const targetIndex = chooseTargetIndex();
  const startRotation = rotation;
  const targetBase = targetRotationForIndex(targetIndex);
  const currentBase = normalizeAngle(startRotation);
  const forwardDelta = normalizeAngle(targetBase - currentBase);
  const fullTurns = Math.max(4, Math.min(14, Number(spinRevolutions.value) || 8));
  const finalRotation = startRotation + fullTurns * Math.PI * 2 + forwardDelta;
  const duration = Math.max(3000, Math.min(9000, Number(spinDuration.value) * 1000 || 5500));
  const startedAt = performance.now();

  isSpinning = true;
  spinButton.disabled = true;
  winnerName.textContent = "Spinning...";

  function frame(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    rotation = startRotation + (finalRotation - startRotation) * easeOutCubic(progress);
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    rotation = normalizeAngle(finalRotation);
    drawWheel();
    revealWinner(selectedIndexFromRotation(rotation));
  }

  requestAnimationFrame(frame);
}

function revealWinner(index) {
  const name = entries[index];
  winnerName.textContent = name;
  history.unshift(name);
  history = history.slice(0, 12);
  renderHistory();

  if (removeWinnerToggle.checked) {
    entries.splice(index, 1);
    rotation = 0;
    syncEntryControls();
    drawWheel();
  }

  isSpinning = false;
  spinButton.disabled = false;
}

function renderHistory() {
  historyList.innerHTML = "";

  if (!history.length) {
    const item = document.createElement("li");
    item.textContent = "No spins yet";
    historyList.append(item);
    return;
  }

  history.forEach((name) => {
    const item = document.createElement("li");
    item.textContent = name;
    historyList.append(item);
  });
}

function applyEntryText() {
  const nextEntries = parseEntries(entriesInput.value);
  if (nextEntries.length < 2) {
    winnerName.textContent = "Add at least 2 names";
    return;
  }

  allEntries = [...nextEntries];
  entries = [...nextEntries];
  rotation = 0;
  guaranteedTargetName = entries[0];
  winnerName.textContent = "Ready";
  syncEntryControls();
  drawWheel();
}

function shuffleEntries() {
  const nextEntries = [...entries];

  for (let index = nextEntries.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextEntries[index], nextEntries[swapIndex]] = [nextEntries[swapIndex], nextEntries[index]];
  }

  entries = nextEntries;
  syncEntryControls();
  drawWheel();
}

spinButton.addEventListener("click", spinWheel);
applyEntries.addEventListener("click", applyEntryText);
shuffleButton.addEventListener("click", shuffleEntries);
resetEntries.addEventListener("click", () => {
  allEntries = [...defaultEntries];
  entries = [...allEntries];
  rotation = 0;
  guaranteedTargetName = entries[0];
  winnerName.textContent = "Ready";
  syncEntryControls();
  drawWheel();
});
clearHistory.addEventListener("click", () => {
  history = [];
  renderHistory();
});
adminToggle.addEventListener("click", () => adminDialog.showModal());
targetWinner.addEventListener("change", () => {
  guaranteedTargetName = entries[Number(targetWinner.value)] || entries[0];
});

syncEntryControls();
renderHistory();
drawWheel();
