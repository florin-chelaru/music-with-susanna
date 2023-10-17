import { v4 as uuidv4 } from 'uuid'

export enum HomeworkStatus {
  EDITING = 'editing',
  PUBLISHED = 'published'
}
export default interface HomeworkInfo {
  id?: string
  content?: string
  editContent?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string
  title?: string
}

export function generateHomeworkTemplate(): HomeworkInfo {
  const currentDate = new Date()
  const result = `<h1>Title</h1><p>Write your notes here...</p>`
  return {
    id: uuidv4(),
    editContent: result,
    createdAt: currentDate.toISOString(),
    status: HomeworkStatus.EDITING
  }
}
