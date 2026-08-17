import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Web Serial bridge for a 5-button Arduino controller.
 *
 * Expected serial output (one line per frame), e.g.:
 *   "1,0,0,1,0"        -> pins 8,9,10,11,12
 *   "8:1 9:0 10:0"     -> key:value pairs
 *   "A" / "F" ...      -> ignored
 */
export type ArduinoInput = {
  throttle: boolean; // pin 8
  reverse: boolean; // pin 9
  left: boolean; // pin 10
  right: boolean; // pin 11
  brake: boolean; // pin 12
};

export const emptyArduinoInput: ArduinoInput = {
  throttle: false,
  reverse: false,
  left: false,
  right: false,
  brake: false,
};

export type ArduinoStatus = "unsupported" | "disconnected" | "connecting" | "connected" | "error";

function parseLine(line: string, target: ArduinoInput) {
  const trimmed = line.trim();
  if (!trimmed) return;

  if (trimmed.includes(":")) {
    // "8:1 9:0 10:1 11:0 12:0"
    for (const token of trimmed.split(/[\s,;]+/)) {
      const [pin, value] = token.split(":");
      const on = value === "1" || value?.toLowerCase() === "true";
      switch (pin) {
        case "8":
          target.throttle = on;
          break;
        case "9":
          target.reverse = on;
          break;
        case "10":
          target.left = on;
          break;
        case "11":
          target.right = on;
          break;
        case "12":
          target.brake = on;
          break;
      }
    }
    return;
  }

  // "1,0,0,1,0" or "10010"
  const values = trimmed.includes(",")
    ? trimmed.split(",").map((v) => v.trim())
    : /^[01]{5}$/.test(trimmed)
      ? trimmed.split("")
      : null;

  if (!values || values.length < 5) return;
  target.throttle = values[0] === "1";
  target.reverse = values[1] === "1";
  target.left = values[2] === "1";
  target.right = values[3] === "1";
  target.brake = values[4] === "1";
}

export function useArduino() {
  const [status, setStatus] = useState<ArduinoStatus>("disconnected");
  const [message, setMessage] = useState<string>("Nenhum dispositivo");
  const inputRef = useRef<ArduinoInput>({ ...emptyArduinoInput });
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepReadingRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serial" in navigator)) {
      setStatus("unsupported");
      setMessage("Web Serial indisponível neste navegador");
    }
  }, []);

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    try {
      await readerRef.current?.cancel();
    } catch {
      /* ignore */
    }
    try {
      await portRef.current?.close();
    } catch {
      /* ignore */
    }
    readerRef.current = null;
    portRef.current = null;
    inputRef.current = { ...emptyArduinoInput };
    setStatus("disconnected");
    setMessage("Desconectado");
  }, []);

  const connect = useCallback(async () => {
    const nav = navigator as any;
    if (!nav.serial) {
      setStatus("unsupported");
      setMessage("Web Serial indisponível neste navegador");
      return;
    }
    try {
      setStatus("connecting");
      setMessage("Selecionando porta…");
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setStatus("connected");
      setMessage("Arduino conectado (9600 baud)");

      keepReadingRef.current = true;
      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable).catch(() => undefined);
      const reader = decoder.readable.getReader();
      readerRef.current = reader;

      let buffer = "";
      (async () => {
        while (keepReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value ?? "";
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) parseLine(line, inputRef.current);
        }
      })().catch(() => {
        setStatus("error");
        setMessage("Leitura interrompida");
      });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Falha ao conectar");
    }
  }, []);

  useEffect(() => () => void disconnect(), [disconnect]);

  return { status, message, connect, disconnect, inputRef };
}
