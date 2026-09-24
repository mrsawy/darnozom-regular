# Bookstore Catalog Upgrade — Requirements

Source: client request from Tarek Ali (Dar Nozom), 2026-09-23, plus decisions
confirmed with the project owner on 2026-09-24.

## 1. Book record fields

Keep the existing fields (title, description, cover, prices, stock, status,
sales channel) and add:

- Author(s)
- Editor(s) or translator(s), if applicable
- Publisher
- ISBN
- Year of publication
- Edition number
- Number of pages and number of volumes
- Language of the book
- Main section and subcategory
- Additional subject categories
- Keywords
- Target audience
- Table of contents, if available
- Cover image and additional images
- Electronic file of the book, only if digital distribution rights are available

The description must be a professional text covering the book's subject,
themes, scholarly significance and target audience (editorial guidance, shown
to staff and to ChatGPT).

## 2. Scientific classification

Eight main sections, each with subcategories:

1. Islamic Law and Thought — الشريعة والفكر الإسلامي
2. Islamic Systems — النظم الإسلامية
3. Public Policies — السياسات العامة
4. Public Administration — الإدارة العامة
5. Management and Leadership — الإدارة والقيادة
6. Islamic Economics and Financial Transactions — الاقتصاد الإسلامي والمعاملات المالية
7. Islamic Sciences — العلوم الإسلامية
8. Children's, Young Adult, and Family Education Books — كتب الأطفال والناشئة والتربية الأسرية

- Sections and subcategories can be added/renamed/removed from the control
  panel (Medusa Admin → Products → Categories) without code changes.
- Users can search books by title, author, publisher, academic section,
  subject and keywords.

Decisions:
- Subcategories: we draft an initial Arabic/English list per section; staff
  edit it later in Medusa Admin.
- Existing categories are mapped: Shariah → Islamic Law and Thought,
  Management → Management and Leadership, Digital Transformation → a
  subcategory under Public Administration. Books move automatically; the two
  replaced categories are removed.

## 3. Print and digital editions

- A book can be print-only, digital-only, or both.
- No digital edition is created automatically for any book.
- Print and digital price and availability are separate.
- The digital file upload is secure: only the paying buyer can access it
  after payment is confirmed. (Already delivered: private storage, "My
  Library", access only for paid, non-cancelled orders.)

## 4. Storefront

- Book information displayed in an organized way; shopper chooses print or
  digital; related books shown.
- Search and filter by category, author and publisher.
- Works for Arabic and English books, with right-to-left Arabic support.

## 5. ChatGPT integration (API)

For adding dozens or hundreds of books: an API that lets ChatGPT create a book
record with its data, upload the cover, and set categories, prices and
inventory without filling the form by hand.

Decisions:
- Books created through the API are saved as drafts; staff review and publish
  them in Medusa Admin.
- The API never uploads the digital book file — staff upload it in Medusa
  Admin.
