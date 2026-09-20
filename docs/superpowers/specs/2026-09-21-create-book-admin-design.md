# Create Book Admin Flow — Design

Approved: custom Create Book Admin form (fuller fields) + sidebar + Products list button; keep auto-add-book-editions subscriber as safety net.

## API
POST /admin/books — createProductsWorkflow with Book type_id, exclusive Format option, Paper/Digital variants (metadata.kind), prices, sales channel, thumbnail/images, paper inventory level.

## Admin UI
- Route /app/create-book (sidebar label Create Book)
- Widget product.list with Create Book button linking to that route
