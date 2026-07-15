# Cooking App — Data Model (v1)

Companion to `cooking-app-plan.md`. This defines the concrete entities and relationships for Module 10 (Technical Foundation) before any code is written.

## Entity Summary

| Entity | Purpose |
|---|---|
| User | Shared identity across the suite (Spanish tool, workout tracker, this app) |
| UserPreferences | Onboarding data — likes/dislikes, restrictions, goals |
| Ingredient | Master ingredient list, used for recipes, pantry, and grocery categorization |
| Recipe | A single dish or component recipe — the core content unit |
| RecipeIngredient | Join table: ingredient + quantity + unit, scoped to one recipe |
| Tag | Reusable label (cuisine, meal type, protein, difficulty, source) |
| RecipeTag | Join table: recipe ↔ tag |
| Component | A meal-building category, e.g. "Protein," "Vegetable," "Grain" |
| Meal | A plannable unit — either one fixed Recipe, or a composition of Component slots |
| MealComponentSlot | Join table: which Recipe fills which Component slot for a composed Meal |
| MealInstance | A specific cooking event of a Meal — tracks servings made/remaining |
| MealPlan | A user's plan for a given week |
| MealPlanSlot | One day+slot (e.g. Tue dinner) in a plan, pointing to a Meal or a leftover MealInstance |
| PantryItem | Staples the user has on hand |
| GroceryList / GroceryListItem | Generated shopping list for a MealPlan |

---

## Entity Detail

### User
- `id`, `email`, `name`, `created_at`
- Shared across the suite if using common auth; otherwise scoped to this app

### UserPreferences
- `user_id` (FK)
- `liked_ingredients[]`, `disliked_ingredients[]`
- `allergies[]`, `diet_restrictions[]` (e.g. vegetarian, gluten-free)
- `goals_text` (freeform, e.g. "eat more protein")
- `calorie_target`, `protein_target`, `carb_target`, `fat_target` (all nullable — not everyone tracks this)

### Ingredient
- `id`, `name`, `grocery_category` (produce, protein, dairy, pantry, frozen, other)
- Acts as the master list so ingredient search and grocery categorization stay consistent instead of every recipe storing raw ingredient strings

### Recipe
- `id`, `user_id`, `title`
- `source_type` (tiktok | website | cookbook_photo | original)
- `source_url`, `source_image_path` (nullable, depends on source_type)
- `instructions` (text or ordered steps)
- `servings_default`
- `capture_status` (quick_capture | structured) — per Module 2
- `notes` (freeform tweaks)
- `photo_path` (finished dish photo)
- `rating`, `times_cooked`
- `is_component_option` (bool), `component_id` (nullable FK) — marks this recipe as usable inside a Component category (e.g. this "roasted broccoli" recipe is a Vegetable option)
- `created_at`, `updated_at`

### RecipeIngredient
- `id`, `recipe_id`, `ingredient_id`, `quantity`, `unit`, `raw_text` (fallback for quick-capture recipes not yet fully parsed)

### Tag / RecipeTag
- `Tag`: `id`, `name`, `type` (cuisine | meal_type | protein | difficulty | source)
- `RecipeTag`: `recipe_id`, `tag_id`

### Component
- `id`, `name` (e.g. "Protein," "Vegetable," "Grain," "Sauce")
- Recipes flagged `is_component_option = true` with matching `component_id` are the selectable options for that category

### Meal
- `id`, `user_id`, `name`
- `meal_type` (fixed | composed)
- `recipe_id` (nullable — set only if `meal_type = fixed`)
- If `composed`, its structure lives in `MealComponentSlot`

### MealComponentSlot
- `id`, `meal_id`, `component_id`, `recipe_id`
- One row per filled slot, e.g. (Meal: "Chicken Bowl", Component: "Grain", Recipe: "Farro")

### MealInstance
*(new — supports Module 6, servings & leftovers)*
- `id`, `meal_id`, `date_cooked`
- `servings_made`, `servings_per_sitting`, `servings_remaining`
- Represents one real cooking event, not just a plan. Created when a MealPlanSlot is marked "cooked," or logged directly.

### MealPlan
- `id`, `user_id`, `week_start_date`

### MealPlanSlot
- `id`, `meal_plan_id`, `date`, `slot_type` (breakfast | lunch | dinner | snack)
- `meal_id` (nullable — a freshly planned meal)
- `meal_instance_id` (nullable — a leftover reference to an already-cooked MealInstance)
- `status` (planned | cooked | leftover | skipped)
- Exactly one of `meal_id` / `meal_instance_id` should be set at a time; leftovers auto-fill this via the logic in Module 6

### PantryItem
- `id`, `user_id`, `ingredient_id`, `status` (have | low | out), `updated_at`

### GroceryList / GroceryListItem
- `GroceryList`: `id`, `user_id`, `meal_plan_id`, `generated_at`
- `GroceryListItem`: `id`, `grocery_list_id`, `ingredient_id`, `quantity`, `unit`, `grocery_category`, `is_checked`
- Generation logic: pull `RecipeIngredient` rows for every Meal/MealComponentSlot in the plan's `MealPlanSlot`s, sum quantities per `ingredient_id`, subtract/flag anything already `have` in `PantryItem`, group by `grocery_category`

---

## Key Relationships (plain language)

- A **Recipe** can stand alone (a fixed Meal) or serve as one option within a **Component** category.
- A **Meal** is either one Recipe directly, or a set of **MealComponentSlot** picks — one per Component.
- Planning a week means filling **MealPlanSlot**s with either a **Meal** (something new) or a **MealInstance** (leftovers of something already cooked).
- Cooking a Meal creates a **MealInstance**, which is what actually tracks servings and drives the leftover auto-fill from Module 6.
- The **GroceryList** is derived, not manually maintained — it's a computed rollup of ingredients across a MealPlan's slots, adjusted by pantry status.

---

## Build Note

This schema is intentionally normalized around `Recipe` and `Ingredient` as the two foundational tables — get those two right first (including the `is_component_option` flag and `RecipeIngredient` join), since nearly everything else (components, meals, plans, grocery lists) references them. Suggested build sequence within this module:

1. `User`, `UserPreferences`
2. `Ingredient`, `Recipe`, `RecipeIngredient`, `Tag`, `RecipeTag`
3. `Component` + `is_component_option` on Recipe
4. `Meal`, `MealComponentSlot`
5. `MealPlan`, `MealPlanSlot`
6. `MealInstance` (leftovers)
7. `PantryItem`, `GroceryList`, `GroceryListItem`
