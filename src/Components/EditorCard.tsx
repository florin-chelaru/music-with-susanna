import {
  Button,
  Card,
  CardActions,
  CardProps,
  DialogContent,
  DialogContentText,
  LinearProgress
} from '@mui/material'
import _ from 'lodash'
import { DeltaStatic, Sources } from 'quill'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import ReactQuill, { UnprivilegedEditor } from 'react-quill'
import { LocaleContext, LocaleHandler, LocalizedData } from '../store/LocaleProvider'
import { useUser } from '../store/UserProvider'
import { SupportedLocale } from '../util/SupportedLocale'
import {
  CancelToken,
  FileUploadProgress,
  QUILL_FORMATS,
  QUILL_MODULES,
  handleFileUpload,
  insertResource
} from '../util/quill'
import {
  Resource,
  ResourceType,
  UploadConfirmData,
  addYouTubeResource,
  uploadResource
} from '../util/resources'
import InsertMediaDialog from './InsertMediaDialog'
import MultiActionDialog from './MultiActionDialog'

interface EditorCardTexts {
  trash: string
  saveDraft: string
  publish: string
  uploading: string
  uploadingDescription: (fileName: string) => string
  cancel: string
  homeworkTemplateTitle: string
  homeworkTemplateBody: string
}

const EN_US: EditorCardTexts = {
  trash: 'Trash',
  saveDraft: 'Save draft',
  publish: 'Publish',
  uploading: 'Uploading...',
  uploadingDescription: (fileName: string) => `Uploading file ${fileName} to the server`,
  cancel: 'Cancel',
  homeworkTemplateTitle: 'Title',
  homeworkTemplateBody: 'Write your notes here...'
}

const RO_RO: EditorCardTexts = {
  trash: 'La gunoi',
  saveDraft: 'Salvează ciornă',
  publish: 'Publică',
  uploading: 'Se încarcă...',
  uploadingDescription: (fileName: string) => `Se încarcă fișierul ${fileName} pe server`,
  cancel: 'Renunță',
  homeworkTemplateTitle: 'Titlu',
  homeworkTemplateBody: 'Introdu aici notițele...'
}

const TEXTS = new Map<SupportedLocale, LocalizedData>([
  [SupportedLocale.EN_US, EN_US],
  [SupportedLocale.RO_RO, RO_RO]
])

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
  resources?: Resource[]
  teacherId?: string
  studentId?: string
  onInsertResource?: (resource: Resource) => void
}

export default function EditorCard({
  value,
  onValueChange,
  onPublish,
  onSave,
  onDiscard,
  resources,
  teacherId,
  studentId,
  onInsertResource,
  ...props
}: EditorCardProps) {
  const localeManager = useContext<LocaleHandler>(LocaleContext)
  useMemo(() => localeManager.registerComponentStrings(EditorCard.name, TEXTS), [])
  const componentStrings = localeManager.componentStrings(EditorCard.name) as EditorCardTexts

  const quillRef = useRef<ReactQuill | null>(null)
  const { user } = useUser()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [insertDialogOpen, setInsertDialogOpen] = useState(false)
  const dialogCloseAction = useRef<(() => void) | null>(null)
  const handleDialogClose = () => {
    setDialogOpen(false)
    dialogCloseAction.current?.()
  }
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadFileName, setUploadFileName] = useState<string>('')

  const fileSelectedHandlerRef = useRef<(file: File) => Promise<void>>(async () => {})

  const modules: any = _.cloneDeep(QUILL_MODULES)
  modules.toolbar.handlers = { image: () => setInsertDialogOpen(true) }
  const editorModules = useRef(modules)

  useEffect(() => {
    fileSelectedHandlerRef.current = async (file: File) => {
      if (!quillRef.current) {
        return
      }
      const cancelToken: CancelToken = {}
      dialogCloseAction.current = () => cancelToken.cancel?.()
      try {
        await handleFileUpload({
          quill: quillRef.current,
          user,
          file,
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

        <CardActions>
          <Button size="small" onClick={() => onDiscard?.()}>
            {componentStrings.trash}
          </Button>
          <Button size="small" onClick={() => onSave?.()}>
            {componentStrings.saveDraft}
          </Button>
          <Button size="small" onClick={() => onPublish?.()}>
            {componentStrings.publish}
          </Button>
        </CardActions>
      </Card>
      <InsertMediaDialog
        open={insertDialogOpen}
        resources={resources ?? []}
        onClose={() => setInsertDialogOpen(false)}
        onInsert={(resource) => {
          if (quillRef.current) insertResource(quillRef.current, resource)
          onInsertResource?.(resource)
          setInsertDialogOpen(false)
        }}
        onUpload={(data: UploadConfirmData) => {
          setInsertDialogOpen(false)
          if (!teacherId) return
          if (data.mode === 'youtube') {
            void addYouTubeResource(teacherId, data.url, {
              title: data.title,
              tags: data.tags
            })
              .then((resourceId) => {
                const resource: Resource = {
                  id: resourceId,
                  title: data.title,
                  type: ResourceType.YOUTUBE,
                  url: data.url,
                  tags: data.tags,
                  createdAt: new Date().toISOString()
                }
                if (quillRef.current) insertResource(quillRef.current, resource)
                onInsertResource?.(resource)
              })
              .catch(console.error)
          } else {
            setUploadFileName(data.file.name)
            setUploadProgress(0)
            setDialogOpen(true)
            void uploadResource({
              teacherId,
              file: data.file,
              metadata: { title: data.title, tags: data.tags },
              onProgress: (p) => setUploadProgress(p)
            })
              .then((resource) => {
                if (quillRef.current) insertResource(quillRef.current, resource)
                onInsertResource?.(resource)
              })
              .catch(console.error)
              .finally(() => handleDialogClose())
          }
        }}
      />
      <MultiActionDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        sx={{ minWidth: 300 }}
        title={componentStrings.uploading}
        aria-describedby="alert-dialog-description"
        actions={[
          {
            label: componentStrings.cancel,
            onClick: handleDialogClose,
            autoFocus: true
          }
        ]}>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {componentStrings.uploadingDescription(uploadFileName)}
          </DialogContentText>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </DialogContent>
      </MultiActionDialog>
    </>
  )
}
