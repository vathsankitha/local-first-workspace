'use client';

export default function Toolbar({ editor }) {
  if (!editor) return null;
  const btn = (label, action, active, title) => (
    <button
      type="button"
      title={title || label}
      className={active ? 'tb active' : 'tb'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      {label}
    </button>
  );
  const c = () => editor.chain().focus();
  return (
    <div className="toolbar">
      {btn('B', () => c().toggleBold().run(), editor.isActive('bold'), 'Bold')}
      {btn('I', () => c().toggleItalic().run(), editor.isActive('italic'), 'Italic')}
      {btn('S', () => c().toggleStrike().run(), editor.isActive('strike'), 'Strikethrough')}
      <span className="sep" />
      {btn('H1', () => c().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
      {btn('H2', () => c().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
      <span className="sep" />
      {btn('• List', () => c().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet list')}
      {btn('1. List', () => c().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered list')}
      {btn('Quote', () => c().toggleBlockquote().run(), editor.isActive('blockquote'))}
      {btn('Code', () => c().toggleCodeBlock().run(), editor.isActive('codeBlock'), 'Code block')}
      <span className="sep" />
      {btn('Undo', () => c().undo().run(), false)}
      {btn('Redo', () => c().redo().run(), false)}
    </div>
  );
}
