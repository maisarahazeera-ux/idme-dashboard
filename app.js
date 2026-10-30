/* Dashboard Permohonan Tahun 1 2027 — baca data terus dari Google Sheet */
(() => {
const CFG = window.IDME_CONFIG;
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString("en-US");
const pct = v => v.toFixed(1) + "%";

/* ---------- 1. Ambil data ---------- */
function sources() {
  if (CFG.LOCAL_CSV) return [CFG.LOCAL_CSV];
  const base = `https://docs.google.com/spreadsheets/d/${CFG.SHEET_ID}`;
  return [
    `${base}/export?format=csv&gid=${CFG.GID}`,
    `${base}/gviz/tq?tqx=out:csv&gid=${CFG.GID}&headers=0`
  ];
}

async function fetchRows() {
  let lastErr;
  for (const url of sources()) {
    try {
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(url + sep + "_=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.trimStart().startsWith("<")) throw new Error("Sheet tidak boleh diakses (pastikan 'Anyone with the link: Viewer').");
      return Papa.parse(text, { skipEmptyLines: false }).data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

/* ---------- 2. Tukar baris CSV kepada rekod sekolah ---------- */
const norm = s => String(s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const num = s => { const v = parseFloat(String(s ?? "").replace(/[,%\s]/g, "")); return isNaN(v) ? 0 : v; };

// Cara kenal setiap lajur ikut tajuk (tak kisah susunan lajur)
const COLS = {
  nama:  h => h.includes("nama sekolah"),
  m5:    h => h.includes("mohon 5+"),
  m6:    h => h.includes("mohon 6+"),
  kap:   h => h === "kapasiti" || (h.endsWith("kapasiti") && !h.includes("peratusan")),
  kelas: h => h.startsWith("bilangan bilik darjah") && !h.includes("sistem"),
  A:     h => /\(a\)$/.test(h),
  B:     h => /\(b\)$/.test(h),
  keLain:h => h.includes("ke sek lain"),
  C:     h => /\(c\)$/.test(h),
  D:     h => /\(d\)$/.test(h),
  E:     h => /\(e\)$/.test(h),
  F:     h => /\(f\)$/.test(h),
  G:     h => /\(g\)$/.test(h),
  lulus: h => h.replace(/\s/g, "").includes("(a+b+c+d+e+f+g)")
};
const REQUIRED = { nama: "Nama Sekolah", kap: "Kapasiti", kelas: "Bilangan Bilik Darjah", lulus: "Jumlah Lulus (A+B+C+D+E+F+G)" };

function shortName(s) {
  const t = s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return t.replace(/^Sekolah Jenis Kebangsaan \(Cina\)/, "SJKC")
          .replace(/^Sekolah Jenis Kebangsaan \(Tamil\)/, "SJKT")
          .replace(/^Sekolah Kebangsaan/, "SK");
}

function toRecords(rows) {
  const hi = rows.findIndex(r => r.some(c => norm(c).includes("nama sekolah")));
  if (hi < 0) throw new Error("Tak jumpa baris tajuk 'Nama Sekolah' dalam sheet.");
  const H = rows[hi].map(norm);
  const idx = {};
  for (const [k, test] of Object.entries(COLS)) idx[k] = H.findIndex(test);
  const missing = Object.entries(REQUIRED).filter(([k]) => idx[k] < 0).map(([, v]) => v);
  if (missing.length) throw new Error("Lajur tidak dijumpai: " + missing.join(", ") + ". Semak tajuk lajur dalam sheet.");

  const g = (r, k) => idx[k] >= 0 ? num(r[idx[k]]) : 0;
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const raw = String(r[idx.nama] ?? "").replace(/ /g, " ").trim();
    const m = raw.match(/^(JB[A-Z]\d{4})\s+(.+)$/i);
    if (!m) continue;                         // skip baris kosong / JUMLAH
    const k = g(r, "kap");
    if (!(k > 0)) continue;                   // skip sekolah tanpa kapasiti (cth. Pendidikan Khas)
    const parts = { A: g(r,"A"), B: g(r,"B"), C: g(r,"C"), D: g(r,"D"), E: g(r,"E"), F: g(r,"F"), G: g(r,"G") };
    let l = g(r, "lulus");
    if (!l) l = Object.values(parts).reduce((a, b) => a + b, 0);
    const c = g(r, "kelas") || 1;
    out.push({
      cd: m[1].toUpperCase(), n: shortName(m[2]), j: m[1].slice(0, 3).toUpperCase(),
      k, l, p: l / k, d: l - k, c, m: l / c,
      m5: g(r, "m5"), m6: g(r, "m6"), keLain: g(r, "keLain"), parts, bw: parts.F
    });
  }
  if (!out.length) throw new Error("Tiada data sekolah dijumpai.");
  return out;
}

/* ---------- 3. Paparan ---------- */
const JN = [["ALL","Semua","ti-layout-grid"],["JBA","SK (JBA)","ti-school"],["JBB","SK (JBB)","ti-building"],["JBC","SJKC","ti-books"],["JBD","SJKT","ti-book"]];
const C = {
  over: { s:"#EF4444", bg:"#FEF2F2", tx:"#B91C1C", t:"Melebihi", f:"#FF3B30" },
  near: { s:"#F59E0B", bg:"#FFFBEB", tx:"#B45309", t:"Hampir penuh", f:"#F2C200" },
  ok:   { s:"#22C55E", bg:"#F0FDF4", tx:"#15803D", t:"Ada ruang", f:"#22D046" }
};
const STRIPE = "repeating-linear-gradient(120deg,rgba(255,255,255,.16) 0 2px,transparent 2px 6px)";
const S = { j:"ALL", s:"ALL", q:"", n:20, o:null, bw:false };
let R = [];
const st = p => p > 1 ? "over" : p >= 0.9 ? "near" : "ok";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

function meter(r) {
  const s = C[st(r.p)];
  const bar = r.d > 0
    ? `<div class="bl" style="flex:1;background:${STRIPE},${s.f}"></div><div class="dv" style="background:#111827"></div><div class="bl" style="width:${Math.max(Math.min(r.d / r.k, 0.4), 0.18) * 100}%;flex-shrink:0;background:${STRIPE},#B91C1C"></div>`
    : `<div class="bl" style="width:calc(${Math.min(r.p * 100, 100)}% - 3px);flex-shrink:0;background:${STRIPE},${s.f}"></div><div class="dv"></div><div class="gr"></div>`;
  return `<span style="display:flex;align-items:center;justify-content:center;gap:6px"><span class="mt">${bar}</span><span class="pc" style="color:${s.tx}">${pct(r.p * 100)}</span></span>`;
}
function lab(r) {
  if (r.d > 0) return `<span class="tg" style="background:#FEF2F2;color:#B91C1C">Lebih ${r.d}</span>`;
  if (r.d === 0) return `<span class="tg" style="background:#FFFBEB;color:#B45309">Penuh</span>`;
  const s = C[st(r.p)];
  return `<span class="tg" style="background:${s.bg};color:${s.tx}">${-r.d} tempat</span>`;
}
function detail(r) {
  const s = C[st(r.p)], x = r.parts;
  const msg = r.d > 0
    ? `Sekolah ini <b style="color:#B91C1C">melebihi kapasiti sebanyak ${r.d} murid</b> (${pct(r.p*100)}): ${r.l} lulus berbanding kapasiti ${r.k}.`
    : r.d === 0
    ? `Sekolah ini <b style="color:#B45309">penuh tepat</b> (100.0%): ${r.l} lulus, kapasiti ${r.k}.`
    : `Sekolah ini <b style="color:${s.tx}">boleh muat lagi ${-r.d} murid</b> (${pct(r.p*100)} terisi): ${r.l} lulus daripada kapasiti ${r.k}.`;
  const ln = (a, b, cl) => `<div class="ln"><span class="sec">${a}</span><span class="v" style="${b === 0 && !cl ? "color:#9CA3AF;" : ""}${cl ? `color:${cl}` : ""}">${b}</span></div>`;
  const ap = [["A · Diluluskan sistem",x.A],["B · Lulus dari sekolah lain",x.B],["C · Kelulusan 5+ manual",x.C],["D · Kelulusan 6+ manual",x.D],["E · Rayuan online",x.E],["F · Bukan warganegara",x.F],["G · Lewat / ASBS",x.G]];
  return `<div class="dt"><div style="margin-bottom:10px"><i class="ti ti-info-circle" style="color:#2563EB"></i> ${msg}</div><div class="dg">
    <div class="db"><div class="t" style="color:#2563EB"><i class="ti ti-file-text"></i> Permohonan</div>${ln("Mohon 5+",r.m5)}${ln("Mohon 6+",r.m6)}${ln("Jumlah mohon",r.m5+r.m6)}${ln("Ke sekolah lain",r.keLain)}</div>
    <div class="db"><div class="t" style="color:#16A34A"><i class="ti ti-user-check"></i> Kelulusan</div>${ap.map(a => ln(a[0], a[1])).join("")}
      <div style="border-top:1px solid #E5E7EB;margin-top:4px;padding-top:4px">${ln("Jumlah lulus (A–G)",r.l,"#111827")}${ln("Warganegara",r.l-r.bw,"#0E7490")}${ln("Kapasiti",r.k,"#111827")}${ln(r.d>0?"Lebih":"Muat lagi",Math.abs(r.d),r.d>0?"#B91C1C":"#15803D")}</div></div>
  </div></div>`;
}

function draw() {
  const q = S.q.toLowerCase();
  const sq = R.filter(r => r.n.toLowerCase().includes(q) || r.cd.toLowerCase().includes(q));

  $("jn").innerHTML = JN.map(([v, t, ic]) => {
    const n = v === "ALL" ? sq.length : sq.filter(r => r.j === v).length;
    return `<div class="tbi${S.j === v ? " on" : ""}" data-v="${v}" role="button"><i class="ti ${ic}"></i>${t}<span class="n">${n}</span></div>`;
  }).join("");
  document.querySelectorAll("#jn .tbi").forEach(e => e.onclick = () => { S.j = e.dataset.v; draw(); });

  $("nn").innerHTML = [20, 50, 100].map(v => `<span data-v="${v}" role="button" class="${S.n === v ? "on" : ""}">${v}</span>`).join("");
  document.querySelectorAll("#nn span").forEach(e => e.onclick = () => { S.n = +e.dataset.v; draw(); });

  const base = sq.filter(r => S.j === "ALL" || r.j === S.j);

  // Kewarganegaraan
  const tl = base.reduce((a, r) => a + r.l, 0), tb = base.reduce((a, r) => a + r.bw, 0), tw = tl - tb;
  const nb = base.filter(r => r.bw > 0).length, pw = tl ? tw / tl * 100 : 0, pb = tl ? tb / tl * 100 : 0;
  $("wg").innerHTML = `<div class="wg3">
    <div class="wgc" style="background:#ECFEFF;color:#0E7490"><div class="t"><i class="ti ti-flag"></i>Warganegara</div><div class="v">${fmt(tw)}</div><div class="s">${pct(pw)} daripada lulus</div></div>
    <div class="wgc" style="background:#F5F3FF;color:#6D28D9"><div class="t"><i class="ti ti-world"></i>Bukan warganegara</div><div class="v">${fmt(tb)}</div><div class="s">${pct(pb)} · di ${nb} sekolah</div></div>
    <div class="wgc" style="background:#F3F4F6;color:#111827"><div class="t"><i class="ti ti-users"></i>Jumlah murid lulus</div><div class="v">${fmt(tl)}</div><div class="s sec">warganegara + bukan warganegara</div></div></div>
    <div class="split"><div style="width:${pw}%;background:#06B6D4"></div>${tb ? `<div style="width:max(${pb}%,6px);background:#8B5CF6"></div>` : ""}</div>`;
  $("bwb").innerHTML = `<span role="button" id="bwt" class="tg" style="cursor:pointer;padding:5px 10px;background:${S.bw ? "#7C3AED" : "#F5F3FF"};color:${S.bw ? "#fff" : "#6D28D9"}"><i class="ti ti-filter"></i> ${S.bw ? "Papar semua sekolah" : "Tapis sekolah ada bukan warganegara"}</span>`;
  $("bwt").onclick = () => { S.bw = !S.bw; draw(); };

  // KPI
  const c = { over: 0, near: 0, ok: 0 }; base.forEach(r => c[st(r.p)]++);
  const K = [["ALL","Jumlah sekolah",base.length,"#2563EB","ti-school","#EFF6FF","#1D4ED8","Semua"],
             ["over","Melebihi kapasiti",c.over,"#EF4444","ti-alert-circle",C.over.bg,C.over.tx,"> 100%"],
             ["near","Hampir penuh",c.near,"#F59E0B","ti-alert-triangle",C.near.bg,C.near.tx,"90 – 100%"],
             ["ok","Ada ruang",c.ok,"#22C55E","ti-circle-check",C.ok.bg,C.ok.tx,"< 90%"]];
  $("kp").innerHTML = K.map(([v, t, n, cl, ic, bg, tx, sub]) => `<div class="k" data-v="${v}" style="${S.s === v ? `border:2px solid ${cl};padding:12px` : ""}">
    <div class="top2"><div class="ic" style="background:${cl}"><i class="ti ${ic}"></i></div><span class="tg" style="background:${bg};color:${tx}">${sub}</span></div>
    <div class="num">${n}</div><div class="sec">${t}</div></div>`).join("");
  document.querySelectorAll("#kp .k").forEach(e => e.onclick = () => { S.s = e.dataset.v; draw(); });

  // Donut
  const tn = base.length || 1; let off = 25, svg = `<circle cx="21" cy="21" r="15.9" fill="none" stroke="#F3F4F6" stroke-width="6"/>`;
  ["over","near","ok"].forEach(s => { const v = c[s] / tn * 100; if (v) { svg += `<circle cx="21" cy="21" r="15.9" fill="none" stroke="${C[s].s}" stroke-width="6" stroke-dasharray="${v} ${100 - v}" stroke-dashoffset="${off}"/>`; off -= v; } });
  svg += `<text x="21" y="22" text-anchor="middle" font-size="7" font-weight="600" fill="#0F172A">${base.length}</text><text x="21" y="28" text-anchor="middle" font-size="3.6" fill="#6B7280">sekolah</text>`;
  $("dn").innerHTML = svg;
  $("lg").innerHTML = ["over","near","ok"].map(s => `<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0"><span style="display:flex;align-items:center;gap:6px;color:#374151"><span style="width:10px;height:10px;border-radius:3px;background:${C[s].s}"></span>${C[s].t}</span><span style="font-weight:500">${c[s]} <span class="sec" style="font-weight:400">(${pct(c[s] / tn * 100)})</span></span></div>`).join("");

  // Status ikut jenis
  $("sj").innerHTML = JN.slice(1).map(([v, t]) => {
    const g = sq.filter(r => r.j === v), cc = { over: 0, near: 0, ok: 0 }; g.forEach(r => cc[st(r.p)]++);
    return `<div style="margin:8px 0"><div style="font-size:12.5px;display:flex;justify-content:space-between;color:#374151"><span>${t}</span><span class="sec">${g.length}</span></div>
      <div style="display:flex;height:16px;border-radius:8px;overflow:hidden;margin-top:3px;gap:2px;background:#F3F4F6">${["over","near","ok"].map(s => cc[s] ? `<div title="${C[s].t}: ${cc[s]}" style="width:${cc[s] / (g.length || 1) * 100}%;background:${C[s].s};font-size:10.5px;color:#fff;text-align:center;line-height:16px">${cc[s]}</div>` : "").join("")}</div></div>`;
  }).join("");

  // Senarai sekolah
  let L = base.filter(r => (S.s === "ALL" || st(r.p) === S.s) && (!S.bw || r.bw > 0)).sort((a, b) => b.p - a.p);
  const tot = L.length; L = L.slice(0, S.n);
  $("ct").textContent = `Memaparkan ${L.length} daripada ${tot} sekolah${S.bw ? " (ada bukan warganegara)" : ""}`;
  $("br").innerHTML = L.length ? L.map(r => {
    const op = S.o === r.cd;
    return `<div class="row gd${op ? " open" : ""}" data-c="${r.cd}">
      <span class="tg code">${r.cd}</span>
      <span class="nm">${esc(r.n)}${S.bw ? ` <span class="tg" style="background:#F5F3FF;color:#6D28D9">${r.bw} BW</span>` : ""}</span>
      <span class="c">${r.c}</span>
      <span class="c" style="color:${r.m > CFG.MAX_PER_CLASS ? "#B91C1C" : "#374151"}">${r.m.toFixed(1)}</span>
      <span class="c" style="font-weight:600">${r.l}</span>
      <span class="c sec">${r.k}</span>
      ${meter(r)}
      <span class="c">${lab(r)}</span>
      <i class="ti ${op ? "ti-chevron-up" : "ti-chevron-down"}" style="color:#9CA3AF"></i></div>${op ? detail(r) : ""}`;
  }).join("") : `<div class="empty">Tiada sekolah untuk penapis ini.</div>`;
  document.querySelectorAll("#br .row").forEach(e => e.onclick = () => { S.o = S.o === e.dataset.c ? null : e.dataset.c; draw(); });
}

/* ---------- 4. Muat & kemaskini automatik ---------- */
async function load() {
  const btn = $("reload"); btn.classList.add("spin");
  try {
    R = toRecords(await fetchRows());
    $("err").hidden = true;
    const t = new Date().toLocaleString("ms-MY", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    $("upd").innerHTML = `<i class="ti ti-clock"></i> Kemaskini terakhir: <b>${t}</b>`;
    draw();
  } catch (e) {
    $("err").hidden = false;
    $("err").innerHTML = `<b>Gagal ambil data.</b> ${esc(e.message)}${R.length ? " Data sebelum ini masih dipaparkan." : ""}`;
    if (!R.length) $("upd").textContent = "Tiada data";
  } finally { btn.classList.remove("spin"); }
}

$("q").oninput = e => { S.q = e.target.value; draw(); };
$("reload").onclick = load;
load();
setInterval(load, CFG.REFRESH_MINUTES * 60 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
})();
