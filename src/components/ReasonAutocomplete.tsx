import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { COMMON_REASONS } from '../types'

interface Props {
  value: string
  onChange: (value: string) => void
  error?: boolean
  helperText?: string
}

/** Free-solo autocomplete: offers common Skatteverket-style trip reasons,
 *  but the user can type anything they like. */
export default function ReasonAutocomplete({ value, onChange, error, helperText }: Props) {
  return (
    <Autocomplete
      freeSolo
      options={COMMON_REASONS}
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
