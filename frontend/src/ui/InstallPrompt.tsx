import { useEffect, useState } from 'react';
import { NjikoMark } from './NjikoMark';

// Shows a glass "Install Njiko" banner when the browser offers installation.
export function InstallPrompt() {
  const [evt, setEvt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onPrompt = (e: any) => { e.preventDefault(); setEvt(e); setShow(true); };
    const onInstalled = () => { setShow(false); setEvt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!show) return null;
  return (
    <div className="njk-install">
      <NjikoMark size={30} />
      <div className="njk-install-txt"><b>Install Njiko</b><span>Add to your home screen</span></div>
      <button className="njk-install-go" onClick={async () => { if (!evt) return; evt.prompt(); await evt.userChoice; setShow(false); }}>Install</button>
      <button className="njk-install-x" aria-label="Dismiss" onClick={() => setShow(false)}>✕</button>
    </div>
  );
}
