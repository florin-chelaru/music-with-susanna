import { AttachmentType } from './AttachmentType'

export interface PrettyAttachment {
  type: AttachmentType | string
  url: string
  width: number
  height: number
  thumbnailUrl?: string
}

export interface PrettyPost {
  id: string
  url: string
  message?: string
  creationTime: string
  userName: string
  attachments: PrettyAttachment[]
}
