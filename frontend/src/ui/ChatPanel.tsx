import { useEffect, useRef, useState } from 'react';
import { messages, send, uploadChatImage, type Message } from '../lib/chat';

/**
 * Customer <-> rider thread for one order. Text and photos.
 * Only opens once a rider is assigned; closes when the order is done.
 */
export function ChatPanel({ orderId, me, onClose }: { orderId: string; me: 'user' | 'rider'; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [canChat, setCanChat] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pull = () => messages(orderId)
    .then((r) => { setMsgs(r.messages); setCanChat(r.canChat); })
    .catch(() => {});

  useEffect(() => { pull(); const t = setInterval(pull, 3000); return () => clearInterval(t); }, [orderId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  async function submit() {
    const body = text.trim();
    if (!body || busy) return;
    setText(''); setBusy(true); setErr(null);
    try { await send(orderId, body, null); await pull(); }
    catch (e: any) { setErr(e.message); setText(body); }
    finally { setBusy(false); }
  }

  async function pickImage(f: File) {
    setBusy(true); setErr(null);
    try {
      const url = await uploadChatImage(f);
      await send(orderId, null, url);
      await pull();
    } catch (e: any) { setErr(e.message ?? 'Could not send photo'); }
    finally { setBusy(false); }
  }

  return (
    <div className="chat" onClick={onClose}>
      <div className="chat-card" onClick={(e) => e.stopPropagation()}>
        <div className="chat-top">
          <b>{me === 'user' ? 'Your rider' : 'Customer'}</b>
          <button className="chat-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="chat-body">
          {msgs.length === 0 && <div className="chat-empty">No messages yet. Say hello 👋</div>}
          {msgs.map((m) => (
            <div key={m.id} className={`bub ${m.sender_role === me ? 'mine' : 'theirs'}`}>
              {m.image_url && <img src={m.image_url} alt="" className="bub-img" />}
              {m.body && <span>{m.body}</span>}
              <i>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</i>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {err && <div className="chat-err">{err}</div>}

        {canChat ? (
          <div className="chat-bar">
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ''; }} />
            <button className="chat-clip" disabled={busy} onClick={() => fileRef.current?.click()} aria-label="Send photo">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none"><path d="M21 12.5l-8.5 8.5a5.5 5.5 0 01-7.8-7.8l9-9a3.7 3.7 0 015.2 5.2l-9 9a1.8 1.8 0 01-2.6-2.6l8.3-8.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <input className="chat-in" value={text} placeholder="Message…" disabled={busy}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
            <button className="chat-send" disabled={busy || !text.trim()} onClick={submit}>Send</button>
          </div>
        ) : (
          <div className="chat-closed">This chat is closed.</div>
        )}
      </div>
    </div>
  );
}
