import {
  Button,
  Card,
  CardActions,
  CardProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress
} from '@mui/material'
import _ from 'lodash'
import { DeltaStatic, Sources } from 'quill'
import { MutableRefObject, useEffect, useRef, useState } from 'react'
import ReactQuill, { UnprivilegedEditor } from 'react-quill'
import { useUser } from '../store/UserProvider'
import {
  CancelToken,
  FileUploadProgress,
  QUILL_FORMATS,
  QUILL_MODULES,
  handleFileUpload
} from '../util/quill'

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
  const quillRef = useRef<ReactQuill | null>(null)
  const { user } = useUser()
  const [dialogOpen, setDialogOpen] = useState(false)
  const dialogCloseAction = useRef<(() => void) | null>(null)
  const handleDialogClose = () => {
    setDialogOpen(false)
    console.log(dialogCloseAction.current)
    dialogCloseAction.current?.()
  }
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadFileName, setUploadFileName] = useState<string>('')

  const fileUploadHandlerRef = useRef<() => any>(() => {})

  const modules: any = _.cloneDeep(QUILL_MODULES)
  modules.toolbar.handlers = { image: () => fileUploadHandlerRef.current() }
  // const [editorModules, setEditorModules] = useState(modules)
  const editorModules = useRef(modules)

  // TODO: Idea. Make only the handler a ref that changes based on the other moving parts.

  useEffect(() => {
    const fileUploadHandler = async () => {
      if (!quillRef.current) {
        return
      }
      const cancelToken: CancelToken = {}
      dialogCloseAction.current = () => cancelToken.cancel?.()
      try {
        await handleFileUpload({
          quill: quillRef.current,
          user,
          progressHandler: ({ fileName, progress }: FileUploadProgress) => {
            if (progress < 100 && !dialogOpen) {
              setDialogOpen(true)
            }
            setUploadFileName(fileName)
            setUploadProgress(progress)
          },
          cancelToken
        })
      } catch (error) {
        console.error(`error uploading: ${error}`)
      }
      dialogCloseAction.current = null
      handleDialogClose()
    }

    fileUploadHandlerRef.current = fileUploadHandler
  }, [user])

  return (
    <>
      <Card
        sx={{
          overflow: 'visible' // allow tooltips to span over the card
        }}
        {...props}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onValueChange}
          modules={editorModules.current}
          formats={QUILL_FORMATS}
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
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        sx={{ minWidth: 300 }}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">Uploading...</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Uploading file {uploadFileName} to the server.
          </DialogContentText>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} autoFocus>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
