// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import { Buffer } from "../buffer.ts";
import { assert } from "../../testing/asserts.ts";
import {
  ERR_INVALID_ARG_TYPE,
  ERR_INVALID_ARG_VALUE,
} from "../internal/errors.ts";

type readOptions = {
  buffer: Buffer | Uint8Array;
  offset: number;
  length: number;
  position: number | null;
};

type readSyncOptions = {
  offset: number;
  length: number;
  position: number | null;
};

type BinaryCallback = (
  err: Error | null,
  bytesRead: number | null,
  data?: Buffer,
) => void;
type Callback = BinaryCallback;

export function read(fd: number, callback: Callback): void;
export function read(
  fd: number,
  options: readOptions,
  callback: Callback,
): void;
export function read(
  fd: number,
  buffer: Buffer | Uint8Array,
  offset: number,
  length: number,
  position: number | null,
  callback: Callback,
): void;
export function read(
  fd: number,
  optOrBufferOrCb?: Buffer | Uint8Array | readOptions | Callback,
  offsetOrCallback?: number | Callback,
  length?: number,
  position?: number | null,
  callback?: Callback,
) {
  let cb: Callback | undefined;
  let offset = 0,
    buffer: Buffer | Uint8Array;

  if (typeof fd !== "number") {
    throw new ERR_INVALID_ARG_TYPE("fd", "number", fd);
  }

  if (length == null) {
    length = 0;
  }

  if (typeof offsetOrCallback === "function") {
    cb = offsetOrCallback;
  } else if (typeof optOrBufferOrCb === "function") {
    cb = optOrBufferOrCb;
  } else {
    offset = offsetOrCallback as number;
    cb = callback;
  }

  if (!cb) throw new ERR_INVALID_ARG_TYPE("cb", "Callback", cb);

  if (
    optOrBufferOrCb instanceof Buffer || optOrBufferOrCb instanceof Uint8Array
  ) {
    buffer = optOrBufferOrCb;
  } else if (typeof optOrBufferOrCb === "function") {
    offset = 0;
    buffer = Buffer.alloc(16384);
    length = buffer.byteLength;
    position = null;
  } else {
    const opt = optOrBufferOrCb as readOptions;
    offset = opt.offset ?? 0;
    buffer = opt.buffer ?? Buffer.alloc(16384);
    length = opt.length ?? buffer.byteLength;
    position = opt.position ?? null;
  }

  assert(offset >= 0, "offset should be greater or equal to 0");
  assert(
    offset + length <= buffer.byteLength,
    `buffer doesn't have enough data: byteLength = ${buffer.byteLength}, offset + length = ${
      offset + length
    }`,
  );

  if (buffer.byteLength == 0) {
    throw new ERR_INVALID_ARG_VALUE(
      "buffer",
      buffer,
      "is empty and cannot be written",
    );
  }

  let err: Error | null = null,
    numberOfBytesRead: number | null = null;

  try {
    let currentPosition = 0;
    if (typeof position === "number" && position >= 0) {
      currentPosition = Deno.seekSync(fd, 0, Deno.SeekMode.Current);
      Deno.seekSync(fd, position, Deno.SeekMode.Start);
    }

    numberOfBytesRead = Deno.readSync(fd, buffer);

    if (typeof position === "number" && position >= 0) {
      Deno.seekSync(fd, currentPosition, Deno.SeekMode.Start);
    }
  } catch (error) {
    err = error instanceof Error ? error : new Error("[non-error thrown]");
  }

  if (err) {
    (callback as (err: Error) => void)(err);
  } else {
    const data = Buffer.from(buffer.buffer, offset, length);
    cb(null, numberOfBytesRead ?? 0, data);
  }

  return;
}

export function readSync(
  fd: number,
  buffer: Buffer | Uint8Array,
  offset: number,
  length: number,
  position: number | null,
): number;
export function readSync(
  fd: number,
  buffer: Buffer | Uint8Array,
  opt: readSyncOptions,
): number;
export function readSync(
  fd: number,
  buffer: Buffer | Uint8Array,
  offsetOrOpt?: number | readSyncOptions,
  length?: number,
  position?: number | null,
): number {
  let offset = 0;

  if (length == null) {
    length = 0;
  }

  if (buffer.byteLength == 0) {
    throw new ERR_INVALID_ARG_VALUE(
      "buffer",
      buffer,
      "is empty and cannot be written",
    );
  }

  if (typeof offsetOrOpt === "number") {
    offset = offsetOrOpt;
  } else {
    const opt = offsetOrOpt as readSyncOptions;
    offset = opt.offset ?? 0;
    length = opt.length ?? buffer.byteLength;
    position = opt.position ?? null;
  }

  assert(offset >= 0, "offset should be greater or equal to 0");
  assert(
    offset + length <= buffer.byteLength,
    `buffer doesn't have enough data: byteLength = ${buffer.byteLength}, offset + length = ${
      offset + length
    }`,
  );

  let currentPosition = 0;
  if (typeof position === "number" && position >= 0) {
    currentPosition = Deno.seekSync(fd, 0, Deno.SeekMode.Current);
    Deno.seekSync(fd, position, Deno.SeekMode.Start);
  }

  const numberOfBytesRead = Deno.readSync(fd, buffer);

  if (typeof position === "number" && position >= 0) {
    Deno.seekSync(fd, currentPosition, Deno.SeekMode.Start);
  }

  return numberOfBytesRead ?? 0;
}
