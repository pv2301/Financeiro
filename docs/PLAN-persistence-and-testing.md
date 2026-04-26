# PLAN-persistence-and-testing.md

## 🎯 Objectives
1.  **DB-Backed Persistence**: Implement a mechanism to save and load "draft" data in the `MonthlyProcessing` page (absences, bank slips, notes) indexed by month/year.
2.  **Selection Persistence**: Standardize the `usePersistentSelection` hook across all pages (`Students`, `Invoices`, `MonthlyProcessing`).
3.  **Automated Testing**: Create a lightweight testing suite (Playwright) to verify persistence, modals, and core UI functions.
4.  **UI Consistency**: Ensure all edits reflect immediately in the UI without manual refresh.

---

## 🏗️ Phase 1: Database & API Hardening
- [ ] **Schema Definition**: Create a `processing_drafts` collection in Firebase.
    - Path: `processing_drafts/{month_year}` (Format: "MM-YYYY")
    - Content: `{ manualAbsences, bankSlipNumbers, manualDueDates, invoiceNotes, integralItems, removedStudentIds }`
- [ ] **Service Update**: Update `src/services/finance.ts` to include `saveProcessingDraft` and `getProcessingDraft`.
- [ ] **Auto-save Logic**: Implement a "Debounced Save" in `MonthlyProcessing.tsx` that triggers whenever draft values change.

## 🚀 Phase 2: Monthly Processing Refactor
- [ ] **Data Fetching**: Update `useEffect` in `MonthlyProcessing.tsx` to load draft data when the `monthYear` changes.
- [ ] **Checkbox Migration**: Switch `MonthlyProcessing.tsx` to use `usePersistentSelection('monthly_processing_selected_ids')`.
- [ ] **UI Sync**: Ensure `previewInvoices` is recalculated correctly after draft data is loaded from the DB.

## 📱 Phase 3: Global Persistence & UI Polish
- [ ] **Global Hooks**: Verify `usePersistentSelection` is correctly applied to `Students.tsx` and `Invoices.tsx`.
- [ ] **Immediate Refresh**: Verify that all modals (Edit Student, Mark Paid) correctly update the parent state/cache so the table updates instantly.

## 🧪 Phase 4: Automated Testing Suite
- [ ] **Setup**: Configure Playwright for the project.
- [ ] **Concise Tests**: Create `tests/ui-persistence.spec.ts` with the following tests (max 5 lines logic per test):
    1.  Test: Select item -> Navigate -> Return -> Verify checkbox is still checked.
    2.  Test: Open Modal -> Click Close -> Verify Modal is hidden.
    3.  Test: Edit value -> Save -> Verify table displays new value.
    4.  Test: (Monthly) Input absence -> Change Month -> Change Back -> Verify absence remains.

---

## 🛠️ Agent Assignments
| Agent | Task |
|-------|------|
| **backend-specialist** | Firebase service updates for processing drafts. |
| **frontend-specialist** | UI refactor in `MonthlyProcessing` and checkbox persistence. |
| **debugger** | UI/UX Audit and automated test implementation. |

---

## ✅ Verification Checklist
- [ ] Data entered in "Fechamento Mensal" persists after browser refresh.
- [ ] Data entered in "Fechamento Mensal" persists after changing the month and returning.
- [ ] Checkboxes in all pages remain selected after navigating between "Alunos" and "Faturas".
- [ ] Modals open/close smoothly without console errors.
- [ ] Automated tests pass in headless mode.
