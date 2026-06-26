const hallTracks = Array.from({ length: 56 }, (_, i) => String(i + 1));
const outsideTracks = ["60","61","62","63","64","65","66","67","68","69","70","71","72","73","74","75","76","77","79","80","91"];
const specialTracks = ["SB", "SBB"];

const trackMeta = {};
for (let i=1;i<=56;i++) {
  trackMeta[String(i)] = {
    zone: "Halle",
    dachstand: false,
    heber: false,
    heberTyp: "",
    bemerkung: ""
  };
}
["16","18","20"].forEach(t => trackMeta[t].bemerkung = "Ausfahrtsgleis Richtung Hof");
trackMeta["SB"] = { zone:"Halle", bemerkung:"Schiebebühne / Auskreuzen" };
trackMeta["SBB"] = { zone:"Aussen", bemerkung:"SBB / Übergabe" };
outsideTracks.forEach(t => trackMeta[t] = trackMeta[t] || { zone:"Aussen", bemerkung:"" });

let data = JSON.parse(localStorage.getItem("zw_v4_data")) || {};
let history = JSON.parse(localStorage.getItem("zw_v4_history")) || [];
let plan = JSON.parse(localStorage.getItem("zw_v4_plan")) || null;
let currentTrack = null;

window.addEventListener("load", () => {
  initData();
  drawHall();
  drawOutside();
  bindEvents();
  renderAll();
});

function initData(){
  [...hallTracks, ...outsideTracks, ...specialTracks].forEach(t => { if (!data[t]) data[t] = []; });
  save();
}
function save(){
  localStorage.setItem("zw_v4_data", JSON.stringify(data));
  localStorage.setItem("zw_v4_history", JSON.stringify(history));
  localStorage.setItem("zw_v4_plan", JSON.stringify(plan));
}
function bindEvents(){
  document.getElementById("searchInput").addEventListener("input", renderAll);
  document.getElementById("clearSearchBtn").addEventListener("click", () => { document.getElementById("searchInput").value=""; renderAll(); });
  document.getElementById("closeSideBtn").addEventListener("click", closeSide);
  document.getElementById("addVehicleBtn").addEventListener("click", addVehicle);
  document.getElementById("moveVehicleBtn").addEventListener("click", moveVehicle);
  document.getElementById("removeVehicleBtn").addEventListener("click", removeVehicle);
  document.getElementById("resetBtn").addEventListener("click", resetAll);
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("importFile").addEventListener("change", importData);
  document.getElementById("planBtn").addEventListener("click", () => document.getElementById("planModal").classList.remove("hidden"));
  document.getElementById("closePlanBtn").addEventListener("click", () => document.getElementById("planModal").classList.add("hidden"));
  document.getElementById("simulateBtn").addEventListener("click", simulatePlan);
  document.getElementById("clearPlanBtn").addEventListener("click", clearPlan);
}

function drawHall(){
  const map = document.getElementById("hallMap");
  map.innerHTML = "";

  // Halle nach Grundriss-Logik:
  // oben ungerade Gleise 1–55, unten gerade Gleise 2–56.
  // Die Schiebebühne liegt als durchgehender horizontaler Fahrweg in der Mitte.
  const startX = 34;
  const stepX = 43;

  // obere Gleise 1,3,5 ... 55
  for (let t = 1; t <= 55; t += 2) {
    const idx = (t - 1) / 2;
    const x = startX + idx * stepX;
    createTrack(map, String(t), { x, y: 45, w: 34, h: 245, vertical: true });
  }

  // Schiebebühne über die ganze Hallenlänge
  createTrack(map, "SB", { x: startX, y: 318, w: 1190, h: 78, cls: "sb sbFull" });

  // untere Gleise 2,4,6 ... 56
  for (let t = 2; t <= 56; t += 2) {
    const idx = (t - 2) / 2;
    const x = startX + idx * stepX;
    createTrack(map, String(t), { x, y: 430, w: 34, h: 245, vertical: true });
  }
}

