import React, { useEffect, useRef, useState } from 'react';
import { MiningSolution } from './MiningSolution.jsx';
import { soundEnabled, setSoundEnabled, prepareDiscoverySound, stopDiscoverySound } from './foundry-sound.mjs';
import './discovery.css';
export function DiscoverySoundToggle() {
  const [enabled, setEnabled] = useState(soundEnabled);
  return <label className="discovery-sound"><input type="checkbox" checked={enabled} onChange={e => {
      setEnabled(e.target.checked);
      setSoundEnabled(e.target.checked);
      if (e.target.checked) prepareDiscoverySound();
    }} /> Discovery sound</label>;
}
export function DiscoveryDialog(props) {
  const dialog = useRef(null),
    [open, setOpen] = useState(true);
  useEffect(() => {
    const node = dialog.current;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
    return () => {
      if (node.open) node.close();
    };
  }, [open]);
  useEffect(() => () => stopDiscoverySound(), []);
  function dismiss() {
    if (props.busy) return;
    stopDiscoverySound();
    setOpen(false);
  }
  return <><button className="discovery-reopen" hidden={open} onClick={() => setOpen(true)}>Foundry found · Review mint →</button><dialog ref={dialog} className="discovery-dialog" aria-labelledby="discovery-title" onCancel={e => {
      e.preventDefault();
      dismiss();
    }}><div className="discovery-heading"><span aria-hidden="true">✦</span><p>PROOF OF WORK COMPLETE</p><h2 id="discovery-title">FOUNDRY FOUND!</h2><p>Your proof is ready. Confirm the mint to create your NFT.</p></div><button className="discovery-close" aria-label="Close discovery notification" disabled={!!props.busy} onClick={dismiss}>×</button><MiningSolution {...props} /><DiscoverySoundToggle /><p className="discovery-status" role="status">{props.busy ? `${props.busy}…` : props.error || ''}</p></dialog></>;
}
