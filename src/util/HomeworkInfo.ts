import { v4 as uuidv4 } from 'uuid'

export enum HomeworkStatus {
  EDITING = 'editing',
  PUBLISHED = 'published'
}
export default interface HomeworkInfo {
  id: string
  content?: string
  editContent?: string
  status: string
  createdAt: string
  updatedAt?: string
  deletedAt?: string
  title?: string
}

export function removeUndefinedKeys(hw: HomeworkInfo): HomeworkInfo {
  hw.content ?? delete hw.content
  hw.editContent ?? delete hw.editContent
  hw.updatedAt ?? delete hw.updatedAt
  hw.deletedAt ?? delete hw.deletedAt
  hw.title ?? delete hw.title
  return hw
}

export function generateHomeworkTemplate(): HomeworkInfo {
  return {
    id: uuidv4(),
    editContent: '<h1>Title</h1><p>Write your notes here...</p>',
    createdAt: new Date().toISOString(),
    status: HomeworkStatus.EDITING
  }
}