function drawOutside(){
  const map = document.getElementById("outsideMap");
  map.innerHTML = "";

  // V4.3: Aussenanlage nutzt den Originalplan als Hintergrund.
  // Darauf liegen nur noch klickbare Hotspots. So bleiben die echten
  // Gleisverbindungen/Weichen aus dem Plan sichtbar.

  // Gleis 80: oben als Stumpengleis
  createTrack(map, "80", { x: 505, y: 38, w: 360, h: 22, cls: "planHotspot" });

  // Gleis 60: darunter als Verbindung in die 60er-Gleise
  createTrack(map, "60", { x: 505, y: 62, w: 360, h: 22, cls: "planHotspot" });

  // Fächer 61–69 links, exakt entlang der senkrechten Gleise
  const fan = ["61","62","63","64","65","66","67","68","69"];
  fan.forEach((t,i) => {
    createTrack(map, t, { x: 18 + i*17, y: 117, w: 14, h: 488, vertical: true, cls: "planHotspot narrow" });
  });

  // Gleis 70: separates Verbindungsgleis rechts neben dem 61–69-Fächer.
  // Bewusst etwas nach rechts versetzt, damit 69 nicht überdeckt wird.
  createTrack(map, "70", { x: 188, y: 360, w: 19, h: 148, vertical: true, cls: "planHotspot narrow" });

  // Gleis 71–77: waagrechte Gleise rechts oben, leicht versetzt, damit die Planlinien sichtbar bleiben.
  ["71","72","73","74","75","76","77"].forEach((t,i) => {
    createTrack(map, t, { x: 655, y: 94 + i*18, w: 190, h: 14, cls: "planHotspot slim" });
  });

  // SBB: eigener Bereich am rechten Rand. Gleis 78 wird nicht separat geführt.
  createTrack(map, "SBB", { x: 910, y: 218, w: 125, h: 34, cls: "sb planHotspot" });

  // Gleis 91: diagonal am unteren rechten Rand des Anschlussbereichs.
  createTrack(map, "91", { x: 720, y: 335, w: 115, h: 22, cls: "planHotspot diagonal91" });
}

function drawOutsideRails(map){
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "railLayer");
  svg.setAttribute("viewBox", "0 0 1100 700");
  svg.setAttribute("preserveAspectRatio", "none");

  const paths = [
    // Gleis 80: Stumpengleis oben, bewusst ohne Verbindung zum Fächer
    "M500 54 L1035 54",
    "M1035 54 L1070 54",

    // Gleis 60: Hauptverbindung darunter zum Weichenfeld rechts und zu den 60er-Fächern links
    "M500 94 L1040 94 C1070 94 1080 115 1070 135",
    "M500 94 C410 94 375 135 375 185",

    // linke Fächer 61–69: Bögen von/zu Gleis 60/70 wie im Plan
    "M60 150 C60 95 130 82 375 92",
    "M96 150 C96 105 155 96 375 110",
    "M132 150 C132 115 180 118 375 132",
    "M168 150 C168 128 205 140 375 154",
    "M204 150 C204 142 230 162 375 178",
    "M240 150 C240 158 260 190 375 215",
    "M276 150 C276 178 300 230 375 270",
    "M312 150 C312 205 340 300 375 350",
    "M348 150 C348 230 365 390 375 530",

    // untere Rückläufe vom Fächer Richtung 70 / Ausfahrtbereich
    "M60 560 C60 625 155 645 375 610 L760 520",
    "M96 560 C96 615 175 625 375 585 L790 500",
    "M132 560 C132 600 200 600 375 558 L820 475",
    "M168 560 C168 585 225 575 375 528 L850 450",
    "M204 560 C204 568 250 548 375 498 L875 425",
    "M240 560 C240 550 280 520 375 468 L900 400",
    "M276 560 C276 530 305 490 375 438 L930 370",
    "M312 560 C312 510 335 460 375 405 L960 340",
    "M348 560 C348 490 360 440 375 375 L990 315",

    // Verbindung 70 nach oben/unten
    "M389 185 C410 135 455 110 500 94",
    "M389 540 C470 570 610 555 760 520",

    // 71–77 parallel zum rechten Weichenfeld
    "M455 172 L875 172 C955 172 1010 130 1070 98",
    "M455 210 L875 210 C960 205 1015 155 1070 115",
    "M455 248 L875 248 C965 240 1020 180 1070 132",
    "M455 286 L875 286 C970 275 1025 205 1070 149",
    "M455 324 L875 324 C975 310 1030 230 1070 166",
    "M455 362 L875 362 C980 345 1035 255 1070 183",
    "M455 400 L875 400 C985 380 1040 280 1070 200",

    // 78/SBB rechts am Rand
    "M875 262 L900 262 C975 250 1030 215 1070 185",
    "M875 307 L900 307 C980 294 1035 250 1070 220",

    // 91 diagonaler Anschluss
    "M760 524 L950 430 L1070 250"
  ];

  for (const d of paths) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    p.setAttribute("class", "railPath");
    svg.appendChild(p);
  }
  map.appendChild(svg);
}

