# Customer-Based Shop Access System

## Overview
This system ensures that users only see shops they've been linked to via a Customer collection. There is no global "all shops" list.

## Key Rules

### 1. General Access Rule
- A user only sees shops linked to them in the Customer database
- Admins are automatically customers of their own shops
- There is no global "all shops" list

### 2. Link Parameter (`link_SHOPID`)
When a user opens with a link parameter (e.g., `link_abc123`):

**For Admins:**
- Admin is added to Customer list of the linked shop (if not already)
- Admin can access their admin tools + that shop's catalog
- Shop appears in their personal shop list

**For Non-Admins:**
- If user exists in Customer DB → link them to shop & load catalog
- If user doesn't exist in DB → auto-register as customer for that shop → load catalog
- Shop appears in their personal shop list

### 3. Start Parameter (Regular, no `link_` prefix)
When a user opens with a start parameter (e.g., `abc123`):

**For Admins:**
- Load Admin tools + personal shop list

**For Non-Admins:**
- If exists in Customer DB → show personal shop list + user profile page
- If not in DB → show "No shop interacted" message + "Create your own shop" button

## Implementation Details

### Database Structure

#### Customer Collection
```typescript
interface Customer {
  id: string
  telegramId: number
  firstName: string
  lastName: string
  username?: string
  linkedShops: string[]  // Array of shop IDs
  createdAt: Date
  updatedAt: Date
}
```

### User Flows

#### Flow 1: New User with Link Parameter
1. User clicks shop link → app opens with `link_SHOPID`
2. System detects link parameter
3. Creates Customer record with shop linked
4. Redirects to shop catalog
5. Shop now appears in user's shop list

#### Flow 2: Existing Customer with Link Parameter
1. User clicks shop link → app opens with `link_SHOPID`
2. System checks Customer record
3. Adds shop to `linkedShops` array if not present
4. Redirects to shop catalog
5. Shop now appears in user's shop list

#### Flow 3: New User with Start Parameter (Non-Admin)
1. User opens app with start parameter
2. System checks Customer DB → not found
3. Shows "No Shops Found" screen with option to create shop
4. User needs a link parameter to access shops

#### Flow 4: Admin Creating Shop
1. Admin creates new shop in Admin Panel
2. System automatically creates/updates Customer record
3. Links admin's telegramId to new shop
4. Admin can access shop as customer

#### Flow 5: Registered Admin Opening App
1. Admin opens app (with or without parameters)
2. System detects admin role from users collection
3. Shows shop list (all shops they're linked to as customer)
4. Admin can switch to Admin Panel view

## Key Files Modified

### 1. `/src/types/index.ts`
- Added `Customer` interface
- Renamed old `Customer` to `ShopCustomer` (for shop-specific customer data)

### 2. `/src/App.tsx`
- Added `paramType` state to distinguish `link` vs `start` parameters
- Added `showNoShopsMessage` state
- Modified `checkUserInDatabase()` to:
  - Check if user is admin
  - Handle link parameters (auto-create/link customer)
  - Handle start parameters (strict customer check)
  - Show appropriate view based on user type
- Added `createCustomerAndLinkShop()` function
- Added "No Shops Found" UI component

### 3. `/src/components/ShopList.tsx`
- Modified `fetchUserData()` to query Customer collection
- Replaced `fetchAllActiveShops()` with `fetchLinkedShops()`
- Only shows shops from user's `linkedShops` array
- Shows error if no linked shops found

### 4. `/src/components/AdminPanel.tsx`
- Modified shop creation handler
- Auto-creates/updates Customer record when shop is created
- Links admin's telegramId to new shop via `linkedShops` array

### 5. `/src/components/UserRegistration.tsx`
- Simplified to only handle actual user registration
- Removed "no shops" message (now in App.tsx)

## Parameter Format

### Link Parameter (Auto-Registration Allowed)
```
Format: link_SHOPID or link_SHOPID_PRODUCTID
Example: link_abc123 or link_abc123_product456
```

### Start Parameter (Strict Customer Check)
```
Format: SHOPID or SHOPID_PRODUCTID
Example: abc123 or abc123_product456
```

## Testing Scenarios

### Scenario 1: New User Clicks Shop Link
- URL: `?link=abc123`
- Expected: Customer created, linked to shop, catalog shown

### Scenario 2: Existing Customer Clicks New Shop Link
- URL: `?link=xyz789`
- Expected: Shop added to linkedShops, catalog shown

### Scenario 3: New User Opens with Start Param
- URL: `?shop=abc123`
- Expected: "No Shops Found" message shown

### Scenario 4: Admin Creates Shop
- Action: Create shop in Admin Panel
- Expected: Admin added to Customer collection with shop linked

### Scenario 5: Admin Opens App
- Expected: Shows shop list (all shops linked as customer)
- Can switch to Admin Panel view

## Benefits

1. **Privacy**: Users only see shops they've been given access to
2. **Security**: No global shop browsing
3. **Flexibility**: Admins can be customers of multiple shops
4. **Scalability**: Easy to manage shop access via Customer collection
5. **User Experience**: Clean, personalized shop list for each user
