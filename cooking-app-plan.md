# Cooking / Meal Prep / Nutrition Tool — Planning Document

Part of a personal web suite alongside the Spanish learning tool and workout tracker, sharing a common backend and database.

## Overview

A personal recipe library and meal planning tool built around how you actually cook: recipes pulled from TikTok, websites, your mom's cookbook photos, and your own trial-and-error creations, plus a component-based system for meals you build from interchangeable parts (protein + vegetable + grain, etc.). It handles weekly meal planning, grocery lists with pantry awareness, and starts with an onboarding page to capture food preferences and goals. AI features (parsing, macro estimation, suggestions) are planned as a later phase.

---

## Module 1: Onboarding — Preferences & Goals

A first-run page that captures baseline info used to personalize suggestions and filtering later.

**Food likes/dislikes & restrictions**
- Favorite ingredients, cuisines, and proteins
- Foods to avoid or dislike
- Allergies and intolerances
- Dietary patterns (vegetarian, gluten-free, dairy-free, etc.)

**Nutrition/health goals**
- Weight goal (lose/maintain/gain)
- Calorie and/or macro targets (or "not tracking this yet")
- General goals in plain language (e.g. "eat more protein," "cook more vegetables")

**Design notes**
- Should be editable later from a settings page, not just a one-time form
- Data collected here should be able to feed future filtering (e.g. hide recipes with disliked ingredients) even before AI features exist

---

## Module 2: Recipe Library — Data Model

The core entity. Needs to handle recipes of very different origins and quality levels without forcing you to fully structure something before saving it.

**Recipe fields**
- Title, source type (TikTok, website link, cookbook photo, original/self-developed), source link or photo attachment
- Ingredients (structured list: item, quantity, unit)
- Instructions/steps
- Tags (see Module 6)
- Notes (freeform — tweaks you made, "double the garlic next time," etc.)
- Photo(s) of the finished dish
- Rating and times-cooked counter (see Module 6)

**Capture states**
Recipes don't need to be fully structured to exist in the library. Support a status like:
- **Quick capture** — freeform notes or a raw link/photo saved with minimal structure, cleaned up later
- **Structured** — fully filled-out ingredients/steps

This matters because your stated workflow includes jotting something down messily now and formalizing it later.

---

## Module 3: Recipe Input Methods

Four ways recipes get added, in rough order of build complexity:

1. **Manual entry form** — structured fields for ingredients/steps. Build this first; everything else can fall back to it.
2. **Quick freeform capture** — a single text box (or link/photo drop) with no required structure, flagged for later cleanup. Low effort to build, high value for your actual habits.
3. **Photo upload with OCR/AI extraction** — snap a photo of your mom's cookbook page, extract text via OCR, and use AI to parse it into structured ingredients/steps for you to review and confirm.
4. **Paste a link and auto-parse** — for TikTok videos and online recipes, attempt to extract structured recipe data automatically (via page scraping for websites; TikTok is harder since the recipe often lives in a spoken caption or video, not text — may require transcript extraction or manual entry with the link just saved for reference).

**Sequencing note:** since AI features are a later phase (Module 8), build #1 and #2 first so the library is usable immediately. Treat #3 and #4 as functionally "AI parsing" features and schedule them alongside Module 8, even though photo/link *attachment* (without auto-parsing) can ship earlier.

---

## Module 4: Component-Based Meals

Models meals like "chicken thighs + rotating vegetable + rotating grain" without forcing every combination to be its own saved recipe.

**Structure**
- A **meal** can be either a single fixed recipe (Module 2) OR a composition of **components**
- A **component** is a category (protein, vegetable, grain, sauce/topping, etc.) that holds multiple interchangeable recipes (e.g. "grain" → rice pilaf, quinoa, roasted potatoes)
- When planning a meal built from components, you pick one recipe per component slot

**Why this matters for planning**
This is what makes the weekly planner (Module 5) able to say "chicken thighs again, but let's rotate to the roasted broccoli and farro this time" instead of treating every vegetable/grain pairing as a separate recipe to create and maintain.

**Build note:** this is a meaningful data-modeling decision to get right early, since meal planning and grocery lists both depend on it. Worth finalizing the schema before building Module 5.

---

## Module 5: Weekly Meal Planning

- Calendar/weekly grid view to assign meals (fixed recipes or component combos) to specific days/slots
- Ability to quickly swap a component (e.g. change the grain) without rebuilding the whole meal
- Carry-forward or repeat options for meals you eat often
- Should pull from the recipe library and respect Module 1 preferences where relevant (e.g. surfacing liked ingredients)

---

## Module 6: Servings & Leftovers Scheduling

Covers meals that make more than one sitting's worth of food — e.g. cooking dinner but making enough for tomorrow's lunch too.

