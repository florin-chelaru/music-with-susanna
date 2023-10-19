import { Button, Card, CardActions, CardProps, useTheme } from '@mui/material'
import { DeltaStatic, Sources } from 'quill'
import ReactQuill, { UnprivilegedEditor } from 'react-quill'

const EDITOR_MODULES = {
  toolbar: [
    [{ header: [false, 1, 2, 3, 4] }, { font: [] as string[] }],
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
  onPublish?(): void
  onDiscard?(): void
  onSave?(): void
}

export default function EditorCard({
  value,
  onValueChange,
  onPublish,
  onSave,
  onDiscard,
  ...props
}: EditorCardProps) {
  return (
    <Card
      sx={{
        overflow: 'visible' // allow tooltips to span over the card
      }}
      {...props}>
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

      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Button size="small" onClick={() => onDiscard?.()}>
          Trash
        </Button>
        <Button size="small" onClick={() => onSave?.()}>
          Save draft
        </Button>
        <Button size="small" onClick={() => onPublish?.()}>
          Publish
        </Button>
      </CardActions>
    </Card>
  )
}
