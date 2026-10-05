import { useEffect, useId } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

export function RichTextEditor({ value, onChange, dir = "rtl", label }: { value: string; onChange: (html: string) => void; dir?: "rtl" | "ltr"; label: string }) {
  const labelId = useId();
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }), Image],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { dir, "aria-labelledby": labelId, class: "prose max-w-none min-h-[180px] p-3 focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [value, editor]);

  const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    const r = await adminFetch("/api/admin/upload-image?folder=cms", { method: "POST", body: fd });
    if (r.ok) editor?.chain().focus().setImage({ src: (await r.json()).url }).run();
  };

  const btn = (active: boolean) => `w-9 h-9 inline-flex items-center justify-center rounded ${active ? "bg-mist text-navy" : "text-ink-muted hover:bg-mist"}`;
  if (!editor) return null;
  return (
    <div className="border border-line rounded-[4px] bg-white">
      <span id={labelId} className="sr-only">{label}</span>
      <div className="flex flex-wrap gap-1 p-1 border-b border-line" role="toolbar" aria-label={`أدوات ${label}`}>
        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="عريض"><Bold className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="مائل"><Italic className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="عنوان 2"><Heading2 className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="عنوان 3"><Heading3 className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="قائمة نقطية"><List className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="قائمة مرقمة"><ListOrdered className="w-4 h-4" /></button>
        <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="اقتباس"><Quote className="w-4 h-4" /></button>
        <button
          type="button" className={btn(editor.isActive("link"))} aria-label="رابط"
          onClick={() => {
            const url = window.prompt("الرابط (https://…)", editor.getAttributes("link").href ?? "");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
        ><Link2 className="w-4 h-4" /></button>
        <label className={`${btn(false)} cursor-pointer`} aria-label="إدراج صورة">
          <ImagePlus className="w-4 h-4" />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
        </label>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} aria-label="تراجع"><Undo2 className="w-4 h-4" /></button>
        <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} aria-label="إعادة"><Redo2 className="w-4 h-4" /></button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
