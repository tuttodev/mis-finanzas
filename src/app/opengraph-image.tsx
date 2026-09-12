import { createSocialImage, socialImageSize } from './social-image';

export const alt = 'Jireh Finanzas: finanzas claras para tu familia.';
export const size = socialImageSize;
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return createSocialImage();
}
