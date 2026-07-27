export enum ResourceType {
  PDF = 'pdf',
  AUDIO = 'audio',
  IMAGE = 'image',
  YOUTUBE = 'youtube'
}

export interface Resource {
  id: string
  title: string
  type: ResourceType
  url: string
  fileName?: string
  tags: Record<string, string>
  createdAt: number
}
