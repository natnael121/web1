# Firebase Security Rules

This folder contains the Firebase security rules for the multi-shop Telegram mini app.

## Files

- `firestore.rules` - Firestore database security rules
- `storage.rules` - Firebase Storage security rules

## Deployment

To deploy these rules to your Firebase project, use the Firebase CLI:

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Storage Rules
```bash
firebase deploy --only storage:rules
```

### Deploy All Rules
```bash
firebase deploy --only firestore:rules,storage:rules
```

## Security Overview

### Firestore Rules

The Firestore rules implement role-based access control with the following roles:
- **Admin**: Full access to all resources and system configuration
- **Shop Owner**: Can manage their own shops, products, categories, and orders
- **Customer**: Can view products and manage their own orders

#### Collections Protected:
- **users**: Users can read all, create/update their own profile
- **shops**: Public read, shop owners can create/update their shops
- **categories**: Public read, shop owners can manage their categories
- **departments**: Shop owners can manage their departments
- **products**: Public read, shop owners can manage their products
- **orders**: Shop owners and customers can view/manage relevant orders
- **customers**: Shop owners can manage their customers
- **shop_customers**: Junction table for shop-customer relationships
- **crm_contacts**: Shop owners can manage their CRM contacts
- **crm_tags**: Shop owners can manage their tags
- **crm_message_templates**: Shop owners can manage their message templates
- **crm_auto_tag_rules**: Shop owners can manage their auto-tag rules
- **shop_links**: Public read, shop owners can manage their links
- **promotions**: Public read, shop owners can manage their promotions
- **analytics**: Shop owners can access their analytics

#### Key Security Features:
- All write operations require authentication
- Shop data can only be modified by shop owners or admins
- Data validation ensures required fields are present
- Prevents unauthorized access to other users' data
- Prevents unauthorized modification of shop ownership

### Storage Rules

The Storage rules protect uploaded files with the following controls:

#### Protected Paths:
- **users/{userId}**: User profile images (owner or admin only)
- **shops/{shopId}**: Shop logos and images (shop owner only)
- **products/{productId}**: Product images (shop owner only)
- **categories/{categoryId}**: Category images (shop owner only)
- **orders/{orderId}/payment**: Payment proof images (authenticated users)
- **promotions/{promotionId}**: Promotion images (shop owner only)
- **departments/{departmentId}**: Department icons (shop owner only)
- **temp/{userId}**: Temporary uploads (owner only, auto-delete after 24h)
- **public**: Public assets (read-only for users, write for admins)

#### Key Security Features:
- All images must be valid image MIME types
- Maximum file size: 10MB
- Public read access for product and shop images
- Write access restricted to owners or admins
- Temporary uploads isolated by user ID

## Testing

Before deploying to production, test your rules using the Firebase Emulator Suite:

```bash
firebase emulators:start
```

## Monitoring

Monitor rule usage and potential security issues in the Firebase Console:
- Go to Firebase Console > Firestore Database > Rules tab
- Go to Firebase Console > Storage > Rules tab
- Check the "Rules Playground" to test specific scenarios

## Best Practices

1. Always test rules in the emulator before deploying
2. Monitor rule usage and denied requests
3. Keep rules as restrictive as possible
4. Use helper functions to keep rules DRY
5. Validate data structure and types
6. Never trust client-side code for security
7. Regularly audit and update rules as features change
8. Use indexes for complex queries referenced in rules

## Notes

- These rules assume user roles are stored in the `/users/{uid}` document
- Shop ownership is determined by the `ownerId` field in the `/shops/{shopId}` document
- All date fields should use Firestore Timestamp type
- Rules are evaluated on every request, so keep them efficient
