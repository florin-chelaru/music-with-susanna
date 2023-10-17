import { Card, CardProps, useTheme } from '@mui/material'
import { DeltaStatic, Sources } from 'quill'
import ReactQuill, { UnprivilegedEditor } from 'react-quill'

const EDITOR_MODULES = {
  toolbar: [
    [{ header: [1, 2, false] }, { font: [] as string[] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ color: [] as string[] }, { background: [] as string[] }],
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
}

export default function EditorCard({ value, onValueChange, ...props }: EditorCardProps) {
  const theme = useTheme()
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'visible', // allow tooltips to span over the card
        minHeight: '300px',
        height: '100%'
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
    </Card>
  )
}
