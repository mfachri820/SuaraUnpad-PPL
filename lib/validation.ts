import { z } from 'zod';
import { booleanFlag, optionalUuid, paginationSchema } from '@/lib/http';
import { ANNOUNCEMENT_PIN_DAYS } from '@/services/postService';
import { CLOSE_REASON_MAX, CLOSE_REASON_MIN, FLAG_NOTE_MAX } from '@/services/moderationService';
import { FMIPA_MAJORS } from '@/lib/fmipa';

type PinDays = (typeof ANNOUNCEMENT_PIN_DAYS)[number];
const PIN_DAYS_MESSAGE = `Durasi pin harus salah satu dari ${ANNOUNCEMENT_PIN_DAYS.join('/')} hari.`;

export const TITLE_MAX = 150;
export const POST_CONTENT_MAX = 5000;
export const COMMENT_CONTENT_MAX = 1000;

export const cloudinaryImageUrl = z
  .url({ message: 'URL gambar tidak valid.' })
  .refine((value) => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return false;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    return !cloudName || url.pathname.startsWith(`/${cloudName}/`);
  }, 'Gambar harus diunggah lewat fitur upload aplikasi.');

const trimmed = (max: number, label: string) =>
  z.string({ message: `${label} wajib diisi.` }).trim().max(max, `${label} maksimal ${max} karakter.`);

export const createPostSchema = z
  .object({
    title: trimmed(TITLE_MAX, 'Judul').optional().default(''),
    content: trimmed(POST_CONTENT_MAX, 'Isi postingan').optional().default(''),
    imageUrl: cloudinaryImageUrl.optional(),
    policyId: optionalUuid,
    kind: z.enum(['ASPIRASI', 'ANNOUNCEMENT']).optional().default('ASPIRASI'),
    pinDays: z
      .number({ message: PIN_DAYS_MESSAGE })
      .refine((days) => (ANNOUNCEMENT_PIN_DAYS as readonly number[]).includes(days), PIN_DAYS_MESSAGE)
      .transform((days) => days as PinDays)
      .optional()
  })
  .superRefine((data, ctx) => {
    if (!data.content && !data.imageUrl) {
      ctx.addIssue({ code: 'custom', path: ['content'], message: 'Isi postingan atau gambar wajib diisi.' });
    }
    if (data.kind === 'ANNOUNCEMENT' && data.title.length < 5) {
      ctx.addIssue({ code: 'custom', path: ['title'], message: 'Judul pengumuman wajib diisi (minimal 5 karakter).' });
    }
    if (data.kind === 'ANNOUNCEMENT' && !data.content) {
      ctx.addIssue({ code: 'custom', path: ['content'], message: 'Isi pengumuman wajib diisi.' });
    }
  })
  .transform((data) => ({
    ...data,
    title: data.title || data.content.split(/\s+/).slice(0, 5).join(' ') || 'Aspirasi Baru'
  }));

export const updatePostSchema = z
  .object({
    title: trimmed(TITLE_MAX, 'Judul').min(1, 'Judul tidak boleh kosong.').optional(),
    content: trimmed(POST_CONTENT_MAX, 'Isi postingan').min(1, 'Isi postingan tidak boleh kosong.').optional()
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: 'Tidak ada data yang diubah. Kirimkan title atau content.'
  });

export const listPostsQuerySchema = paginationSchema.extend({
  policyId: optionalUuid,
  authorId: optionalUuid,
  kind: z.enum(['ASPIRASI', 'ANNOUNCEMENT']).optional(),
  pinned: booleanFlag,
  excludePinned: booleanFlag
});

export const createCommentSchema = z.object({
  content: trimmed(COMMENT_CONTENT_MAX, 'Isi komentar').min(1, 'Isi komentar tidak boleh kosong.'),
  postId: optionalUuid,
  policyId: optionalUuid,
  parentId: optionalUuid
});

export const updateCommentSchema = z.object({
  content: trimmed(COMMENT_CONTENT_MAX, 'Isi komentar').min(1, 'Isi komentar tidak boleh kosong.')
});

export const listCommentsQuerySchema = paginationSchema.extend({
  postId: optionalUuid,
  policyId: optionalUuid
});

const flagTarget = {
  postId: optionalUuid,
  commentId: optionalUuid
};

function exactlyOneTarget(data: { postId?: string; commentId?: string }) {
  return !data.postId !== !data.commentId;
}

export const createFlagSchema = z
  .object({
    ...flagTarget,
    reason: z.enum(['SPAM', 'UJARAN_KEBENCIAN', 'PELECEHAN', 'HOAKS', 'TIDAK_RELEVAN', 'LAINNYA'], {
      message: 'Alasan laporan tidak valid.'
    }),
    note: z.string().trim().max(FLAG_NOTE_MAX, `Catatan maksimal ${FLAG_NOTE_MAX} karakter.`).optional()
  })
  .refine(exactlyOneTarget, { message: 'Pilih tepat satu konten yang dilaporkan (postId atau commentId).' });

export const flagTargetSchema = z
  .object(flagTarget)
  .refine(exactlyOneTarget, { message: 'Pilih tepat satu konten (postId atau commentId).' });

export const flagQueueQuerySchema = z.object({
  type: z.enum(['post', 'comment']).default('comment')
});

export const majorSchema = z.enum(FMIPA_MAJORS, {
  message: 'Program studi tidak valid. Pilih salah satu program studi FMIPA.'
});

export const closePostSchema = z.object({
  reason: z
    .string({ message: 'Alasan penutupan wajib diisi.' })
    .trim()
    .min(CLOSE_REASON_MIN, `Alasan penutupan minimal ${CLOSE_REASON_MIN} karakter.`)
    .max(CLOSE_REASON_MAX, `Alasan penutupan maksimal ${CLOSE_REASON_MAX} karakter.`)
});
