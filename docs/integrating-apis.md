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
[ ] 4. StaffShiftsController
[ ] 5. LabourCostController
[ ] 6. ComplianceController
[ ] 7. SwapRequestController
[ ] 8. TimeSheetController
 
We won't need to worry about clocking in and out and any other endpoints that will be consumed by the mobile staff application. This task is all about making sure the typescript interfaces are generated and adhered to for all request and response payloads.

Once you have finished 1 controller, confirm with me before you continue