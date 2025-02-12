import ReactQuill, { Quill } from 'react-quill'
import { extractFileNameAndExtension, generateRandomAlphanumericString } from './string'
import { User } from './User'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../store/Firebase'
import { ImageResize } from 'quill-image-resize-module-ts'

const BlockEmbed = ReactQuill.Quill.import('blots/block/embed')
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

const ParchmentEmbed = ReactQuill.Quill.import('blots/block/embed')
class ImageWithSize extends ParchmentEmbed {
  static create(value: any) {
    const node = super.create(value)
    if (typeof value === 'string') {
      node.setAttribute('src', value)
    } else if (typeof value === 'object') {
      node.setAttribute('src', value.src)
      node.setAttribute('width', value.width)
    }
    return node
  }

  static value(domNode: any) {
    return {
      src: domNode.getAttribute('src'),
      width: domNode.getAttribute('width')
    }
  }
}
ImageWithSize.blotName = 'imageWithSize'
ImageWithSize.tagName = 'img'

ReactQuill.Quill.register(AudioBlot)
ReactQuill.Quill.register(PdfBlot)
ReactQuill.Quill.register(ImageWithSize, true)
ReactQuill.Quill.register('modules/imageResize', ImageResize)

const ALLOWED_UPLOAD_FILE_TYPES = ['image/*', 'audio/*', 'video/*', 'application/pdf']

export interface FileUploadProgress {
  fileName: string
  progress: number
}

export interface CancelToken {
  cancel?: () => void
}

export interface FileUploadParams {
  quill: ReactQuill
  user: User
  fileTypes?: string[]
  progressHandler?: (fileUploadProgress: FileUploadProgress) => void
  cancelToken?: CancelToken
}

export function handleFileUpload({
  quill,
  user,
  fileTypes = ALLOWED_UPLOAD_FILE_TYPES,
  progressHandler,
  cancelToken
}: FileUploadParams): Promise<void> {
  let promiseResolve: () => void = () => {}
  let promiseReject: (reason?: any) => void = () => {}

  const result = new Promise<void>((resolve, reject) => {
    promiseResolve = resolve
    promiseReject = reject
  })

  let shouldCancel = false
  if (cancelToken) {
    cancelToken.cancel = () => {
      shouldCancel = true
    }
  }

  const input = document.createElement('input')

  input.setAttribute('type', 'file')
  input.setAttribute('accept', fileTypes.join(', '))
  input.click()

  input.onchange = async () => {
    if (shouldCancel) {
      promiseReject('cancelled')
      return
    }

    const file: any = input?.files?.[0]
    if (file == null) {
      promiseReject('no file')
      return
    }

    const { name, extension } = extractFileNameAndExtension(file.name)

    const uniqueSuffix = generateRandomAlphanumericString(10)
    const cloudStoragePath = `users/${user.uid}/files/${name}_${uniqueSuffix}.${extension}`

    const fileRef = ref(storage, cloudStoragePath)
    const uploadTask = uploadBytesResumable(fileRef, file)

    if (cancelToken) {
      cancelToken.cancel = () => {
        shouldCancel = true
        uploadTask.cancel()
        promiseReject('cancelled')
      }
    }

    progressHandler?.({ fileName: file.name, progress: 0 })

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (shouldCancel) {
          return
        }
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        progressHandler?.({ fileName: file.name, progress })
        switch (snapshot.state) {
          case 'paused':
            break
          case 'running':
            break
        }
      },
      (error) => {
        // TODO: Modal with message and try again.
        console.error(error)
      },
      () => {
        if (shouldCancel) {
          return
        }
        // Handle successful uploads on complete
        // For instance, get the download URL: https://firebasestorage.googleapis.com/...
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadUrl) => {
            if (shouldCancel) {
              return
            }
            const range = quill.selection

            if (range?.index != null) {
              if (file.type.startsWith('image')) {
                quill.editor?.insertEmbed(range.index, 'image', downloadUrl)
              } else if (file.type.startsWith('audio') || file.type.startsWith('video')) {
                quill.editor?.insertEmbed(range.index, 'audio', {
                  url: downloadUrl
                })
              } else if (file.type === 'application/pdf') {
                quill.editor?.insertEmbed(range.index, 'pdf', {
                  url: downloadUrl
                })
              }
            }
            promiseResolve()
          })
          .catch((error) => {
            console.error(error)
          })
      }
    )
  }

  return result
}

export const QUILL_FORMATS = [
  // Inline
  'background',
  'bold',
  'color',
  'font',
  'code',
  'italic',
  'link',
  'size',
  'strike',
  'script',
  'underline',
  // Block
  'blockquote',
  'header',
  'indent',
  'list',
  'align',
  'direction',
  'code-block',
  // Embeds
  'formula',
  'image',
  'video',
  // Custom
  'audio',
  'pdf',
  'imageWithSize'
]

export const QUILL_MODULES = {
  toolbar: {
    container: [
      [{ header: [false, 1, 2, 3, 4] }, { font: [] as string[] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ color: [] as string[] }, { background: [] as string[] }],
      [{ align: [false, 'center', 'right', 'justify'] }],
      [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  },
  clipboard: {
    // toggle to add extra line breaks when pasting HTML:
    matchVisual: false
  },
  imageResize: {
    parchment: Quill.import('parchment'),
    modules: ['Resize', 'DisplaySize']
  }
}
