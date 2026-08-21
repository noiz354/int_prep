import { useCallback, useEffect, useRef, useState } from 'react';

const initialDeviceState = {
  camera: 'idle',
  microphone: 'idle',
  network: 'idle',
  detail: 'Run a private check before entering the room.',
};

function networkState() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const downlink = Number(connection?.downlink || 0);
  if (!navigator.onLine) return { network: 'offline', detail: 'You are offline. Your checklist will be saved until you reconnect.' };
  if (downlink && downlink < 1.5) return { network: 'warning', detail: `Estimated ${downlink.toFixed(1)} Mbps. Video quality may adapt.` };
  return { network: 'ready', detail: downlink ? `Estimated ${downlink.toFixed(1)} Mbps. Connection looks suitable.` : 'Connection is online. A media path test will run when you join.' };
}

export function useDevicePreflight() {
  const [devices, setDevices] = useState(initialDeviceState);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const frameRef = useRef(null);
  const videoRef = useRef(null);

  const stopTest = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioContextRef.current?.close?.();
    audioContextRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setAudioLevel(0);
    setIsTesting(false);
  }, []);

  const startTest = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setDevices({ camera: 'unsupported', microphone: 'unsupported', ...networkState(), detail: 'This browser does not expose secure camera and microphone APIs.' });
      return;
    }
    stopTest();
    setIsTesting(true);
    setDevices((current) => ({ ...current, camera: 'checking', microphone: 'checking', ...networkState(), detail: 'Requesting camera and microphone access. Nothing is recorded.' }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const audioTrack = stream.getAudioTracks()[0];
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (audioTrack && AudioContext) {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = context;
        const data = new Uint8Array(analyser.fftSize);
        const sample = () => {
          analyser.getByteTimeDomainData(data);
          const mean = data.reduce((total, value) => total + Math.abs(value - 128), 0) / data.length;
          setAudioLevel(Math.min(100, Math.round(mean * 3.6)));
          frameRef.current = requestAnimationFrame(sample);
        };
        sample();
      }
      setDevices({ camera: 'ready', microphone: audioTrack ? 'ready' : 'warning', ...networkState(), detail: 'Camera and microphone are available. You can stop this private test at any time.' });
    } catch (error) {
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      setDevices({ camera: denied ? 'blocked' : 'error', microphone: denied ? 'blocked' : 'error', ...networkState(), detail: denied ? 'Permission was not granted. Allow camera and microphone access in your browser, then retry.' : 'We could not start a device test. Check your device and browser settings.' });
      setIsTesting(false);
    }
  }, [stopTest]);

  useEffect(() => {
    const update = () => setDevices((current) => ({ ...current, ...networkState() }));
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); stopTest(); };
  }, [stopTest]);

  return {
    devices,
    audioLevel,
    isTesting,
    videoRef,
    startTest,
    stopTest,
    ready: devices.camera === 'ready' && devices.microphone !== 'blocked' && devices.network === 'ready',
  };
}
