export interface OnnxDimension {
  readonly value: number | string;
}

export interface OnnxTensorInfo {
  readonly name: string;
  readonly elementType: number;
  readonly shape: readonly OnnxDimension[];
}

export interface OnnxModelContract {
  readonly opset: number;
  readonly inputs: readonly OnnxTensorInfo[];
  readonly outputs: readonly OnnxTensorInfo[];
}

type FieldValue = number | Uint8Array;

interface ProtoField {
  readonly number: number;
  readonly wireType: number;
  readonly value: FieldValue;
}

export function inspectOnnxModel(bytes: Uint8Array): OnnxModelContract {
  let graph: Uint8Array | null = null;
  let opset: number | null = null;
  for (const field of fields(bytes)) {
    if (field.number === 7 && field.wireType === 2) {
      graph = asBytes(field.value);
    }
    if (field.number === 8 && field.wireType === 2) {
      opset = parseOpset(asBytes(field.value));
    }
  }
  if (!graph || opset === null) {
    throw new Error("ONNX protobuf did not contain graph and opset fields");
  }
  return { opset, ...parseGraph(graph) };
}

function parseGraph(bytes: Uint8Array): Omit<OnnxModelContract, "opset"> {
  const inputs: OnnxTensorInfo[] = [];
  const outputs: OnnxTensorInfo[] = [];
  for (const field of fields(bytes)) {
    if (field.number === 11 && field.wireType === 2) {
      inputs.push(parseTensorInfo(asBytes(field.value)));
    }
    if (field.number === 12 && field.wireType === 2) {
      outputs.push(parseTensorInfo(asBytes(field.value)));
    }
  }
  return { inputs, outputs };
}

function parseOpset(bytes: Uint8Array): number {
  for (const field of fields(bytes)) {
    if (field.number === 2 && field.wireType === 0) {
      return asNumber(field.value);
    }
  }
  throw new Error("ONNX opset import did not contain a version");
}

function parseTensorInfo(bytes: Uint8Array): OnnxTensorInfo {
  let name = "";
  let elementType: number | null = null;
  let shape: OnnxDimension[] = [];
  for (const field of fields(bytes)) {
    if (field.number === 1 && field.wireType === 2) {
      name = decodeText(field.value);
    }
    if (field.number === 2 && field.wireType === 2) {
      const tensorType = parseTypeProto(asBytes(field.value));
      elementType = tensorType.elementType;
      shape = tensorType.shape;
    }
  }
  if (!name || elementType === null) {
    throw new Error("ONNX value info did not contain a named tensor type");
  }
  return { name, elementType, shape };
}

function parseTypeProto(bytes: Uint8Array): {
  elementType: number;
  shape: OnnxDimension[];
} {
  for (const field of fields(bytes)) {
    if (field.number === 1 && field.wireType === 2) {
      return parseTensorType(asBytes(field.value));
    }
  }
  throw new Error("ONNX value info did not contain a tensor type");
}

function parseTensorType(bytes: Uint8Array): {
  elementType: number;
  shape: OnnxDimension[];
} {
  let elementType: number | null = null;
  let shape: OnnxDimension[] = [];
  for (const field of fields(bytes)) {
    if (field.number === 1 && field.wireType === 0) {
      elementType = asNumber(field.value);
    }
    if (field.number === 2 && field.wireType === 2) {
      shape = parseShape(asBytes(field.value));
    }
  }
  if (elementType === null) {
    throw new Error("ONNX tensor type has no element type");
  }
  return { elementType, shape };
}

function parseShape(bytes: Uint8Array): OnnxDimension[] {
  const dimensions: OnnxDimension[] = [];
  for (const field of fields(bytes)) {
    if (field.number === 1 && field.wireType === 2) {
      dimensions.push(parseDimension(asBytes(field.value)));
    }
  }
  return dimensions;
}

function parseDimension(bytes: Uint8Array): OnnxDimension {
  for (const field of fields(bytes)) {
    if (field.number === 1 && field.wireType === 0) {
      return { value: asNumber(field.value) };
    }
    if (field.number === 2 && field.wireType === 2) {
      return { value: decodeText(field.value) };
    }
  }
  return { value: "unknown" };
}

function fields(bytes: Uint8Array): ProtoField[] {
  const reader = new ProtoReader(bytes);
  const result: ProtoField[] = [];
  while (!reader.done()) result.push(reader.readField());
  return result;
}

class ProtoReader {
  private offset = 0;

  public constructor(private readonly bytes: Uint8Array) {}

  public done(): boolean {
    return this.offset >= this.bytes.length;
  }

  public readField(): ProtoField {
    const tag = this.readVarint();
    const number = Math.floor(tag / 8);
    const wireType = tag & 7;
    if (number < 1) throw new Error(`Invalid protobuf field number ${number}`);
    return { number, wireType, value: this.readValue(wireType) };
  }

  private readValue(wireType: number): FieldValue {
    if (wireType === 0) return this.readVarint();
    if (wireType === 1) return this.readBytes(8);
    if (wireType === 2) return this.readBytes(this.readVarint());
    if (wireType === 5) return this.readBytes(4);
    throw new Error(`Unsupported protobuf wire type ${wireType}`);
  }

  private readVarint(): number {
    let value = 0;
    let multiplier = 1;
    while (true) {
      if (this.done()) throw new Error("Truncated protobuf varint");
      const byte = this.bytes[this.offset++];
      value += (byte & 0x7f) * multiplier;
      if ((byte & 0x80) === 0) return value;
      multiplier *= 128;
      if (multiplier > Number.MAX_SAFE_INTEGER) {
        throw new Error("Protobuf varint exceeds safe integer range");
      }
    }
  }

  private readBytes(length: number): Uint8Array {
    const end = this.offset + length;
    if (!Number.isSafeInteger(length) || end > this.bytes.length) {
      throw new Error(`Truncated protobuf bytes field of length ${length}`);
    }
    const value = this.bytes.slice(this.offset, end);
    this.offset = end;
    return value;
  }
}

function asBytes(value: FieldValue): Uint8Array {
  if (value instanceof Uint8Array) return value;
  throw new Error("Expected a length-delimited protobuf field");
}

function asNumber(value: FieldValue): number {
  if (typeof value === "number") return value;
  throw new Error("Expected a protobuf varint field");
}

function decodeText(value: FieldValue): string {
  return new TextDecoder().decode(asBytes(value));
}
