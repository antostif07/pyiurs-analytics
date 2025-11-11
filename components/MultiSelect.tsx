import { Label } from "@/components/ui/label"
import MultipleSelector, { Option } from "@/components/ui/multiselect"

export default function Multiselect({label, options, placeholder,onChange}: {label: string, options: Option[], placeholder?: string, onChange: ((options: Option[]) => void) | undefined}) {
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
        onChange={onChange}
      />
    </div>
  )
}
