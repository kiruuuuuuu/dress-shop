# Print Retry Feature Implementation

## Overview
Implemented a comprehensive print status tracking and retry system for order bill printing. If a printer is unavailable or fails, the system now tracks the status and allows manual retry.

## Backend Changes

### 1. Database Schema
**File: `server/scripts/addNewFeatures.js` & `server/scripts/initDatabase.js`**

Added new columns to `orders` table:
- `print_status` (ENUM): 'pending', 'printing', 'completed', 'failed'
- `print_error` (TEXT): Error message if printing failed
- `printed_at` (TIMESTAMP): When printing was completed

Created new table:
- `print_history`: Tracks all print attempts with status, error messages, printer details, and timestamps

### 2. Printer Service
**File: `server/services/printerService.js`**

Enhanced `printOrderBill` function:
- Uses database transactions for atomic updates
- Updates order `print_status` at each stage (pending → printing → completed/failed)
- Records history in `print_history` table on success/failure
- Gracefully handles missing database columns for backward compatibility
- Fixed async/await pattern to prevent hanging

Added new function:
- `getPrintHistory(orderId)`: Fetches print attempt history for an order

### 3. Printer Controller
**File: `server/controllers/printerController.js`**

Added new endpoints:
- `GET /api/printers/history/:orderId`: Get print history for an order
- `POST /api/printers/retry/:orderId`: Retry printing a failed order (Admin/Manager only)

### 4. Checkout Controller
**File: `server/controllers/checkoutController.js`**

- Integrated printer service for automatic bill printing after order creation
- Added extensive logging for debugging
- Print failures don't fail the order

### 5. Server Startup
**File: `server/server.js`**

- Runs database migration on startup
- Automatically adds print columns if not present

## Frontend Changes

### 1. Type Definitions
**File: `client/lib/types.ts`**

Extended `Order` interface:
```typescript
print_status?: 'pending' | 'printing' | 'completed' | 'failed';
print_error?: string;
printed_at?: string;
```

### 2. Orders Dashboard
**File: `client/app/dashboard/orders/page.tsx`**

Added features:
- New "Print Status" column showing current print status with color coding
- Retry button appears when status is 'failed'
- Color scheme:
  - Gray: pending
  - Blue: printing  
  - Green: completed
  - Red: failed
- Manual retry function that calls `/api/printers/retry/:orderId`

## Workflow

### Automatic Printing
1. Order is created and payment verified
2. System attempts to find default printer (Admin/Manager configured)
3. If no printer: Status set to 'pending', order continues
4. If printer found: PDF generated and sent to printer
5. Status updated: 'printing' → 'completed' or 'failed'
6. Print history recorded

### Manual Retry
1. Admin/Manager views orders in dashboard
2. Sees failed print status with red badge
3. Clicks "Retry" button
4. System re-attempts printing with same logic
5. Status updates accordingly

## API Endpoints

### Get Print History
```http
GET /api/printers/history/:orderId
Authorization: Bearer <token>
```

### Retry Print
```http
POST /api/printers/retry/:orderId
Authorization: Bearer <admin/manager_token>
```

Response:
```json
{
  "success": true,
  "message": "Print retry initiated."
}
```

## Error Handling

The system is designed to be resilient:
- Missing database columns: Gracefully skipped with logging
- Printer unavailable: Status set to 'pending', no error thrown
- Print failure: Status set to 'failed', error message saved
- Email sending fails: Logged but doesn't affect order
- All errors wrapped in try-catch with proper cleanup

## Backward Compatibility

All changes are backward compatible:
- Existing orders without print_status default to null
- Database columns added conditionally (IF NOT EXISTS)
- Old API calls continue to work
- UI shows "N/A" for orders without print status

## Testing

To test the feature:
1. Create an order without configuring a printer → Status should be 'pending'
2. Manually trigger print without a printer → Status should be 'failed'
3. Click retry button → System attempts printing again
4. Configure a printer and retry → Should complete successfully

## Future Enhancements

Potential improvements:
- Bulk retry for multiple failed prints
- Print queue management
- Retry with exponential backoff
- Email/SMS notifications on print failures
- Real-time print status updates
- PDF preview before printing
