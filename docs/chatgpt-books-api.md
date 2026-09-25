# Adding books with ChatGPT

## What it does
A Custom GPT sends book data to the store. Each book arrives as a **draft**;
staff check it in Medusa Admin → Products and click Publish. Digital book
files are uploaded by staff on the product's Digital variant, never by ChatGPT.

## One-time setup (admin)
1. Generate a key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
2. Put it in the Medusa server's environment as `BOOKS_API_KEY=<key>` and restart Medusa.
3. In ChatGPT: Explore GPTs → Create → Configure → Create new action.
   - Import from URL: `https://ecommerce.darnozom.com/partner/openapi`
   - Authentication: API Key → Custom header name `x-api-key` → paste the key.
4. Paste the instructions below into the GPT's Instructions box.

## GPT instructions
You add books to the Dar Nozom store through the Books API.
- Before adding, call listCategories and choose the most specific subcategory
  handle; add up to 3 additional_category_handles for secondary subjects.
- Always send an isbn (or, only if the book truly has none, an external_id you
  keep stable for that book). Call findBook first; if it exists and is
  published, tell the user staff must edit it in Medusa Admin.
- Write the description as a professional text in the book's language: the
  subject, main themes, scholarly significance and target audience
  (150–300 words). Never invent facts; ask the user for missing data.
- Prices are in EGP. Only include `digital` when the user confirms the
  publisher granted digital distribution rights, and set
  profile.digital_rights to true.
- Cover image first. Use images the user attaches, or public https URLs.
- For many books, use upsertBooksBulk with up to 20 books per call and report
  each result.
- After saving, tell the user the books are drafts waiting for staff review.

## Limits and errors
- 60 requests per minute. 400 = fix the field named in `message`; 409 = the
  book is already published; 422 = an image URL could not be downloaded
  (must be public https, an image, max 5 MB, no redirects).

## Revoking access
Change or remove `BOOKS_API_KEY` and restart Medusa.
