import { useState, useRef, useCallback, useEffect } from 'react';

export type SerialStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface AnalyzerData {
  fat: string;
  snf: string;
}

interface Options {
  baudRate?: number;
  /** Called with parsed FAT/SNF only when enabled is true */
  onData: (data: AnalyzerData) => void;
  /** When false, incoming serial data is ignored (e.g. no farmer selected) */
  enabled: boolean;
}

function parseAnalyzerData(raw: string): AnalyzerData | null {
  console.log('[Analyzer] Raw string received:', JSON.stringify(raw));

  // Machine format: (DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD)
  // Digits 0-3 = FAT × 100, digits 4-7 = SNF × 100
  const machineMatch = raw.match(/\((\d{20,})\)/);
  if (machineMatch) {
    const data = machineMatch[1];
    const fatRaw = parseInt(data.substring(0, 4), 10);
    const snfRaw = parseInt(data.substring(4, 8), 10);
    const fat = (fatRaw / 100).toFixed(2);
    const snf = (snfRaw / 100).toFixed(2);
    console.log('[Analyzer] Parsed (machine format):', { fat, snf }, '| raw digits:', data.substring(0, 8));
    return { fat, snf };
  }

  // Fallback — explicit labels: FAT:4.50 SNF:8.90 / F=4.5 S=8.9
  const fatMatch = raw.match(/(?:fat|f)[=:\s]+(\d+\.?\d*)/i);
  const snfMatch = raw.match(/(?:snf|s)[=:\s]+(\d+\.?\d*)/i);
  if (fatMatch && snfMatch) {
    console.log('[Analyzer] Parsed (label pattern):', { fat: fatMatch[1], snf: snfMatch[1] });
    return { fat: fatMatch[1], snf: snfMatch[1] };
  }

  console.log('[Analyzer] Could not parse FAT/SNF — check raw output above');
  return null;
}

export function useSerialAnalyzer({ baudRate = 2400, onData, enabled }: Options) {
  const [serialStatus, setSerialStatus] = useState<SerialStatus>('disconnected');
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Use refs so the running read loop always sees the latest values without restart
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
    } catch (_) { /* ignore cleanup errors */ }
    setSerialStatus('disconnected');
    console.log('[Analyzer] Disconnected');
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { void disconnectMachine(); }, [disconnectMachine]);

  const connectMachine = useCallback(async () => {
    if (!('serial' in navigator)) return;
    if (serialPortRef.current) await disconnectMachine();

    setSerialStatus('connecting');
    try {
      const port = await (navigator as any).serial.requestPort();

      // If the port is already open (stale from a previous session), skip open()
      // Trying to call open() on an already-open port throws "Failed to open serial port"
      if (!port.readable) {
        await port.open({ baudRate });
      }

      serialPortRef.current = port;
      setSerialStatus('connected');
      console.log('[Analyzer] ✅ Device connected:', port);

      const reader = port.readable.getReader();
      serialReaderRef.current = reader;
      let buffer = '';

      const readLoop = async () => {
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            console.log('[Analyzer] 📡 Data chunk:', JSON.stringify(chunk));
            buffer += chunk;

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (!enabledRef.current) continue;
              const parsed = parseAnalyzerData(trimmed);
              if (parsed) onDataRef.current(parsed);
            }

            // Also check buffer directly for machines without trailing newline
            const trimmedBuffer = buffer.trim();
            if (trimmedBuffer && enabledRef.current) {
              const parsed = parseAnalyzerData(trimmedBuffer);
              if (parsed) {
                onDataRef.current(parsed);
                buffer = '';
              }
            }
          }
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            console.error('[Analyzer] ❌ Read error:', err);
          }
        } finally {
          // Always clean up refs when the read loop exits so reconnect works cleanly
          serialReaderRef.current = null;
          try { await serialPortRef.current?.close(); } catch (_) {}
          serialPortRef.current = null;
          setSerialStatus('disconnected');
        }
      };
      void readLoop();
    } catch (err: any) {
      if (err?.name !== 'NotFoundError') {
        console.error('[Analyzer] ❌ Connection error:', err);
      }
      setSerialStatus('disconnected');
    }
  }, [baudRate, disconnectMachine]);

  return { serialStatus, connectMachine, disconnectMachine };
}
