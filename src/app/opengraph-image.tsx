import { createSocialImage, socialImageSize } from './social-image';

export const alt = 'Jireh Finanzas: finanzas personales de la mano de Dios.';
export const size = socialImageSize;
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return createSocialImage();
}
