// Manual mock for firebase/storage.
export const ref = jest.fn(() => ({}))
export const uploadBytesResumable = jest.fn()
export const getDownloadURL = jest.fn(() => Promise.resolve('https://example.com/file.pdf'))
export const deleteObject = jest.fn(() => Promise.resolve())
export const getMetadata = jest.fn(() => Promise.resolve({ size: 0 }))
export const listAll = jest.fn(() => Promise.resolve({ items: [], prefixes: [] }))
