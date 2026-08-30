import { createSocialImage, socialImageSize } from './social-image';

export const alt = 'Jireh Finanzas: ordena tu dinero y vive con calma.';
export const size = socialImageSize;
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return createSocialImage();
}
