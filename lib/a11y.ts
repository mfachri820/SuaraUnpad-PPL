import type { KeyboardEvent } from 'react';

// Untuk elemen non-button yang bisa diklik (mis. kartu feed yang di dalamnya ada tombol lain):
// Enter/Spasi menjalankan aksi yang sama dengan klik. Event dari elemen anak diabaikan.
export function activateOnKey(action: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };
}
