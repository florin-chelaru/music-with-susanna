import { Button, Card, CardActions, CardProps, useTheme } from '@mui/material'
import { DeltaStatic, Sources } from 'quill'
import { MutableRefObject, useEffect, useMemo, useRef } from 'react'
import ReactQuill, { UnprivilegedEditor } from 'react-quill'
import { storage } from '../store/Firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'
import { useUser } from '../store/UserProvider'

// const EDITOR_MODULES = {
//   toolbar: [
//     [{ header: [false, 1, 2, 3, 4] }, { font: [] as string[] }],
//     ['bold', 'italic', 'underline', 'strike', 'blockquote'],
//     [{ color: [] as string[] }, { background: [] as string[] }],
//     [{ align: [false, 'center', 'right', 'justify'] }],
//     [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
//     ['link', 'image', 'video'],
//     ['clean'],
//     handlers: {
//       image: this.imageHandler
//    }
//   ]
// }

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
  const quillRef = useRef<ReactQuill>()
  const { user, dispatch } = useUser()
  const EDITOR_MODULES = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [false, 1, 2, 3, 4] }, { font: [] as string[] }],
          ['bold', 'italic', 'underline', 'strike', 'blockquote'],
          [{ color: [] as string[] }, { background: [] as string[] }],
          [{ align: [false, 'center', 'right', 'justify'] }],
          [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
          ['link', 'image', 'video'],
          ['clean']
        ],
        handlers: {
          image: async () => {
            console.log('upload image')

            const input = document.createElement('input')

            input.setAttribute('type', 'file')
            input.setAttribute('accept', 'image/*')
            input.click()
            input.onchange = async () => {
              if (!quillRef.current?.editor) {
                console.log('no editor')
                return
              }
              const file: any = input?.files?.[0]
              const formData = new FormData()
              formData.append('file', file)

              console.log(file)
              console.log(formData)

              const fileRef = ref(storage, `users/${user.uid}/images/${uuidv4()}/${file.name}`)
              const snapshot = await uploadBytes(fileRef, file)
              // Upload completed successfully, now we can get the download URL
              const downloadUrl = await getDownloadURL(snapshot.ref)
              const range = quillRef.current.selection

              range?.index != null &&
                quillRef.current.editor.insertEmbed(range.index, 'image', downloadUrl)
              // quillRef.current.editor.clipboard.dangerouslyPasteHTML(`<img src=${downloadUrl} />`)
              console.log(downloadUrl)

              // TODO: Use a more robust upload instead: https://firebase.google.com/docs/storage/web/upload-files
            }
          }
        }
      }

      // image: {
      //   upload: function () {
      //     console.log('upload image')
      //   }
      // }
      // toolbar: {
      //   // header: [false, 1, 2, 3, 4],
      //   font: [] as string[]
      // }
    }),
    []
  )

  return (
    <Card
      sx={{
        overflow: 'visible' // allow tooltips to span over the card
      }}
      {...props}>
      <ReactQuill
        ref={quillRef as MutableRefObject<ReactQuill>}
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