**Core behavior**
- When planning/logging a meal, capture **servings made** vs. **servings per sitting**
- On save, the tool **auto-fills the next applicable slot** (typically the following day's lunch) with the leftover portion of that same meal
- Any servings beyond what's auto-assigned are tracked as a **remaining servings counter** on that cooked meal, so you can see at a glance what's left in the fridge and manually assign it to a slot whenever you want
- Auto-filled leftover slots should be easy to move or clear if plans change (e.g. you end up eating out that day)

**Data model implications**
- A planned/cooked meal instance needs: recipe/meal reference, date cooked, servings made, servings per sitting, servings remaining
- Meal plan slots (Module 5) need a way to reference "leftovers of [meal instance]" rather than just "recipe X," so the planner can distinguish a fresh-cooked meal from a leftover of one cooked earlier
- Decrementing the remaining-servings counter should happen automatically as each linked slot passes (or manually, if you want to correct for over/under-estimating how much you actually ate)

**Explicitly out of scope for now:** this does not affect grocery list quantities (Module 7) — that stays based on default recipe servings for now. Servings-aware grocery scaling is a possible future enhancement, noted below.

---

## Module 7: Organization & Discovery

As the library grows, needs multiple ways to find things:

- **Tags/categories** — cuisine, meal type (breakfast/dinner/snack), protein type, source type, difficulty, prep time
- **Ingredient search** — find recipes containing (or not containing) a given ingredient; useful for "what can I make with what I have"
- **Ratings & favorites** — star rating, favorite/go-to flag, and a times-cooked counter to naturally surface your regulars over one-off experiments

---

## Module 8: Grocery List

- Generates from the current week's meal plan
- **Combines duplicate ingredients** across meals into a single line with summed quantity (e.g. two recipes each needing an onion → "2 onions")
- Organized by grocery category (produce, protein, dairy, pantry, etc.) for easier in-store use
- **Pantry awareness**: maintain a simple pantry/staples inventory (things like olive oil, salt, rice you generally have on hand) so the generated list can exclude or de-emphasize items you already have, and so the list only shows what you actually need to buy
- Pantry inventory will need its own basic CRUD (add/remove/mark as "have it") — worth scoping as a small sub-feature rather than assuming it's automatic

---

## Module 9: AI Features (Future Phase)

Explicitly deprioritized until the core library, planning, and grocery list are solid. When picked up:

- **Recipe parsing** — TikTok link/transcript and cookbook photo → structured recipe (ties back to Module 3, items 3–4)
- **Macro/calorie estimation** — estimate nutrition per recipe or per component from ingredient list
- **Recipe suggestions** — recommend meals based on Module 1 preferences/goals, what's in the pantry, or what you haven't cooked in a while
- **Smart substitutions** — suggest component swaps within a meal (different vegetable, similar cook time)

**Note:** these features have real cost/complexity implications (OCR, LLM calls, possibly nutrition database lookups) — worth a dedicated technical spike before committing to scope here.

---

## Module 10: Technical Foundation

Since this shares a backend/database with the Spanish tool and workout tracker:

- Confirm whether recipes/meal plans get their own tables/schema or share infrastructure with the other tools (e.g. common user/auth system)
- Data model priorities to settle early: Recipe, Component, Meal, MealInstance (cooked, with servings tracking), MealPlan (week + day + slot), Ingredient, PantryItem, UserPreferences
- Image storage plan for cookbook photos and dish photos (recipe photos + OCR source images)
- Auth/session handling if this needs to be distinguishable from the other two tools in the suite, or if it's single-user only

### Stack Decision

Based on how this will actually be used (phone in the kitchen/grocery store, computer for planning ahead, free-to-start but room to grow), plus what's already in place (workout tracker live on Netlify, Spanish tool only on your computer so far):

- **Frontend hosting: Netlify** — you're already using it for the workout tracker, so one hosting account can serve all three tools instead of juggling providers.
- **Frontend framework: React (as a PWA — "installable" web app)** — makes the site usable like an app on your phone (add-to-homescreen icon, works reasonably even with a weak grocery-store signal), without needing to build/submit a separate iOS or Android app.
- **Backend + database: Supabase** — a free-to-start service that gives you a real database, user accounts/login, and file storage (for cookbook photos and dish pictures) without you having to manage a server yourself. It's a good fit specifically because the data model in `cooking-app-data-model.md` is relational (recipes, ingredients, meals, and plans all reference each other) — Supabase is built on Postgres, which handles that kind of linked data well. It also has a generous free tier and paid tiers that scale up smoothly if you get more users later.
- **Suite-wide implication:** the same Supabase project can eventually host the Spanish tool and workout tracker's data too, giving you one shared backend across all three, as originally envisioned — though migrating the already-live workout tracker is a separate, later decision and not required to start this app.

---

## Suggested Build Order

1. Technical foundation + data model (Module 10)
2. Onboarding page (Module 1)
3. Recipe library with manual entry + quick capture (Modules 2–3, items 1–2)
4. Component-based meal structure (Module 4)
5. Weekly meal planner (Module 5)
6. Servings & leftovers scheduling (Module 6)
7. Tags, search, ratings (Module 7)
8. Grocery list + pantry tracking (Module 8)
9. Photo/link capture with attachment only, no parsing yet (Module 3, items 3–4, non-AI portion)
10. AI phase: parsing, macros, suggestions (Module 9)

---

## Open Questions for Next Pass

- Single-user only, or should this support multiple household members with separate preferences?
- Any target platform constraint (mobile-friendly web, desktop-only, etc.)?
- Rough timeline/effort budget — is this a weekend-project pace or ongoing over months?
- Future enhancement candidate: should grocery list quantities eventually scale with planned servings (tying Module 6 into Module 8), once basic leftovers tracking is working?
