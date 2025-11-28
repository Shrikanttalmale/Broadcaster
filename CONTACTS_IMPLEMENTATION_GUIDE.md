# 🎯 NEXT STEPS: Contacts Management Implementation

## Executive Summary

**Feature**: Complete Contacts Management (CRUD + Bulk Import)
**Priority**: 1 (Blocks other features)
**Estimated Time**: 2-3 days
**Status**: UI Ready (70%), API Needs Completion (40%)
**Impact**: HIGH - Required for Campaigns to work

---

## What We Have Now

### ✅ ContactsPage.tsx (90% Complete)
- Contact list display with search
- Add/Edit/Delete modals
- Bulk import from CSV
- Contact categories
- Search & filtering UI
- Pagination support

### ✅ Database Schema Ready
```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  phoneNumber TEXT NOT NULL UNIQUE,
  email TEXT,
  category TEXT,
  tags TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY(userId) REFERENCES users(id)
);
```

### ❌ What's Missing in API

```
GET /contacts                    - ✅ Implemented
POST /contacts                   - ❌ Stub only
GET /contacts/:id                - ⏳ Partially done
PUT /contacts/:id                - ❌ Stub only
DELETE /contacts/:id             - ❌ Stub only
POST /contacts/bulk-import       - ❌ NOT IMPLEMENTED
POST /contacts/export            - ❌ NOT IMPLEMENTED
GET /contacts/search             - ❌ NEEDS WORK
```

---

## Implementation Plan

### Phase 1: Core CRUD Operations (4 hours)

#### 1.1 POST /contacts - Create Single Contact
```typescript
Request:
{
  "name": "John Doe",
  "phoneNumber": "+919876543210",
  "email": "john@example.com",
  "category": "Leads",
  "tags": ["hot", "vip"],
  "notes": "Follow up next week"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "phoneNumber": "+919876543210",
    ...
  }
}
```

**Implementation Points:**
- Phone number validation (international format)
- Duplicate detection
- Input sanitization
- Error handling

#### 1.2 PUT /contacts/:id - Update Contact
```typescript
Request:
{
  "name": "John Smith",  // Can update any field
  "category": "Customer"
}

Response:
{
  "success": true,
  "data": { ... updated contact ... }
}
```

#### 1.3 DELETE /contacts/:id - Delete Contact
```typescript
Response:
{
  "success": true,
  "message": "Contact deleted"
}
```

#### 1.4 GET /contacts/:id - Get Single Contact
```typescript
Response:
{
  "success": true,
  "data": { ... contact details ... }
}
```

### Phase 2: Bulk Operations (6 hours)

#### 2.1 POST /contacts/bulk-import - Import CSV
```typescript
Request (multipart/form-data):
- file: CSV file with columns: name, phoneNumber, email, category
- skipDuplicates: boolean (default: true)
- updateIfExists: boolean (default: false)

Response:
{
  "success": true,
  "data": {
    "imported": 450,
    "skipped": 25,
    "failed": 5,
    "errors": [
      { row: 10, error: "Invalid phone number" },
      ...
    ]
  }
}
```

**CSV Format Expected:**
```
name,phoneNumber,email,category
John Doe,+919876543210,john@example.com,Leads
Jane Smith,+919876543211,jane@example.com,Leads
```

**Implementation Points:**
- CSV parsing
- Phone number normalization
- Batch database insert
- Transaction handling
- Error reporting

#### 2.2 POST /contacts/export - Export CSV
```typescript
Query Params:
- format: "csv" | "json"
- filter: category filter (optional)
- tags: tag filter (optional)

Response:
File download (CSV or JSON)
```

### Phase 3: Search & Filter (4 hours)

#### 3.1 GET /contacts?search=john&category=Leads
```typescript
Query Params:
- search: string (searches name, phone, email)
- category: string
- tags: string[]
- limit: number (default: 20)
- offset: number (default: 0)

Response:
{
  "success": true,
  "data": {
    "contacts": [...],
    "total": 1250,
    "limit": 20,
    "offset": 0
  }
}
```

### Phase 4: Validation & Error Handling (4 hours)

#### 4.1 Phone Number Validation
- Support international formats: +919876543210, +1-202-555-0173
- Normalize to international format
- Country-specific validation
- E.164 format conversion

#### 4.2 Email Validation
- Simple regex check
- Optional field
- Duplicate detection

#### 4.3 Name Validation
- Minimum 2 characters
- No special characters
- Trim whitespace

---

## Code Structure Example

### contacts.routes.ts Structure

