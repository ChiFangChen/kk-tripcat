import { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faTrash } from '@fortawesome/free-solid-svg-icons'
import { uploadImage, deleteImage } from '../utils/firebase'
import { generateId } from '../utils/id'

interface Props {
  imageUrl?: string
  storagePath: string  // e.g. "tc-images/shopping"
  onUploaded: (url: string) => void
  onRemoved: () => void
}

async function compressImage(file: File, maxWidth = 800): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8)
    }
    img.src = URL.createObjectURL(file)
  })
}

export function ImageUpload({ imageUrl, storagePath, onUploaded, onRemoved }: Props) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      const path = `${storagePath}/${generateId()}.jpg`
      const url = await uploadImage(path, compressed)
      onUploaded(url)
    } catch (err) {
      console.error('Upload failed:', err)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleRemove() {
    if (!imageUrl) return
    // Extract storage path from URL if possible
    try {
      const pathMatch = imageUrl.match(/o\/(.+?)\?/)
      if (pathMatch) {
        await deleteImage(decodeURIComponent(pathMatch[1]))
      }
    } catch {
      // ignore
    }
    onRemoved()
  }

  if (imageUrl) {
    return (
      <div className="relative mt-2">
        <img src={imageUrl} alt="" className="w-full rounded-lg max-h-48 object-cover" />
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs"
          onClick={handleRemove}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <FontAwesomeIcon icon={faCamera} className="mr-1" />
        {uploading ? '上傳中...' : '新增圖片'}
      </button>
    </div>
  )
}
