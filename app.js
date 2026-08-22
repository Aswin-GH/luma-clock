const colors = ["#ffffff", "#ffea00", "#39ff14", "#00f5ff", "#3677ff", "#c83cff", "#ff2d95", "#ff3b18"];
const root = document.documentElement;
const app = document.querySelector(".clock-app");
const digital = document.querySelector(".digital-clock");
const analog = document.querySelector(".analog-clock");
const toggle = document.querySelector(".mode-toggle");
const hourHand = document.querySelector(".hour-hand");
const minuteHand = document.querySelector(".minute-hand");
let mode = localStorage.getItem("clock-mode") === "analog" ? "analog" : "digital";
let color = Number(localStorage.getItem("clock-color")) || 1;
let brightness = Number(localStorage.getItem("clock-brightness")) || 1;
let scale = Math.min(1, Number(localStorage.getItem("clock-scale")) || 1);
const pointers = new Map();
let gesture = {};

function shadeColor(hex, lightnessShift) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, saturation = 0;
  const lightness = (max + min) / 2;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > .5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue /= 6;
  }
  const shiftedLightness = Math.max(12, Math.min(100, lightness * 100 + lightnessShift));
  return `hsl(${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(shiftedLightness)}%)`;
}

function save() {
  localStorage.setItem("clock-mode", mode); localStorage.setItem("clock-color", color);
  localStorage.setItem("clock-brightness", brightness); localStorage.setItem("clock-scale", scale);
}
function paint() {
  const selectedColor = colors[color % colors.length];
  root.style.setProperty("--clock-color", selectedColor);
  root.style.setProperty("--hour-color", shadeColor(selectedColor, -11));
  root.style.setProperty("--minute-color", shadeColor(selectedColor, 11));
  root.style.setProperty("--clock-brightness", brightness);
  root.style.setProperty("--clock-scale", scale);
  digital.hidden = mode !== "digital"; analog.hidden = mode !== "analog";
  toggle.innerHTML = mode === "digital" ? '<span class="analog-icon"><i></i><i></i></span>' : '<span class="digital-icon">12<br>34</span>';
  toggle.setAttribute("aria-label", `Switch to ${mode === "digital" ? "analog" : "digital"} clock`);
}
function tick() {
  const now = new Date(), h = now.getHours(), m = now.getMinutes();
  document.querySelector("#hours").textContent = String(h).padStart(2,"0");
  document.querySelector("#minutes").textContent = String(m).padStart(2,"0");
  hourHand.style.transform = `translateX(-50%) rotate(${(h%12)*30+m*.5}deg)`;
  minuteHand.style.transform = `translateX(-50%) rotate(${m*6+now.getSeconds()*.1}deg)`;
  document.querySelector(".clock-stage").setAttribute("aria-label", `The time is ${h}:${String(m).padStart(2,"0")}`);
  if (now.getSeconds() === 0) drift(now);
}
function drift(now = new Date()) {
  const seed = Math.floor(now.getTime() / 60000);
  const x = ((seed * 17) % 9) - 4;
  const y = ((seed * 29) % 9) - 4;
  root.style.setProperty("--drift-x", `${x}px`);
  root.style.setProperty("--drift-y", `${y}px`);
}
function distance() { const p=[...pointers.values()]; return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y); }
app.addEventListener("pointerdown", e => {
  if (e.target.closest?.(".mode-toggle")) return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1) gesture={startY:e.clientY,startBrightness:brightness,startDistance:0,startScale:scale,moved:false};
  else if(pointers.size===2) { gesture.startDistance=distance(); gesture.startScale=scale; gesture.moved=true; }
});
app.addEventListener("pointermove", e => {
  if(!pointers.has(e.pointerId)) return; pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2 && gesture.startDistance) { scale=Math.min(1,Math.max(.45,gesture.startScale*distance()/gesture.startDistance)); gesture.moved=true; }
  else if(pointers.size===1) { const delta=gesture.startY-e.clientY; if(Math.abs(delta)>10) gesture.moved=true; brightness=Math.min(1.25,Math.max(.18,gesture.startBrightness+delta/innerHeight)); }
  paint();
});
function pointerEnd(e) { if(!pointers.has(e.pointerId)) return; const tap=pointers.size===1&&!gesture.moved; pointers.delete(e.pointerId); if(tap) color=(color+1)%colors.length; if(pointers.size<2) gesture.startDistance=0; paint(); save(); }
app.addEventListener("pointerup",pointerEnd); app.addEventListener("pointercancel",pointerEnd);
toggle.addEventListener("click",()=>{ mode=mode==="digital"?"analog":"digital"; paint(); save(); });
paint(); drift(); tick(); setInterval(tick,1000);
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then(registration => registration.update());
