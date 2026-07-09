import { useState, useRef, useCallback, useEffect } from 'react';

export type SerialStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AnalyzerData {
  fat: string;
  snf: string;
}

interface Options {
  baudRate?: number;
  onData: (data: AnalyzerData) => void;
  enabled: boolean;
}

function parseAnalyzerData(raw: string): AnalyzerData | null {
  // Machine format: (DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD)
  // Digits 0-3 = FAT x 100, digits 4-7 = SNF x 100
  const machineMatch = raw.match(/\((\d{20,})\)/);
  if (machineMatch) {
    const data = machineMatch[1];
    const fat = (parseInt(data.substring(0, 4), 10) / 100).toFixed(2);
    const snf = (parseInt(data.substring(4, 8), 10) / 100).toFixed(2);
    return { fat, snf };
  }

  // Fallback -- explicit labels: FAT:4.50 SNF:8.90
  const fatMatch = raw.match(/(?:fat|f)[=:\s]+(\d+\.?\d*)/i);
  const snfMatch = raw.match(/(?:snf|s)[=:\s]+(\d+\.?\d*)/i);
  if (fatMatch && snfMatch) {
    return { fat: fatMatch[1], snf: snfMatch[1] };
  }

  return null;
}

function getErrorMessage(err: any): string {
  const msg: string = err?.message ?? '';
  if (msg.includes('Failed to open')) return 'Port is already in use by another application. Close any other serial monitor tools and try again.';
  if (msg.includes('Access denied') || err?.name === 'SecurityError') return 'Access denied. Check that the site is opened over HTTPS and the port is not blocked.';
  if (msg.includes('disconnected') || err?.name === 'NetworkError') return 'Device disconnected. Check the USB cable and try again.';
  return `Connection failed: ${msg || err?.name || 'Unknown error'}`;
}

export function useSerialAnalyzer({ baudRate = 2400, onData, enabled }: Options) {
  const [serialStatus, setSerialStatus] = useState<SerialStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const enabledRef = useRef(enabled);
  const onDataRef = useRef(onData);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onDataRef.current = onData; }, [onData]);

  const disconnectMachine = useCallback(async () => {
    try {
      if (serialReaderRef.current) {
        await serialReaderRef.current.cancel();
        serialReaderRef.current = null;
      }
      if (serialPortRef.current) {
        await serialPortRef.current.close();
        serialPortRef.current = null;
      }
    } catch (_) {}
    setSerialStatus('disconnected');
    setErrorMessage('');
  }, []);

  useEffect(() => () => { void disconnectMachine(); }, [disconnectMachine]);

  const connectMachine = useCallback(async () => {
    if (!('serial' in navigator)) {
      const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
      const msg = isHttps
        ? 'Web Serial API is not available. Make sure you are using Google Chrome or Microsoft Edge (not Firefox or Safari).'
        : 'Web Serial API requires a secure connection. Please open the app using https:// instead of http://.';
      setErrorMessage(msg);
      setSerialStatus('error');
      return;
    }

    if (serialPortRef.current) await disconnectMachine();
    setSerialStatus('connecting');
    setErrorMessage('');

    try {
      const port = await (navigator as any).serial.requestPort();

      if (!port.readable) {
        await port.open({ baudRate });
      }

      serialPortRef.current = port;
      setSerialStatus('connected');

      const decoder = new TextDecoder('latin1');
      const reader = port.readable.getReader();
      serialReaderRef.current = reader;
      let buffer = '';

      const readLoop = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // eslint-disable-next-line no-control-regex
            const cleanChunk = decoder.decode(value, { stream: true }).replace(/\x00/g, '');
            if (!cleanChunk) continue;

            buffer += cleanChunk;
            // Silently discard — no logging for binary idle data

            if (buffer.length > 2048) {
              // Keep from the last '(' — it may be the start of a measurement packet
              const lastParen = buffer.lastIndexOf('(');
              buffer = lastParen >= 0 ? buffer.slice(lastParen) : '';
              continue;
            }

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !enabledRef.current) continue;
              const parsed = parseAnalyzerData(trimmed);
              if (parsed) {
                console.log('[Analyzer] FAT:', parsed.fat, 'SNF:', parsed.snf);
                onDataRef.current(parsed);
              }
            }

            const trimmedBuffer = buffer.trim();
            if (trimmedBuffer && enabledRef.current) {
              const parsed = parseAnalyzerData(trimmedBuffer);
              if (parsed) {
                console.log('[Analyzer] FAT:', parsed.fat, 'SNF:', parsed.snf);
                onDataRef.current(parsed);
                buffer = '';
              } else if (buffer.length > 512) {
                // Keep from the last '(' to avoid splitting a packet mid-stream
                const lastParen = buffer.lastIndexOf('(');
                buffer = lastParen >= 0 ? buffer.slice(lastParen) : '';
              }
            }
          }
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            console.error('[Analyzer] Read error:', err);
            setErrorMessage('Connection lost. Unplug and replug the USB cable, then reconnect.');
            setSerialStatus('error');
          }
        } finally {
          serialReaderRef.current = null;
          try { await serialPortRef.current?.close(); } catch (_) {}
          serialPortRef.current = null;
          if (serialStatus !== 'error') setSerialStatus('disconnected');
        }
      };
      void readLoop();
    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        // User cancelled the port picker — just go back to disconnected silently
        setSerialStatus('disconnected');
      } else {
        const msg = getErrorMessage(err);
        console.error('[Analyzer] Connection error:', err);
        setErrorMessage(msg);
        setSerialStatus('error');
      }
    }
  }, [baudRate, disconnectMachine]);

  return { serialStatus, errorMessage, connectMachine, disconnectMachine };
}
