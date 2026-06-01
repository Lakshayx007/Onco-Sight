# OncoPipeline Intelligence — Design Spec (CLAUDE.md)

## Project Identity
**Platform:** OncoPipeline Intelligence  
**Audience:** Pharma BD directors, medical directors, clinical operations leads, investors  
**Purpose:** Phase-wise drug intelligence for oncology clinical trials  
**Tone:** Authoritative, data-rich, trust-signaling — like IQVIA or Citeline, never like a generic AI dashboard

---

## Design Principles

1. **Data is the design.** Every visual element exists to communicate information. No decorative elements that don't carry meaning.
2. **Restrained motion.** Animations are intentional: funnel bars grow to show pipeline depth. Numbers count up to show scale. Cursor effects are subtle halos, not flashy. Nothing loops unless the user is interacting.
3. **Color encodes meaning.** Teal = active/good. Amber = warning/observational. Rose = terminated/risk. Blue = interventional. Muted = background context. Never use color purely for decoration.
4. **Density over whitespace.** Pharma stakeholders want information density. Cards are compact. Tables show 15 rows by default.
5. **Trust signals everywhere.** Every chart has a source line. Every number has a label. Last updated timestamp visible at all times.
6. **Clinical copy.** Labels are short and precise. "5,361 Distinct Assets" not "Unique Drug Assets Identified". "↓ 38% attrition Phase 1→3" not "There is a significant reduction in..."

---

## Forbidden Patterns (Never Use)

- ❌ Inter font — the #1 red flag for AI-generated sites. Use Space Grotesk instead.
- ❌ Generic blue (#3B82F6 as primary) — use as secondary only
- ❌ Heavy box shadows — use `box-shadow: 0 1px 3px rgba(0,0,0,0.4)` max
- ❌ Rounded-everything cards (`border-radius > 8px` on data cards)
- ❌ Gradient backgrounds that span the full page
- ❌ Loading spinners — use skeleton loaders
- ❌ Toast notifications that cover content
- ❌ Animations that exceed 600ms
- ❌ More than 2 animations triggered at the same time
- ❌ Generic pie charts — use donuts or the custom funnel
- ❌ Placeholder text in charts while loading — show skeleton bars

---

## Color Palette (Exactly 8 tokens)

```css
--bg-0: #0B1628;        /* primary background — deepest navy */
--bg-1: #0F1F3D;        /* header, sidebar background */
--bg-2: #152444;        /* card surface */
--bg-3: #1E3560;        /* hover elevated state */
--teal: #00D4AA;         /* primary accent — active, recruiting, positive */
--blue: #3B82F6;         /* secondary accent — interventional, phase fills */
--text-0: #F1F5F9;       /* primary text */
--text-1: #94A3B8;       /* secondary text, axis labels */
--text-2: #475569;       /* muted, subtitles */
--border: rgba(255,255,255,0.07); /* all dividers */
--amber: #F59E0B;        /* Phase 4, observational, caution */
--rose: #F43F5E;         /* terminated, withdrawn, risk */
```

---

## Typography

- **Display headings** (platform name only): `Playfair Display, serif` — weight 700
- **UI / all data**: `Space Grotesk, sans-serif` — weight 400/500/600
- **KPI numbers**: `JetBrains Mono, monospace` — weight 500, tabular nums
- **Never**: Inter, Roboto, Open Sans, Lato, Nunito

---

## Phase Colors (for funnel and charts)

```
Early Phase 1: #4ECDC4  (soft teal)
Phase 1:       #00D4AA  (teal)
Phase 2:       #3B82F6  (blue)
Phase 3:       #8B5CF6  (violet)
Phase 4:       #F59E0B  (amber)
```

---

## Motion Rules

| Element | Animation | Duration | Trigger |
|---|---|---|---|
| KPI numbers | Count-up from 0 | 1.5s ease-out | First scroll into view |
| Funnel bars | Width 0 → final | 0.8s staggered | First scroll into view |
| Chart render | Plotly built-in | 300ms | Cancer change |
| Section reveal | opacity 0→1, translateY 20→0 | 0.5s ease | IntersectionObserver |
| Chatbot cursor | Soft teal halo follows mouse | 0.15s lag | Inside chatbot area |
| Drug row hover | Left border slides in | 0.15s | Hover |
| Sidebar insight | Typing cursor reveal | character by character | After API returns |

---

## Micro-Interactions (One Per Section)

1. **KPI strip** — count-up animation + subtle teal pulse on hover per card
2. **Phase funnel** — funnel segments grow from 0 width on first view
3. **Drug intelligence** — row hover = teal left border + 2px lift, click = filter
4. **Geography tab** — hover country = pop tooltip with flag + count
5. **Chatbot section** — soft teal ambient cursor glow within chat container
6. **AI Insight panel** — typing cursor animation reveals text character by character

---

## Layout Structure

```
Header (60px sticky)
  └─ Logo | Cancer Dropdown | Filter Tags | Last Updated

Controls Bar (50px)  
  └─ Active filters displayed as dismissible chips

KPI Strip (120px)
  └─ 5 cards: Total Trials | Interventional | Distinct Assets | Patients | Countries

Dashboard Grid
  ├─ Left (68%)
  │   ├─ Phase Funnel Section (custom SVG + metrics table)
  │   ├─ Drug Intelligence Section (horizontal bar + sponsor stacked)
  │   └─ Analytics Tabs (Geography | Biomarkers | Status | Timeline)
  └─ Right Sidebar (30%)
      ├─ AI Pipeline Insight (Groq)
      ├─ Recent Research (PubMed RSS × 3)
      ├─ Ask the Data (Chatbot)
      └─ Power BI Report (link card)
```

---

## Plotly Dark Theme Template

All Plotly charts MUST use this base layout:
```javascript
paper_bgcolor: 'rgba(21, 36, 68, 0.0)'   // transparent — shows CSS bg
plot_bgcolor: 'rgba(21, 36, 68, 0.0)'
font: { family: 'Space Grotesk', color: '#94A3B8', size: 12 }
xaxis: { gridcolor: 'rgba(255,255,255,0.05)', linecolor: 'rgba(255,255,255,0.1)' }
yaxis: { gridcolor: 'rgba(255,255,255,0.05)', linecolor: 'rgba(255,255,255,0.1)' }
```

---

## What to Avoid in Every Component

- Do NOT use Bootstrap, Tailwind, Material UI — vanilla CSS only
- Do NOT use chart.js — Plotly.js only for consistency
- Do NOT add loading text "Fetching data..." — use skeleton divs
- Do NOT auto-play any animation — wait for IntersectionObserver
- Do NOT show error stack traces — show friendly "Data unavailable" states
- Do NOT hard-code cancer names — always dynamic from API