function createDiv(parent, cls, pos){
  const el = document.createElement("div");
  el.className = cls;
  el.style.left = pos.x+"px"; el.style.top = pos.y+"px"; el.style.width = pos.w+"px"; el.style.height = pos.h+"px";
  parent.appendChild(el);
}
function createTrack(parent, id, pos){
  const el = document.createElement("div");
  el.id = "track-" + id;
  el.className = "track " + (pos.cls || "");
  if (pos.vertical) el.style.writingMode = "vertical-rl";
  el.style.left = pos.x+"px"; el.style.top = pos.y+"px"; el.style.width = pos.w+"px"; el.style.height = pos.h+"px";
  el.addEventListener("click", () => openTrack(id));
  parent.appendChild(el);
}

function renderAll(){ [...hallTracks, ...outsideTracks, ...specialTracks].forEach(renderTrack); renderStats(); }
function renderTrack(track){
  const el = document.getElementById("track-" + track); if (!el) return;
  const vehicles = data[track] || [];
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  el.classList.remove("occupied","multi","search","planned","route");
  if (plan) {
    if (track === plan.to) el.classList.add("planned");
    if (track === plan.from || plan.via.includes(track)) el.classList.add("route");
  }
  if (vehicles.length === 1) el.classList.add("occupied");
  if (vehicles.length > 1) el.classList.add("multi");
  if (search && vehicles.some(v => v.toLowerCase().includes(search))) el.classList.add("search");
  const name = track === "SB" ? "SB" : track === "SBB" ? "SBB" : "Gleis " + track;
  if (vehicles.length === 0) el.textContent = name;
  else if (vehicles.length <= 2) el.textContent = name + "\n" + vehicles.join("\n");
  else el.textContent = name + "\n" + vehicles.slice(0,2).join("\n") + `\n+${vehicles.length-2}`;
}
function renderStats(){
  const inside = hallTracks.reduce((sum,t)=>sum+(data[t]||[]).length,0);
  const outside = outsideTracks.reduce((sum,t)=>sum+(data[t]||[]).length,0);
  const sb = (data.SB||[]).length; const sbb = (data.SBB||[]).length;
  document.querySelector(".legend").dataset.stats = `${inside+outside+sb+sbb} Fahrzeuge`;
}

