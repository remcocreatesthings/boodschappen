
const DEFAULT_PRODUCTS = ["Halfvolle melk", "Lipton Ice Tea Green Zero", "Kinderkwark", "Paprika", "Mango", "Volkoren bolletjes", "Komkommer", "Philadelphia", "Knijpyoghurt banaan", "Knijpyoghurt aardbei", "Eieren", "Jong belegen kaas", "Crème fraîche", "Tex-mex burrito verspakket", "Kipdijfilet reepjes", "Avocado", "Citroen", "Kroepoek naturel", "Snoeptomaatjes", "Snoepkomkommer", "Keukenpapier", "Toiletpapier", "Sperziebonen", "Maiskolven", "Watermeloen", "Satésaus", "Nasi groente", "Zilvervliesrijst", "Filet americain", "Grillworst kaas", "Kip cordon bleu", "Kipfilet", "Kipgehakt", "Hamblokjes", "Hamreepjes", "Gebraden gehakt", "Gehakt", "Mozzarella", "Geraspte kaas", "Cottage cheese", "Hummus", "Paturain kruiden", "Pindakaas", "Yoghurt", "Griekse yoghurt", "Havermout", "Muesli", "Brinta", "Volkoren crackers", "Roggebrood", "Volkoren brood", "Tijger volkoren brood", "Libanees volkoren brood", "Wraps", "Pasta", "Volkoren fusilli", "Spaghetti", "Risottorijst", "Eiermie", "Couscous", "Aardappelen", "Zoete aardappel", "Uien", "Sjalotten", "Bosui", "Knoflook", "Wortels", "Winterpeen", "Spinazie", "Broccoli", "Bloemkool", "Boerenkool", "Spitskool", "Rode kool", "Paprikamix", "Puntpaprika", "Tomaten", "Appels", "Peren", "Bananen", "Mandarijnen", "Druiven", "Aardbeien", "Blauwe bessen", "Limoen", "Gember", "Champignons", "Paddenstoelenmix", "Pompoen", "Tuinerwten", "Mais", "Kokosmelk", "Pastasaus", "Pesto", "Sojasaus", "Mayonaise", "Ketchup", "Mosterd", "Tandpasta", "Allesreiniger"];
const DEFAULT_USAGE = {"Halfvolle melk": 9, "Lipton Ice Tea Green Zero": 8, "Kinderkwark": 8, "Paprika": 8, "Mango": 7, "Volkoren bolletjes": 7, "Komkommer": 6, "Philadelphia": 6, "Knijpyoghurt banaan": 6, "Knijpyoghurt aardbei": 5, "Eieren": 4, "Jong belegen kaas": 4, "Crème fraîche": 4, "Tex-mex burrito verspakket": 4, "Kipdijfilet reepjes": 4, "Avocado": 3, "Keukenpapier": 3, "Snoeptomaatjes": 3};

const STORAGE = {
  products: "boodschappen_products_v2",
  list: "boodschappen_list_v2",
  usage: "boodschappen_usage_v2"
};

let products = load(STORAGE.products, DEFAULT_PRODUCTS);
let list = load(STORAGE.list, []);
let usage = load(STORAGE.usage, DEFAULT_USAGE);

const searchInput = document.getElementById("searchInput");
const addCustomBtn = document.getElementById("addCustomBtn");
const suggestions = document.getElementById("suggestions");
const shoppingList = document.getElementById("shoppingList");
const emptyState = document.getElementById("emptyState");
const frequent = document.getElementById("frequent");
const clearDoneBtn = document.getElementById("clearDoneBtn");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");
const toastUndo = document.getElementById("toastUndo");

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveAll() {
  localStorage.setItem(STORAGE.products, JSON.stringify(products));
  localStorage.setItem(STORAGE.list, JSON.stringify(list));
  localStorage.setItem(STORAGE.usage, JSON.stringify(usage));
}

function normalize(s) {
  return s.trim().toLocaleLowerCase("nl-NL");
}

function exactProduct(name) {
  const n = normalize(name);
  return products.find(p => normalize(p) === n);
}

function addProduct(name, remember = true) {
  name = name.trim();
  if (!name) return;

  let canonical = exactProduct(name);
  if (!canonical && remember) {
    canonical = name.charAt(0).toLocaleUpperCase("nl-NL") + name.slice(1);
    products.push(canonical);
  } else if (!canonical) {
    canonical = name;
  }

  if (!list.some(i => normalize(i.name) === normalize(canonical) && !i.done)) {
    list.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()), name: canonical, done: false });
    usage[canonical] = (usage[canonical] || 0) + 1;
  }

  saveAll();
  searchInput.value = "";
  suggestions.classList.remove("active");
  render();
}

