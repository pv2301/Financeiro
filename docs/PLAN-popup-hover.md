# PLAN-popup-hover

## Overview
Modify the financial details popup positioning and trigger behavior across the Monthly Processing tables. The user requested that the popup should be positioned below the net value (Líquido) instead of to its left, to avoid overlapping other columns (such as 'Vencimento' or 'Boleto/Obs'). Additionally, the popup should only appear when hovering directly over the net value text, and not when hovering over other parts of the student's row.

## Project Type
**WEB**

## Success Criteria
1. The popup appears exactly below the net value text.
2. The popup does not overlap any student information to the left.
3. The hover trigger is restricted strictly to the net value element itself.
4. The popup is not clipped by any `overflow-hidden` properties on parent rows (`tr`).

## Tech Stack
- React / TypeScript
- Tailwind CSS (for positioning and styling: `top-full`, `mt-2`, `right-0`, etc.)

## File Structure
Changes will be applied to the following components:
- `src/components/MonthlyProcessing/FixedBillingTable.tsx`
- `src/components/MonthlyProcessing/IntegralBillingTable.tsx`
- `src/components/MonthlyProcessing/ConsumptionTable.tsx`

## Task Breakdown

### Task 1: Update FixedBillingTable.tsx
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`
- **Description:** 
  - Restrict the `group` hover trigger to only wrap the net value text and the popup (e.g., using an `inline-block relative group` wrapper).
  - Change popup positioning classes from `absolute top-0 right-full mr-4` to `absolute top-full mt-2 right-0`.
  - Check the parent `tr` for `overflow-hidden` and remove it if it causes the bottom-positioned popup to be clipped.
- **INPUT:** `src/components/MonthlyProcessing/FixedBillingTable.tsx`
- **OUTPUT:** Updated `FixedBillingTable.tsx`
- **VERIFY:** Hovering over the net value shows the popup below it without clipping or overlapping left columns.

### Task 2: Update IntegralBillingTable.tsx
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`
- **Description:** Apply the identical layout, hover restriction, and `overflow` adjustments as in Task 1.
- **INPUT:** `src/components/MonthlyProcessing/IntegralBillingTable.tsx`
- **OUTPUT:** Updated `IntegralBillingTable.tsx`
- **VERIFY:** Hovering over the net value shows the popup below it without clipping or overlapping left columns.

### Task 3: Update ConsumptionTable.tsx
- **Agent:** `frontend-specialist`
- **Skills:** `frontend-design`
- **Description:** Apply the identical layout, hover restriction, and `overflow` adjustments as in Task 1.
- **INPUT:** `src/components/MonthlyProcessing/ConsumptionTable.tsx`
- **OUTPUT:** Updated `ConsumptionTable.tsx`
- **VERIFY:** Hovering over the net value shows the popup below it without clipping or overlapping left columns.

## Phase X: Verification
- [ ] No clipping occurs on the popup when displayed below the row.
- [ ] Hover only activates when the cursor is over the specific net value, not the entire column or row.
- [ ] Run `npm run lint && npx tsc --noEmit` to ensure no errors.
- [ ] Start dev server to verify visually in all 3 tabs (Fixed, Integral, Consumption).

## ? PHASE X COMPLETE
- Lint: ? Pass
- Build: ? Success
- Date: 2026-05-02
