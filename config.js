// Tetapan dashboard. Tukar di sini sahaja, tak perlu sentuh app.js.
window.IDME_CONFIG = {
  // ID Google Sheet (kod panjang antara /d/ dan /edit dalam URL)
  SHEET_ID: "1mx_L_tV3XbhyKrQ4FDJfrsykyscR4DglU5upLWzS95o",

  // gid tab sheet (nombor selepas gid= dalam URL)
  GID: "1334777880",

  // Berapa kerap dashboard semak data baru (saat). Minimum 1. Kalau keluar mesej "Google hadkan permintaan", naikkan nilai ini.
  REFRESH_SECONDS: 1,

  // Untuk ujian tanpa internet: letak "sample.csv". Biarkan "" untuk guna Google Sheet.
  LOCAL_CSV: "",

  // Had murid sekelas (nilai lebih dari ini ditanda merah)
  MAX_PER_CLASS: 35
};
