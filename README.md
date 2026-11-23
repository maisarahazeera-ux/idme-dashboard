# Year 1 2027 Application Capacity Dashboard (PPD Johor Bahru)

A live dashboard built during my industrial training at Pejabat Pendidikan Daerah (PPD) Johor Bahru. It shows the Year 1 (Tahun 1) 2027 application data for every primary school in the district on one page, so officers can see straight away which schools are over capacity.

Before this, officers had to scroll through a shared Google Sheet of almost 100 schools and about 27 columns and compare the numbers by hand.

> The data contains school-level figures only, with no personal details of pupils.

![Summary section](screenshots/idme-summary.jpg)
![School list](screenshots/idme-schools.jpg)

## Features

- Reads data directly from the officers' shared Google Sheet and checks for new data every 2 minutes. There's no file to export or upload, and no server or PC that needs to stay on.
- Gives each school a status: over capacity (above 100%), nearly full (90–100%) or space available (below 90%)
- Calculates percentage filled, places left and average pupils per class
- Search by school name or code, with tabs to filter by school type (SK, SJK(C), SJK(T))
- Summary cards that also work as filters, a status donut chart and a citizenship summary
- School list sorted from the highest percentage. Show 20, 50 or 100 schools, and click a school to see its applications by age group and the approval breakdown (A to G)
- Three themes (Ceria, Asal, Gelap), saved in the user's browser
- Responsive layout, so it can be opened on a phone

## Tech stack

HTML, CSS and vanilla JavaScript. The data comes from Google Sheets through its CSV export link, using the Fetch API, and is parsed with PapaParse. Hosted on GitHub Pages.

## How it works

1. `app.js` downloads the sheet as CSV, adding a timestamp to the link so the browser doesn't return an old cached copy.
2. Columns are found by their **header names**, not their positions, so the dashboard still works if columns are moved. If a required column is renamed, it shows a clear error message.
3. The `JUMLAH` (total) row, empty rows and schools with a capacity of 0 are skipped automatically.
4. The dashboard recalculates the figures and redraws the page.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | Layout, colours and themes |
| `app.js` | Fetches the data and draws the dashboard |
| `config.js` | All settings in one place (Sheet ID, tab, refresh interval, class size limit), so no one needs to edit `app.js` |

## My contribution

I built this dashboard individually during my industrial training. I studied the sheet with the officers, decided which figures matter most, designed the layout over several rounds of feedback, and built and published it. I used AI coding tools for parts of the code, and reviewed and tested all of it before use.

## Run it locally

1. Open the folder in VS Code and install the **Live Server** extension.
2. Right-click `index.html` → **Open with Live Server**.

If you see a red "Gagal ambil data" (failed to fetch data) box:
- Check that the Google Sheet is shared as **Anyone with the link: Viewer**.
- Check `SHEET_ID` and `GID` in `config.js`.

## Rules for the Google Sheet

The dashboard reads columns by their header names. Columns can be reordered, but **don't rename these headers**:

- `Nama Sekolah` (must start with the school code, e.g. `JBA1001 SEKOLAH KEBANGSAAN ...`)
- `Kapasiti`
- `Bilangan Bilik Darjah`
- `Bil. Mohon 5+`, `Bil. Mohon 6+`
- `Jumlah Diluluskan (A)` to `Lewat / ASBS (G)`
- `Jumlah Ke Sek Lain`
- `Jumlah Lulus (A+B+C+D+E+F+G)`