```typescript
import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import { contactsService } from '../services/contacts.service';

const router = Router();

// GET all contacts
router.get('/', authMiddleware.verifyJWT, async (req, res) => {
  // Implementation
});

// POST create contact
router.post('/', authMiddleware.verifyJWT, async (req, res) => {
  // Validate input
  // Create contact
  // Return result
});

// PUT update contact
router.put('/:id', authMiddleware.verifyJWT, async (req, res) => {
  // Implementation
});

// DELETE contact
router.delete('/:id', authMiddleware.verifyJWT, async (req, res) => {
  // Implementation
});

// POST bulk import
router.post('/bulk-import', authMiddleware.verifyJWT, multer.single('file'), async (req, res) => {
  // Parse CSV
  // Validate each row
  // Batch insert
  // Return results
});

// POST export
router.post('/export', authMiddleware.verifyJWT, async (req, res) => {
  // Build CSV
  // Stream to client
});

export default router;
```

### services/contacts.service.ts

```typescript
class ContactsService {
  
  async createContact(userId: string, data: ContactData) {
    // Validate phone number
    // Check for duplicates
    // Insert to DB
    // Return contact
  }

  async updateContact(contactId: string, userId: string, data: Partial<ContactData>) {
    // Validate ownership
    // Validate input
    // Update DB
    // Return contact
  }

  async deleteContact(contactId: string, userId: string) {
    // Validate ownership
    // Delete from DB
  }

  async bulkImport(userId: string, csvData: string, options: ImportOptions) {
    // Parse CSV
    // Validate each row
    // Handle duplicates based on options
    // Batch insert
    // Return statistics
  }

  async searchContacts(userId: string, query: SearchQuery) {
    // Build SQL with filters
    // Execute query
    // Return paginated results
  }

  async exportContacts(userId: string, filters?: FilterOptions) {
    // Query contacts with filters
    // Convert to CSV/JSON
    // Return as file
  }
}
```

---

## Testing Checklist

- [ ] Create single contact
- [ ] Update existing contact
- [ ] Delete contact (verify not in list)
- [ ] Search by name
- [ ] Search by phone number
- [ ] Filter by category
- [ ] Bulk import 100 contacts from CSV
- [ ] Import with duplicates handling
- [ ] Export contacts to CSV
- [ ] Phone number validation (various formats)
- [ ] Duplicate phone number prevention
- [ ] Pagination works
- [ ] Error handling (invalid input, etc)

---

## File Size Estimates

After implementation:
- `contacts.routes.ts`: ~400-500 lines
- `contacts.service.ts`: ~300-400 lines
- Updated `database.service.ts`: +20-30 lines
- UI changes: Minimal (already done)

**Total New Code**: ~700-900 lines

---

## Success Criteria

✅ All CRUD operations working
✅ Bulk import supports CSV with 1000+ rows
✅ Search across name, phone, email
✅ Phone number validation working
✅ Duplicate prevention working
✅ Export to CSV working
✅ All error cases handled gracefully
✅ UI correctly shows imported contacts
✅ API returns proper error messages

---

## Dependencies & Libraries

Already available:
- ✅ express (routes)
- ✅ sqlite3 / better-sqlite3 (database)
- ✅ uuid (ID generation)
- ✅ multer (file upload - might need to add)

Need to add:
- csv-parse (CSV parsing) - `npm install csv-parse`
- fast-csv (CSV generation) - `npm install fast-csv`
- libphonenumber-js (phone validation) - `npm install libphonenumber-js`

**Install command:**
```bash
cd api
npm install csv-parse fast-csv libphonenumber-js
```

---

## Integration with Other Features

### After Contacts is Done:
1. **Templates** will reference contacts
2. **Campaigns** will use contacts for targeting
3. **Broadcasting** will send messages to contacts
4. **Analytics** will track per-contact metrics

**Timeline**: Contacts → Templates → Campaigns → Broadcasting → Analytics

---

## Effort Breakdown

| Task | Effort | Days |
|------|--------|------|
| Design & Planning | 2h | 0.25 |
| Core CRUD (4 endpoints) | 4h | 0.5 |
| Bulk Import | 4h | 0.5 |
| Bulk Export | 2h | 0.25 |
| Search & Filtering | 3h | 0.375 |
| Validation & Error Handling | 3h | 0.375 |
| Testing | 4h | 0.5 |
| Bug Fixes & Polish | 2h | 0.25 |
| **TOTAL** | **~24h** | **~3 days** |

---

## Quick Start: Begin Now

1. **Install dependencies:**
   ```bash
   cd api
   npm install csv-parse fast-csv libphonenumber-js
   ```

2. **Create services/contacts.service.ts** with core logic

3. **Update contacts.routes.ts** with all endpoints

4. **Add validation middleware** in utils/

5. **Test each endpoint** with Postman/curl

6. **Verify UI integration** works end-to-end

7. **Git commit** and push

**Estimated time to first working version**: 8-10 hours

---

**Ready to implement? Start with contacts.service.ts and build the business logic first!**
