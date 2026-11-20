import Link from "next/link";
import { ArrowRight, Building2, Hospital, Stethoscope, type LucideIcon } from "lucide-react";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { GET_STARTED_DIALOG as T } from "@/content/marketing";
import { cn } from "@/lib/cn";

const FORMS: { key: "doctor" | "clinic" | "hospital"; icon: LucideIcon }[] = [
  { key: "doctor", icon: Stethoscope },
  { key: "clinic", icon: Building2 },
  { key: "hospital", icon: Hospital },
];

const card =
  "group flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-[border-color,box-shadow,transform] hover:border-lagoon/50 hover:shadow-soft active:scale-[.99] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/20";

/**
 * The four ways to start (header dialog and /get-started): three self-fill
 * website forms and a WhatsApp enquiry. `onPick` closes the dialog.
 */
export function GetStartedOptions({ waHref, onPick, className }: { waHref: string; onPick?: () => void; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {FORMS.map(({ key, icon: Icon }) => (
          <li key={key}>
            <Link href={`/get-started/${key}`} onClick={onPick} className={cn(card, "h-full")}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lagoon/10 text-lagoon">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold text-ink">
                  {T.options[key].title}
                  <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </span>
                <span className="mt-0.5 block text-sm text-body/80">{T.options[key].text}</span>
              </span>
            </Link>
          </li>
        ))}
        <li>
          <WhatsAppLink href={waHref} placement="get_started" onClick={onPick} className={cn(card, "h-full")}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1f8f4e]/10 text-[#1f8f4e]">
              <WhatsAppIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{T.options.whatsapp.title}</span>
              <span className="mt-0.5 block text-sm text-body/80">{T.options.whatsapp.text}</span>
            </span>
          </WhatsAppLink>
        </li>
      </ul>
      <p className="text-sm text-body/80">{T.formNote}</p>
      <p className="border-t border-line pt-3 text-sm text-body">
        {T.continue}{" "}
        <Link href="/get-started/continue" onClick={onPick} className="font-semibold text-lagoon underline underline-offset-2 hover:text-ink">
          {T.continueLink}
        </Link>
      </p>
    </div>
  );
}
