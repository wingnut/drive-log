import { useRef } from 'react'
import Button from '@mui/material/Button'
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined'
import { parseDriveLogCsv } from '../utils/csv'
import type { DriveLogEntry } from '../types'

interface Props {
  onImported: (entries: DriveLogEntry[], warnings: string[]) => void
}

export default function CsvImportButton({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const text = await file.text()
    const { entries, warnings } = parseDriveLogCsv(text)
    onImported(entries, warnings)
  }

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<UploadFileIcon />}
        onClick={() => inputRef.current?.click()}
      >
        Importera CSV
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </>
  )
}
