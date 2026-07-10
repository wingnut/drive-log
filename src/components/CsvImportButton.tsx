import { useRef } from 'react'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined'
import { parseDriveLogCsv } from '../utils/csv'
import type { DriveLogEntry } from '../types'

interface Props {
  onImported: (entries: DriveLogEntry[], baselineOdo: number, warnings: string[]) => void
}

const MERGE_BEHAVIOR_EXPLANATION =
  'Importerade resor läggs inte bara på i slutet — de vävs in bland befintliga resor efter datum. ' +
  'Delar en importerad resa datum med en befintlig hamnar den under den befintliga. Loggens nuvarande ' +
  'startvärde (baseline-ODO) behålls; filens eget startvärde används bara om loggen är helt tom.'

export default function CsvImportButton({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const text = await file.text()
    const { entries, baselineOdo, warnings } = parseDriveLogCsv(text)
    onImported(entries, baselineOdo, warnings)
  }

  return (
    <>
      <Tooltip title={MERGE_BEHAVIOR_EXPLANATION} placement="bottom" arrow>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<UploadFileIcon />}
          onClick={() => inputRef.current?.click()}
        >
          Importera CSV
        </Button>
      </Tooltip>
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
