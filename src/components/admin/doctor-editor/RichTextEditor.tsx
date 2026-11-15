"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { sanitizeBioHtml } from "@/lib/sanitize";
import { cn } from "@/lib/cn";

/**
 * Minimal rich text for the full bio: bold, italic and lists only. Output is
 * sanitised to the same allow-list the public page uses (and the server
 * sanitises again on save).
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  disabled,
  invalid,
}: {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Set the initial content once; afterwards the DOM is the source of truth
  // (re-setting innerHTML on every keystroke would move the caret).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  function exec(cmd: "bold" | "italic" | "insertUnorderedList" | "insertOrderedList") {
    ref.current?.focus();
    document.execCommand(cmd);
    emit();
  }
  function emit() {
    if (ref.current) onChange(sanitizeBioHtml(ref.current.innerHTML));
  }

  const btn = "flex size-9 items-center justify-center rounded-md hover:bg-accent disabled:opacity-40";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-card shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        invalid && "border-destructive",
      )}
    >
      <div className="flex gap-1 border-b border-line p-1" role="toolbar" aria-label="Formatting">
        <button type="button" className={btn} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} aria-label="Bold">
          <Bold className="size-4" />
        </button>
        <button type="button" className={btn} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} aria-label="Italic">
          <Italic className="size-4" />
        </button>
        <button type="button" className={btn} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} aria-label="Bulleted list">
          <List className="size-4" />
        </button>
        <button type="button" className={btn} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")} aria-label="Numbered list">
          <ListOrdered className="size-4" />
        </button>
      </div>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onPaste={(e) => {
          // Paste as plain text so foreign formatting can't sneak in.
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        className="prose-bio min-h-36 px-3 py-2.5 text-base outline-none md:text-sm"
      />
    </div>
  );
}
