# Design System: Toools

## 1. Visual Theme & Atmosphere

A confident, tool-workshop atmosphere — like walking into a well-organized maker space where every instrument has its place. The interface is balanced between utility and craft: enough density to feel productive, enough whitespace to breathe. Layouts break symmetry with intention — left-aligned hero, asymmetric grids, staggered card heights. Motion is fluid but purposeful, spring-physics on interactive elements with subtle entrance cascades.

- **Density:** 6 — Daily App Balanced, leaning productive
- **Variance:** 7 — Offset Asymmetric, intentional grid breaks
- **Motion:** 6 — Fluid CSS transitions with spring-feel micro-interactions
- **Creativity:** 8 — Distinctive personality without being distracting

## Logo — 漆器描金 (Gold-Inlaid Lacquerware)

The logo references the single most premium Chinese craft pairing: aged gold on deep lacquer.
Three identical gold dots echo the three "o"s in Toools. No multi-color. One material. One surface.

### Logo Colors
- **玄漆 (Xuan Lacquer)** `#18181F` — Background. Cool-leaning near-black with a whisper of indigo depth, like aged lacquer under gallery light. The cool undertone prevents muddiness when paired with warm gold. NOT warm-muddy stone (#1C1917 ✗). NOT generic neutral (#111111 ✗).
- **古金 (Aged Gold)** `#C4A862` — Dot fill, all three identical. The color of Forbidden City gilt bronze after centuries — warm, matte, zero shininess. Saturation ~55%, luminance ~68%.

### Why This Combination
- **Temperature contrast**: cool dark + warm gold = visual tension without conflict (warm-on-warm = mud)
- **Material quality**: reads as a real surface, not a "color scheme"
- **Single accent**: one color does all the work — maximum restraint

### Logo Anti-Patterns
- No multi-color dots (traffic light) — one accent maximum
- No warm-toned backgrounds (#1C1917) — causes mud with warm accents
- No celadon/teal (#7FAAAF) — reads as generic "Asian themed"
- No vermillion (#C14332) — reads as Chinese restaurant menu
- No cream/off-white dots (#EDE6DA) — zero presence, unfinished
- Brand text "Toools" stays plain foreground — logo mark is the sole color carrier

## 2. Color Palette & Roles

- **Canvas** (#FAFAF9) — Primary background, warm stone-white
- **Surface** (#FFFFFF) — Card fills, elevated containers
- **Charcoal Ink** (#1C1917) — Primary text, Stone-900 depth
- **Warm Gray** (#78716C) — Secondary text, descriptions, metadata
- **Whisper Border** (#E7E5E4) — Card borders, structural lines, Stone-200
- **Subtle Fill** (#F5F5F4) — Muted backgrounds, filter chips, Stone-100
- **Amber Signal** (#D97706) — Single accent for CTAs, active states, focus rings, embeddable indicators. Saturation ~75%
- **Amber Wash** (#FEF3C7) — Light accent background for highlights, Amber-100
- **Destructive** (#DC2626) — Error states only

## 3. Typography Rules

- **Display:** Geist Sans — Track-tight (-0.025em), weight-driven hierarchy (800 for hero, 700 for section heads), scale via clamp(2rem, 5vw, 3.75rem) for hero
- **Body:** Geist Sans — Leading-relaxed (1.625), max 65ch, Stone-500 for secondary
- **Mono:** Geist Mono — For tool counts, metadata numbers, embed status badges
- **Banned:** Inter, Times New Roman, Georgia, generic serifs. No gradient text on headers

## 4. Component Stylings

### Buttons
- Primary: Amber-600 fill (#D97706), Stone-50 text, rounded-lg (0.5rem). Active: translate-y 1px (tactile push). No outer glow
- Secondary/Ghost: Transparent with Stone-200 border, Stone-700 text. Hover: Stone-100 fill
- Touch target minimum 44px

### Cards (Tool Cards)
- Surface white fill, 1px Stone-200 border, rounded-2xl (1rem)
- Shadow: `0 1px 3px rgba(28,25,23,0.04), 0 1px 2px rgba(28,25,23,0.02)` — barely-there elevation
- Hover: shadow intensifies to `0 4px 12px rgba(28,25,23,0.08)`, border transitions to Stone-300, translate-y -2px
- No equal-height constraint — let content determine card height naturally

### Category Cards
- Stone-50 fill, 1px Stone-200 border, rounded-xl
- Hover: Amber-50 background wash, border shifts to Amber-200
- Icon container: 40px rounded-lg with Stone-100 fill

### Inputs
- Label above, rounded-lg, Stone-200 border, Stone-50 background
- Focus: Amber-600 ring (2px), border transparent
- Placeholder: Stone-400

### Badges / Filter Chips
- Inactive: Stone-100 fill, Stone-500 text, rounded-full, no border
- Active: Amber-600 fill, white text
- Hover (inactive): Stone-200 fill

### Embed Container
- Full-width, rounded-xl overflow-hidden, 1px Stone-200 border
- Toolbar: Stone-50 background, subtle bottom border
- Loading: Skeleton shimmer in Stone-100/Stone-200 wave
- External fallback: Centered composition with large rounded icon, warm Stone-50 background

## 5. Layout Principles

- Max container width: 1280px centered (max-w-6xl)
- Hero section: Left-aligned on desktop (60/40 split or full-width left-aligned text), single column on mobile
- Tool grid: 2-column on tablet, 3-column on desktop — NOT equal height, use masonry-feel via auto-rows
- Category grid: 2-col mobile, 3-col tablet, 4-col desktop with gap-4
- Section spacing: clamp(3rem, 6vw, 5rem) vertical gaps
- Page padding: px-6 on mobile, px-8 on desktop
- CSS Grid over Flexbox for multi-column layouts
- Full-height sections: min-h-[100dvh] never h-screen

## 6. Motion & Interaction

- **Spring defaults:** transition-all duration-300 ease-out (CSS approximation of spring physics)
- **Card hover:** transform translateY(-2px) + shadow expansion, 200ms
- **Staggered entry:** Tool cards enter with 50ms cascade delay via CSS animation-delay
- **Page transitions:** Fade-in on mount, 300ms
- **Filter chips:** Scale 0.97 on active press, 150ms
- **Embed loading:** Skeleton pulse animation at 1.5s cycle
- **Hardware acceleration:** Only animate transform and opacity
- **Reduced motion:** Respect prefers-reduced-motion, disable all transforms

## 7. Anti-Patterns (Banned)

- No pure black (#000000) — use Charcoal Ink (#1C1917)
- No purple/blue neon accents
- No gradient text on headers
- No 3-column equal-height card grids (vary card content, use auto-rows)
- No centered hero layout — left-align or asymmetric split
- No overlapping elements
- No circular loading spinners — use skeletal shimmer
- No generic serif fonts
- No custom mouse cursors
- No "Scroll to explore" or bouncing chevrons
- No oversaturated colors (saturation cap 80%)
- No fabricated statistics or metrics
