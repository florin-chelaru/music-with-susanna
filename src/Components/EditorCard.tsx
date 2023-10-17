import { Card, CardActions, CardProps, IconButton, useTheme } from '@mui/material'
import { DeltaStatic, Sources } from 'quill'
import ReactQuill, { UnprivilegedEditor } from 'react-quill'
import FavoriteIcon from '@mui/icons-material/Favorite'
import ShareIcon from '@mui/icons-material/Share'
import SaveIcon from '@mui/icons-material/Save'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'

const EDITOR_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6] }, { font: [] as string[] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ color: [] as string[] }, { background: [] as string[] }],
    [{ align: [false, 'center', 'right', 'justify'] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    ['link', 'image', 'video'],
    ['clean']
  ]
}

interface EditorCardProps extends CardProps {
  value?: string
  onValueChange?(
    value: string,
    delta: DeltaStatic,
    source: Sources,
    editor: UnprivilegedEditor
  ): void
  onSave?(): void
}

export default function EditorCard({ value, onValueChange, onSave, ...props }: EditorCardProps) {
  const theme = useTheme()
  return (
    <Card
      sx={{
        overflow: 'visible' // allow tooltips to span over the card
      }}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onValueChange}
        modules={EDITOR_MODULES}
        style={{
          float: 'none',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      />

      <CardActions disableSpacing sx={{ justifyContent: 'flex-end' }}>
        <IconButton
          aria-label="publish homework draft"
          onClick={(e) => {
            e.preventDefault()
            onSave?.()
          }}>
          <SaveIcon />
        </IconButton>
      </CardActions>
    </Card>
  )
}
