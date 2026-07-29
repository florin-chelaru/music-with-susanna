// Manual mock for firebase/storage.
export const ref = jest.fn(() => ({}))
export const uploadBytesResumable = jest.fn()
export const getDownloadURL = jest.fn(() => Promise.resolve('https://example.com/file.pdf'))
export const deleteObject = jest.fn(() => Promise.resolve())
