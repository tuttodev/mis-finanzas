import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Code2, Heart, UsersRound } from 'lucide-react';
import { FaWhatsapp, FaYoutube } from 'react-icons/fa';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Conoce a nuestro fundador',
  description:
    'Conoce al fundador de Jireh Finanzas, su familia, propósito y el corazón detrás de la app.',
  alternates: {
    canonical: '/fundador',
  },
};

const whatsappUrl =
  'https://wa.me/573209645371?text=Hola%2C%20me%20gustar%C3%ADa%20hablar%20contigo%20sobre%20Jireh%20Finanzas.';

export default function FounderPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-7 sm:py-10">
      <header className="mb-7 px-1 sm:mb-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Ir al inicio de Jireh Finanzas">
          <Image src="/logo.png" alt="" width={34} height={34} className="object-contain" priority />
          <span className="font-display text-lg font-semibold tracking-tight">Jireh Finanzas</span>
        </Link>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-5 shadow-lg shadow-primary/5 sm:p-7">
        <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative grid items-center gap-7 sm:grid-cols-[0.8fr_1.2fr]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/20">
            <Image
              src="/fundadores-jireh.jpeg"
              alt="Los fundadores de Jireh Finanzas"
              fill
              priority
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-cover"
            />
          </div>
          <div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-semibold tracking-[0.18em] text-primary uppercase">Detrás de Jireh</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Una app creada con propósito
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
              Jireh Finanzas nació del deseo de ayudar a más personas a construir una relación sana,
              ordenada y esperanzadora con sus finanzas.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8" aria-labelledby="founder-title">
        <p className="text-sm font-semibold text-primary">Nuestro fundador y CEO</p>
        <h2 id="founder-title" className="mt-1 font-display text-2xl font-bold tracking-tight">
          Más de 8 años construyendo software con sentido
        </h2>
        <div className="mt-5 space-y-4 text-[15px] leading-7 text-muted-foreground">
          <p>
            Soy el fundador de {SITE_NAME} y desarrollador de software desde hace más de 8 años.
            Esta app une mi experiencia en tecnología con un deseo muy personal: que las personas
            puedan tomar mejores decisiones financieras con claridad y tranquilidad.
          </p>
          <p>
            Mi esposa y yo somos cristianos apasionados por Cristo. Somos esposos y padres de un
            hermoso niño, y seguimos a Jesús en cada área de nuestra vida. Nuestro propósito es
            acompañarte para que mejores tus finanzas de la mano del Señor Jesús.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Más sobre nuestro fundador">
        <article className="rounded-2xl border border-border bg-card p-5">
          <Code2 className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-4 text-base font-semibold">También enseño software</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Me encanta enseñar desarrollo de software. Soy creador de contenido en YouTube como
            <strong className="font-semibold text-foreground"> tuttodev</strong> y he creado dos cursos
            de desarrollo de software.
          </p>
          <a
            href="https://www.youtube.com/@tuttodev"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            <FaYoutube className="h-4 w-4 text-[#ff0000]" aria-hidden="true" />
            Visitar canal tuttodev
          </a>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="mt-4 text-base font-semibold">Una familia, una misión</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Creemos que cuidar de los recursos que Dios provee puede traer orden, libertad y más
            espacio para vivir con generosidad y propósito.
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-3xl border border-primary/20 bg-primary/10 p-6 text-center sm:p-8" aria-labelledby="contact-title">
        <FaWhatsapp className="mx-auto h-7 w-7 text-[#25D366]" aria-hidden="true" />
        <h2 id="contact-title" className="mt-3 font-display text-2xl font-bold tracking-tight">
          ¿Quieres hablar conmigo?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-muted-foreground">
          Si tienes preguntas, ideas o simplemente quieres conversar sobre Jireh Finanzas, escríbeme
          por WhatsApp. Con gusto te leo.
        </p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir WhatsApp: +57 320 964 5371"
          className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 sm:w-auto sm:max-w-none sm:px-5"
        >
          <FaWhatsapp className="h-5 w-5" aria-hidden="true" />
          <span className="sm:hidden">Abrir WhatsApp</span>
          <span className="hidden sm:inline">WhatsApp · +57 320 964 5371</span>
        </a>
      </section>
    </div>
  );
}
