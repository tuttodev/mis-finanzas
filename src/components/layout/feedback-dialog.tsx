'use client';

import { useState } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { MessageSquare, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createFeedback } from '@/services/finance';
import { usePathname } from 'next/navigation';
import { analyticsPage, captureAnalytics } from '@/lib/analytics';

export function FeedbackDialog() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createFeedback({ message, pagePath: pathname });
      captureAnalytics('feedback_submitted', { page: analyticsPage(pathname) });
      setMessage('');
      setOpen(false);
      toast.success('¡Gracias! Tu feedback nos ayuda a mejorar Jireh Finanzas.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar el feedback');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => {
          captureAnalytics('feedback_opened', { surface: 'mobile' });
          setOpen(true);
        }}
        aria-label="Enviar feedback"
        title="Enviar feedback"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => {
          captureAnalytics('feedback_opened', { surface: 'desktop' });
          setOpen(true);
        }}
        className="fixed bottom-16 left-3 z-50 hidden w-[calc(15rem-1.5rem)] items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground md:flex"
      >
        <MessageSquare className="h-4 w-4" />
        Enviar feedback
      </button>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl outline-none">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogPrimitive.Title className="font-display text-lg font-semibold">Tu opinión cuenta</DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  Cuéntanos qué funciona bien o qué podríamos mejorar.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close
              type="button"
              aria-label="Cerrar"
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="feedback-message" className="text-sm font-medium">
                Feedback
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Por ejemplo: sería útil poder..."
                minLength={3}
                maxLength={2000}
                required
                autoFocus
                disabled={isSubmitting}
                className="mt-2 min-h-32 w-full resize-y rounded-lg border border-input bg-input/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/2000</p>
            </div>

            <div className="flex justify-end gap-2">
              <DialogPrimitive.Close
                type="button"
                disabled={isSubmitting}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                Cancelar
              </DialogPrimitive.Close>
              <Button type="submit" disabled={isSubmitting || message.trim().length < 3}>
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Enviando…' : 'Enviar'}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
