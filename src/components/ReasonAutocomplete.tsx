import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'

interface Props {
  value: string
  onChange: (value: string) => void
  /** Reasons to offer in the dropdown — typically everything already
   *  used in the log plus a small seed list, so it grows on its own as
   *  people log new kinds of trips. */
  options: string[]
  error?: boolean
  helperText?: string
}

/** Free-solo autocomplete: offers reasons already used elsewhere in the
 *  log (plus a small built-in seed list), but the user can always type
 *  something new. */
export default function ReasonAutocomplete({ value, onChange, options, error, helperText }: Props) {
  return (
    <Autocomplete
      freeSolo
      options={options}
      value={value}
      inputValue={value}
      onInputChange={(_e, newValue) => onChange(newValue)}
      onChange={(_e, newValue) => onChange(newValue ?? '')}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Anledning"
          placeholder="t.ex. Kundbesök hos ..."
          error={error}
          helperText={helperText}
          fullWidth
        />
      )}
    />
  )
}