function removeItems(predicate, message) {
  const removed = list.map((item, index) => ({ item, index })).filter(r => predicate(r.item));
  if (removed.length === 0) return;
  list = list.filter(i => !predicate(i));
  saveAll();
  render();
  showUndo(message, () => {
    removed.forEach(r => list.splice(r.index, 0, r.item));
    saveAll();
    render();
  });
}

function removeItem(id) {
  const item = list.find(i => i.id === id);
  if (item) removeItems(i => i.id === id, `“${item.name}” verwijderd`);
}

let undoTimer;
function showUndo(message, undo) {
  clearTimeout(undoTimer);
  toastMessage.textContent = message;
  toastUndo.onclick = () => {
    hideToast();
    undo();
  };
  toast.classList.add("active");
  undoTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  clearTimeout(undoTimer);
  toast.classList.remove("active");
}

function toggleItem(id) {
  const item = list.find(i => i.id === id);
  if (item) item.done = !item.done;
  saveAll();
  render();
}

function renderSuggestions() {
  const q = normalize(searchInput.value);
  suggestions.innerHTML = "";
  if (!q) {
    suggestions.classList.remove("active");
    return;
  }

  const matches = products
    .filter(p => normalize(p).includes(q))
    .sort((a,b) => (usage[b]||0) - (usage[a]||0) || a.localeCompare(b, "nl"))
    .slice(0, 8);

  if (matches.length === 0) {
    const b = document.createElement("button");
    b.className = "suggestion";
    b.innerHTML = `<span>Voeg “${escapeHtml(searchInput.value.trim())}” toe</span><small>nieuw</small>`;
    b.onclick = () => addProduct(searchInput.value, true);
    suggestions.appendChild(b);
  } else {
    matches.forEach(p => {
      const b = document.createElement("button");
      b.className = "suggestion";
      b.innerHTML = `<span>${escapeHtml(p)}</span><small>+</small>`;
      b.onclick = () => addProduct(p, true);
      suggestions.appendChild(b);
    });
  }
  suggestions.classList.add("active");
}

function renderFrequent() {
  frequent.innerHTML = "";
  const top = products
    .filter(p => (usage[p] || 0) > 0)
    .sort((a,b) => (usage[b]||0) - (usage[a]||0) || a.localeCompare(b, "nl"))
    .slice(0, 8);

  if (top.length === 0) {
    const defaults = ["Melk","Brood","Bananen","Eieren","Kaas","Tomaten"];
    defaults.forEach(makeChip);
  } else {
    top.forEach(makeChip);
  }
}

function makeChip(p) {
  const b = document.createElement("button");
  b.className = "chip";
  b.textContent = p;
  b.onclick = () => addProduct(p, true);
  frequent.appendChild(b);
}

function renderList() {
  shoppingList.innerHTML = "";
  emptyState.classList.toggle("hidden", list.length > 0);
  shoppingList.classList.toggle("hidden", list.length === 0);

  // Open items first, checked-off items at the bottom.
  const ordered = list.filter(i => !i.done).concat(list.filter(i => i.done));
  ordered.forEach(item => {
    const li = document.createElement("li");
    li.className = "item" + (item.done ? " done" : "");

    const check = document.createElement("button");
    check.className = "check";
    check.setAttribute("aria-label", item.done ? "Markeer als niet gedaan" : "Markeer als gedaan");
    check.textContent = item.done ? "✓" : "";
    check.onclick = () => toggleItem(item.id);

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.name;
    name.onclick = () => toggleItem(item.id);

    const del = document.createElement("button");
    del.className = "delete";
    del.setAttribute("aria-label", "Verwijder");
    del.textContent = "×";
    del.onclick = () => removeItem(item.id);

    li.append(check, name, del);
    shoppingList.appendChild(li);
  });
}

function render() {
  renderFrequent();
  renderList();
  renderSuggestions();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]);
}

searchInput.addEventListener("input", renderSuggestions);
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addProduct(searchInput.value, true);
});
addCustomBtn.addEventListener("click", () => addProduct(searchInput.value, true));
clearDoneBtn.addEventListener("click", () => {
  const count = list.filter(i => i.done).length;
  removeItems(i => i.done, count === 1 ? "1 item gewist" : `${count} items gewist`);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

render();
