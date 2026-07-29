import { Resource, ResourceType } from '../util/resources'

export const MOCK_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Invoice — Sample PDF',
    type: ResourceType.PDF,
    url: 'https://firebasestorage.googleapis.com/v0/b/music-with-susanna.appspot.com/o/users%2FCgOaIwnaE5TPVsiRrsB9krTaC092%2Ffiles%2F2026-07-27%20-%20Twinfog%20QC%20Ware%20Invoice_DkCHGYPUfD.pdf?alt=media&token=98aaf657-49b0-40b4-84cd-11919e2b9da8',
    fileName: 'invoice.pdf',
    tags: { scales: 'Scales', beginner: 'Beginner' },
    createdAt: '2026-07-27T10:00:00.000Z'
  },
  {
    id: '2',
    title: 'Minuet 3 — J. S. Bach',
    type: ResourceType.AUDIO,
    url: 'https://firebasestorage.googleapis.com/v0/b/music-with-susanna.appspot.com/o/users%2FCgOaIwnaE5TPVsiRrsB9krTaC092%2Ffiles%2F20%20Minuet%203%20%5BJ.%20S.%20Bach%5D_UAw3qRRVIN.mp3?alt=media&token=25c51400-6ed1-44f9-bfab-fe23f86d7c88',
    tags: { scales: 'Scales' },
    createdAt: '2026-03-15T14:30:00.000Z'
  },
  {
    id: '3',
    title: 'Lesson Photo',
    type: ResourceType.IMAGE,
    url: 'https://firebasestorage.googleapis.com/v0/b/music-with-susanna.appspot.com/o/users%2FCgOaIwnaE5TPVsiRrsB9krTaC092%2Ffiles%2F20240912_135617_BtXFvayhEC.jpg?alt=media&token=9d0899d1-e189-404c-bee6-a86649a08af5',
    tags: { technique: 'Technique', beginner: 'Beginner' },
    createdAt: '2024-09-12T13:56:17.000Z'
  },
  {
    id: '4',
    title: 'Violin Lesson — YouTube Demo',
    type: ResourceType.YOUTUBE,
    url: 'https://www.youtube.com/watch?v=FiZEZuCRTZI',
    tags: { suzuki: 'Suzuki', beginner: 'Beginner' },
    createdAt: '2026-01-10T09:00:00.000Z'
  }
]
