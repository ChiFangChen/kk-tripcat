import { Modal } from './Modal'

interface Props {
  onClose: () => void
}

export function UserMenu({ onClose }: Props) {
  return (
    <Modal title="帳號管理" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-500 text-center py-4">登入功能尚未啟用</p>
        <button className="btn btn-secondary w-full" onClick={onClose}>關閉</button>
      </div>
    </Modal>
  )
}
