import { Label } from "@/components/ui/label"
import MultipleSelector, { Option } from "@/components/ui/multiselect"

export default function Multiselect({label, options, placeholder}: {label: string, options: Option[], placeholder?: string}) {
  return (
    <div className="*:not-first:mt-2">
      <Label>{label}</Label>
      <MultipleSelector
        commandProps={{
          label: label,
        }}
        defaultOptions={options}
        placeholder={placeholder ?? ""}
        emptyIndicator={<p className="text-center text-sm">No results found</p>}
        onChange={(e) => console.log(e)}
      />
      <p
        className="mt-2 text-xs text-muted-foreground"
        role="region"
        aria-live="polite"
      >
        Inspired by{" "}
        <a
          className="underline hover:text-foreground"
          href="https://shadcnui-expansions.typeart.cc/docs/multiple-selector"
          target="_blank"
          rel="noopener nofollow"
        >
          shadcn/ui expansions
        </a>
      </p>
    </div>
  )
}
