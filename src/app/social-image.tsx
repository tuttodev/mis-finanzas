import { ImageResponse } from 'next/og';

export const socialImageSize = {
  width: 1200,
  height: 630,
};

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: '#0b0f17',
          color: '#eef1f7',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '62px 72px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'rgba(233, 186, 83, 0.18)',
            borderRadius: '999px',
            display: 'flex',
            height: '440px',
            position: 'absolute',
            right: '-100px',
            top: '-160px',
            width: '440px',
          }}
        />
        <div style={{ alignItems: 'center', display: 'flex', fontSize: 29, fontWeight: 700, gap: '16px' }}>
          <div
            style={{
              alignItems: 'center',
              background: '#e9ba53',
              borderRadius: '16px',
              color: '#1a1300',
              display: 'flex',
              fontSize: 30,
              height: '56px',
              justifyContent: 'center',
              width: '56px',
            }}
          >
            J
          </div>
          Jireh Finanzas
        </div>

        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', maxWidth: '820px' }}>
          <div style={{ color: '#e9ba53', display: 'flex', fontSize: 24, fontWeight: 600, marginBottom: '20px' }}>
            TUS FINANZAS, CON PROPÓSITO
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 72, fontWeight: 700, letterSpacing: '-3px', lineHeight: 1.08 }}>
            Ordena tu dinero. Vive con calma.
          </div>
        </div>

        <div
          style={{
            alignItems: 'center',
            background: '#131926',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '22px',
            display: 'flex',
            fontSize: 25,
            gap: '18px',
            padding: '20px 24px',
          }}
        >
          <div style={{ background: '#3ecf8e', borderRadius: '50%', display: 'flex', height: '14px', width: '14px' }} />
          Registra tus movimientos, visualiza tus presupuestos y alcanza tus metas.
        </div>
      </div>
    ),
    socialImageSize,
  );
}
