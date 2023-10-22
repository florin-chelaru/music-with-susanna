import { Button, Card, CardActions, CardProps, useTheme } from '@mui/material'
import { DeltaStatic, Sources } from 'quill'
import { MutableRefObject, useEffect, useMemo, useRef } from 'react'
import ReactQuill, { UnprivilegedEditor, Quill } from 'react-quill'
import { storage } from '../store/Firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'
import { useUser } from '../store/UserProvider'
import { Buffer } from 'buffer'

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

function uuidToStr(uuid: string): string {
  const bytes = Buffer.from(uuid, 'utf8')
  const base64 = bytes.toString('base64')
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return urlSafe
}

function strToUuid(s: string): string {
  const padded = s + '=='.slice(0, (s.length + 3) % 4)
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Buffer.from(base64, 'base64')
  return uuidv4({ random: bytes })
}

function generateRandomAlphanumericString(length: number): string {
  return Array.from(
    { length },
    () =>
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[
        Math.floor(Math.random() * 62)
      ]
  ).join('')
}

function getFileNameAndExtension(fullPath: string): { name: string; extension: string } {
  const lastIndex = fullPath.lastIndexOf('/')
  const fileNameWithExtension = fullPath.slice(lastIndex + 1)
  const lastDotIndex = fileNameWithExtension.lastIndexOf('.')

  if (lastDotIndex !== -1) {
    const name = fileNameWithExtension.slice(0, lastDotIndex)
    const extension = fileNameWithExtension.slice(lastDotIndex + 1)
    return { name, extension }
  }

  return { name: fileNameWithExtension, extension: '' }
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
  const quillRef = useRef<ReactQuill>()
  const { user, dispatch } = useUser()

  useEffect(() => {
    const BlockEmbed = Quill.import('blots/block/embed')

    class AudioBlot extends BlockEmbed {
      static create(value: any) {
        const node: HTMLElement = super.create()
        node.setAttribute('src', value.url)
        node.setAttribute('controls', '')
        node.style.width = '100%'
        const a = document.createElement('a')
        a.setAttribute('href', value.url)
        a.appendChild(document.createTextNode('download audio'))
        node.appendChild(a)
        return node
      }

      static value(node: any) {
        return {
          url: node.getAttribute('src')
        }
      }
    }
    AudioBlot.blotName = 'audio'
    AudioBlot.tagName = 'audio'

    class PdfBlot extends BlockEmbed {
      static create(value: any) {
        const node: HTMLElement = super.create()
        node.setAttribute('data', value.url)
        node.setAttribute('type', 'application/pdf')
        node.setAttribute('width', '100%')
        node.setAttribute('height', '600px')
        const a = document.createElement('a')
        a.setAttribute('href', value.url)
        a.appendChild(document.createTextNode('download pdf'))
        node.appendChild(a)
        return node
      }

      static value(node: any) {
        return {
          url: node.getAttribute('data')
        }
      }
    }
    PdfBlot.blotName = 'pdf'
    PdfBlot.tagName = 'object'

    Quill.register(AudioBlot)
    Quill.register(PdfBlot)
  }, [])

  // ReactQuill.Quill.register() // <-- this is how we add a custom button for audio
  // better idea: use the image upload button to allow uploading audio and pdf
  // pdf: https://www.w3docs.com/tools/code-editor/1085
  // audio: <audio controls="" src="..." style="width: 100%;"><a href="...">Description...</a></audio>
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
            console.log('upload file')

            const input = document.createElement('input')

            input.setAttribute('type', 'file')
            // input.setAttribute('accept', 'image/*')
            input.setAttribute('accept', 'image/*, audio/*, video/*, application/pdf')
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

              const { name, extension } = getFileNameAndExtension(file.name)
              const storagePath = `users/${
                user.uid
              }/files/${name}_${generateRandomAlphanumericString(10)}.${extension}`

              const fileRef = ref(storage, storagePath)
              const snapshot = await uploadBytes(fileRef, file)
              // Upload completed successfully, now we can get the download URL
              const downloadUrl = await getDownloadURL(snapshot.ref)
              const range = quillRef.current.selection

              if (range?.index != null) {
                if (file.type.startsWith('image')) {
                  quillRef.current.editor.insertEmbed(range.index, 'image', downloadUrl)
                  // quillRef.current.editor.clipboard.dangerouslyPasteHTML(`<img src=${downloadUrl} />`)
                } else if (file.type.startsWith('audio') || file.type.startsWith('video')) {
                  quillRef.current.editor.insertEmbed(range.index, 'audio', { url: downloadUrl })
                } else if (file.type === 'application/pdf') {
                  quillRef.current.editor.insertEmbed(range.index, 'pdf', { url: downloadUrl })
                }
              }
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