function openTrack(track){
  currentTrack = track;
  document.getElementById("sideTitle").textContent = track === "SB" ? "SB - Schiebebühne" : track === "SBB" ? "SBB" : "Gleis " + track;
  renderTrackInfo(); renderVehicles(); renderHistory();
  document.getElementById("vehicleInput").value = ""; document.getElementById("viaInput").value = ""; document.getElementById("targetInput").value = "";
  document.getElementById("sidePanel").classList.remove("hidden");
}
function closeSide(){ document.getElementById("sidePanel").classList.add("hidden"); }
function renderTrackInfo(){
  const m = trackMeta[currentTrack] || {};
  document.getElementById("trackInfo").innerHTML = `<b>Zone:</b> ${m.zone || "-"}<br><b>Dachstand:</b> ${m.dachstand ? "Ja" : "Nein"}<br><b>Heber:</b> ${m.heber ? "Ja" : "Nein"}${m.heberTyp ? " · "+m.heberTyp : ""}<br><b>Info:</b> ${m.bemerkung || "-"}`;
}
function renderVehicles(){
  const list = document.getElementById("vehicleList"), sel = document.getElementById("vehicleSelect");
  list.innerHTML=""; sel.innerHTML="";
  const vehicles = data[currentTrack] || [];
  if (!vehicles.length) list.innerHTML = "<p>Keine Fahrzeuge.</p>";
  vehicles.forEach(v => { const d=document.createElement("div"); d.className="vehicle"; d.textContent="🚋 "+v; list.appendChild(d); const o=document.createElement("option"); o.value=v; o.textContent=v; sel.appendChild(o); });
}
function addVehicle(){
  const v = document.getElementById("vehicleInput").value.trim(); if (!v) return;
  removeEverywhere(v); data[currentTrack].push(v); addHistory(v,"hinzugefügt","-",currentTrack,[]); save(); renderAll(); openTrack(currentTrack);
}
function moveVehicle(){
  const v = document.getElementById("vehicleSelect").value; const target = normalizeTrack(document.getElementById("targetInput").value); const via = parseVia(document.getElementById("viaInput").value);
  if (!v) return alert("Kein Fahrzeug ausgewählt."); if (!target) return alert("Zielgleis eingeben."); if (!data[target]) return alert("Zielgleis existiert nicht.");
  for (const g of via) if (!data[g]) return alert("Via-Gleis existiert nicht: "+g);
  const from = currentTrack; removeEverywhere(v); data[target].push(v); addHistory(v,"verschoben",from,target,via); save(); renderAll(); openTrack(target);
}
function removeVehicle(){
  const v = document.getElementById("vehicleSelect").value; if (!v) return alert("Kein Fahrzeug ausgewählt."); removeEverywhere(v); addHistory(v,"entfernt",currentTrack,"-",[]); save(); renderAll(); openTrack(currentTrack);
}
function removeEverywhere(v){ Object.keys(data).forEach(t => data[t] = (data[t]||[]).filter(x => x !== v)); }
function addHistory(vehicle, action, from, to, via){ history.unshift({ time:new Date().toLocaleString(), vehicle, action, from, to, via }); }
function renderHistory(){
  const box=document.getElementById("historyList"); box.innerHTML="";
  const rel=history.filter(h => h.from===currentTrack || h.to===currentTrack || (h.via||[]).includes(currentTrack) || (data[currentTrack]||[]).includes(h.vehicle)).slice(0,12);
  if (!rel.length) { box.innerHTML="<p>Keine Historie.</p>"; return; }
  rel.forEach(h => { const d=document.createElement("div"); d.className="history"; d.textContent=`${h.time} | ${h.vehicle}\n${h.action}: ${h.from}${h.via?.length ? " → via " + h.via.join(" → ") : ""} → ${h.to}`; box.appendChild(d); });
}
function normalizeTrack(v){ return String(v||"").trim().toUpperCase().replace("GLEIS","").trim(); }
function parseVia(v){ return String(v||"").split(",").map(normalizeTrack).filter(Boolean); }

function simulatePlan(){
  const vehicle=document.getElementById("planVehicle").value.trim(); const from=normalizeTrack(document.getElementById("planFrom").value); const to=normalizeTrack(document.getElementById("planTo").value); const via=parseVia(document.getElementById("planVia").value);
  if (!from || !to) return alert("Von und Nach eingeben.");
  plan = { vehicle, from, to, via }; save(); renderAll();
  const checks = [];
  [from, ...via, to].forEach(g => checks.push(`${g}: ${(data[g]||[]).length ? "belegt durch " + data[g].join(", ") : "frei"}`));
  document.getElementById("planResult").textContent = `Simulation:\n${vehicle || "Fahrzeug"}: ${from}${via.length ? " → via " + via.join(" → ") : ""} → ${to}\n\n${checks.join("\n")}`;
}
function clearPlan(){ plan=null; save(); renderAll(); document.getElementById("planResult").textContent=""; }
function resetAll(){ if(!confirm("Wirklich alle Fahrzeuge und Historie löschen?")) return; data={}; history=[]; plan=null; initData(); renderAll(); closeSide(); }
function exportData(){ const blob = new Blob([JSON.stringify({data,history,plan,trackMeta,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="gleisbelegung_v4_backup.json"; a.click(); }
function importData(e){ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const b=JSON.parse(r.result); data=b.data||{}; history=b.history||[]; plan=b.plan||null; initData(); renderAll(); alert("Backup importiert."); }catch{ alert("Backup konnte nicht gelesen werden."); } }; r.readAsText(f); }
