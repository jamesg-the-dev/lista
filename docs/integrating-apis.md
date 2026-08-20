# Integrating API contracts with frontend

## Plan
let's go controller by controller and update the frontend contracts to adhere to these request and response interfaces. You will follow this order:
[x] 1. AccountController
[x] 2. RosterController
[x] 3. StaffController (LeaveRequestController folded in too — not on this
    list originally, but it's wired into the same manager-facing Staff
    Profile screen and returns/mutates the same StaffMemberDto.LeaveRequests
    data, so leaving it mocked would have silently broken leave request
    approve/decline once staff data came from the real API)
[skipped] 4. StaffShiftsController — entirely the staff mobile app's own
    view (GetMyShifts, RequestSwap, RespondToSwap, LinkAccount), covered by
    this doc's own "won't need to worry about... endpoints consumed by the
    mobile staff application" carve-out below. No frontend screen exists to
    wire it into yet either — CLAUDE.md's build order has the staff app
    (shift view + swap requests) at step 5, not started. Revisit once that
    screen is being built.
[x] 5. LabourCostController (trend + by-role wired; GetCostByVenueQuery
    left unwired — it's org-wide/cross-venue and the venue switcher has no
    "all venues" mode to show it in yet, matching a design note already in
    the frontend code predating this pass. Forecast-vs-actual's forecast
    side reuses RosterController's budget-summary endpoint, which already
    returns ForecastSalesTarget, rather than duplicating it here. Cost-by-
    role now groups by StaffMember.Classification, i.e. the real MA000009
    pay tier, since that's what GetCostByRoleQuery actually returns — the
    old mock grouped by a kitchen/floor/bar/manager "Role" concept that
    never had any backend representation)
[x] 6. ComplianceController (single endpoint —
    OverrideComplianceViolation. ShiftDto.complianceViolations was already
    real data from step 2's RosterController wiring, so this pass only
    wired the override-with-reason write path: ShiftEditorPanel's blocking-
    violation textarea is now editable and posts to
    /api/shifts/{id}/compliance-violations/{violationType}/override,
    invalidating the shifts query key only — an override doesn't change
    cost, so budgetSummary is left alone)
[ ] 7. SwapRequestController
[ ] 8. TimeSheetController
 
We won't need to worry about clocking in and out and any other endpoints that will be consumed by the mobile staff application. This task is all about making sure the typescript interfaces are generated and adhered to for all request and response payloads.

Once you have finished 1 controller, confirm with me before you continue